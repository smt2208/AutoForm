/**
 * FormFiller Background Service Worker
 * Handles communication between popup and content scripts
 */

// Import configuration
try {
  importScripts('config.js');
} catch (e) {
  console.error('Failed to import config.js:', e);
}

// Global State
let processingState = {
    isProcessing: false,
    step: 'IDLE', // IDLE, ANALYZING, CRAWLING, BRAIN, FILLING, SUCCESS, ERROR
    message: ''
};

function updateState(step, message) {
    processingState = {
        isProcessing: step !== 'IDLE' && step !== 'SUCCESS' && step !== 'ERROR',
        step,
        message
    };
    // Broadcast to popup if open
    chrome.runtime.sendMessage({
        action: 'STATUS_UPDATE',
        state: processingState
    }).catch(() => {
        // Popup closed, ignore
    });
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // console.log('Background received message:', request.action);
    
    if (request.action === 'GET_STATUS') {
        sendResponse(processingState);
    }
    
    if (request.action === 'startRecording') {
        console.log('Starting recording command received');
        updateState('IDLE', ''); // Reset previous state
        sendResponse({ status: 'ack' });
    }
    
    if (request.action === 'stopRecording') {
        console.log('Stopping recording command received');
        sendResponse({ status: 'ack' });
    }
    
    if (request.action === 'PROCESS_AUDIO') {
        handleAudioProcessing(request.audioBlobData, request.tabId)
            .then(result => sendResponse({ success: true, result }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true; // Keep channel open for async response
    }
});

/**
 * Handle the full processing flow in the background
 * This survives popup closure.
 */
async function handleAudioProcessing(audioBlobData, tabId) {
    console.log('Starting background processing for tab:', tabId);
    
    try {
        updateState('ANALYZING', '🔍 Analyzing your voice...');
        await new Promise(resolve => setTimeout(resolve, 1500)); // Show for 1.5s
        
        // 1. Convert base64/dataURL to blob
        const audioBlob = await (await fetch(audioBlobData)).blob();
        
        // 2. Extract form fields from the page
        console.log('Extracting form fields...');
        updateState('CRAWLING', '🐛 Crawling through the form...');
        await new Promise(resolve => setTimeout(resolve, 2000)); // Show for 2s
        
        const response = await chrome.tabs.sendMessage(tabId, { action: 'extractFields' });
        const formFields = response.fields;
        
        if (!formFields || formFields.length === 0) {
            throw new Error('No form fields found on this page');
        }
        
        console.log(`Found ${formFields.length} fields.`);
        
        // 3. Prepare FormData
        const formData = new FormData();
        formData.append('audio_file', audioBlob, 'recording.webm');
        formData.append('form_data_json', JSON.stringify({ fields: formFields }));
        
        // 4. Send to backend
        console.log('Sending to AI backend...');
        updateState('BRAIN', '🧠 Activating AI brain & Supercharging intelligence...');
        await new Promise(resolve => setTimeout(resolve, 2500)); // Show for 2.5s
        
        const backendUrl = CONFIG.BACKEND_URL + CONFIG.API_ENDPOINTS.process;
        
        const apiResponse = await fetch(backendUrl, {
            method: 'POST',
            body: formData
        });
        
        if (!apiResponse.ok) {
            throw new Error(`Backend returned ${apiResponse.status}: ${apiResponse.statusText}`);
        }
        
        const result = await apiResponse.json();
        
        if (!result.success) {
            throw new Error(result.message || 'Backend processing failed');
        }
        
        // 5. Fill form fields
        console.log('Filling form with data:', result.form_data);
        updateState('FILLING', '✏️ Precision filling in progress...');
        await new Promise(resolve => setTimeout(resolve, 2000)); // Show for 2s
        
        try {
            await chrome.tabs.sendMessage(tabId, {
                action: 'fillFields',
                data: result.form_data
            });
        } catch (fillError) {
            console.error('Standard fill failed, trying scripting injection:', fillError);
            // Fallback: inject script directly
            await chrome.scripting.executeScript({
                target: { tabId: tabId },
                func: (data) => {
                    console.log('Direct fill with data:', data);
                    Object.entries(data).forEach(([fieldId, value]) => {
                        if (!value) return;
                        const element = document.getElementById(fieldId) || document.querySelector(`[name="${fieldId}"]`);
                        if (element) {
                             // React hack for valued inputs
                            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
                            const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
                            
                            if (element.tagName.toLowerCase() === 'textarea' && nativeTextAreaValueSetter) {
                                nativeTextAreaValueSetter.call(element, value);
                            } else if (nativeInputValueSetter && element.tagName.toLowerCase() !== 'select') {
                                nativeInputValueSetter.call(element, value);
                            } else {
                                element.value = value;
                            }

                            element.dispatchEvent(new Event('input', { bubbles: true }));
                            element.dispatchEvent(new Event('change', { bubbles: true }));
                        }
                    });
                },
                args: [result.form_data]
            });
        }
        
        console.log('Processing completed successfully.');
        updateState('SUCCESS', '🎉 All fields filled perfectly!');
        
        return result;

    } catch (error) {
        console.error('Background processing failed:', error);
        updateState('ERROR', `Error: ${error.message}`);
        throw error;
    }
}

// Log when service worker activates
chrome.runtime.onInstalled.addListener(() => {
    console.log('FormFiller extension installed');
});

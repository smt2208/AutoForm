// Get DOM elements
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const statusIndicator = document.getElementById('statusIndicator');
const statusText = document.getElementById('statusText');
const transcriptDiv = document.getElementById('transcript');
const errorDiv = document.getElementById('error');

// State
let mediaRecorder = null;
let audioChunks = [];
let audioStream = null;

/**
 * Show error message
 */
function showError(message) {
    errorDiv.textContent = `Error: ${message}`;
    console.error(message);
}

/**
 * Clear error message
 */
function clearError() {
    errorDiv.textContent = '';
}

/**
 * Update status display
 */
function updateStatus(text, isActive = false) {
    statusText.textContent = text;
    if (isActive) {
        statusIndicator.classList.remove('inactive');
        statusIndicator.classList.add('active');
    } else {
        statusIndicator.classList.remove('active');
        statusIndicator.classList.add('inactive');
    }
}

/**
 * Handle Start Recording button click
 */
startBtn.addEventListener('click', async () => {
    clearError();
    
    try {
        // Get active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        // Send message to content script to start recording
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'startRecording' });
        
        if (response.error) {
            throw new Error(response.error);
        }
        
        // Update UI
        startBtn.disabled = true;
        stopBtn.disabled = false;
        updateStatus('Recording...', true);
        transcriptDiv.textContent = 'Listening to your voice...';
        
    } catch (error) {
        showError(`Failed to start recording: ${error.message}`);
        updateStatus('Ready to record', false);
    }
});

/**
 * Handle Stop Recording button click
 */
stopBtn.addEventListener('click', async () => {
    try {
        // Get active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        // Update UI
        startBtn.disabled = false;
        stopBtn.disabled = true;
        updateStatus('Processing...', false);
        transcriptDiv.textContent = 'Processing your recording...';
        
        // Send message to content script to stop recording and get audio
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'stopRecording' });
        
        if (response.error) {
            throw new Error(response.error);
        }
        
        // Process the recording
        await processRecordingWithBlob(response.audioBlob, tab.id);
        
    } catch (error) {
        showError(`Failed to stop recording: ${error.message}`);
        updateStatus('Ready to record', false);
        transcriptDiv.textContent = '';
    }
});

/**
 * Process the recorded audio and send to backend
 */
async function processRecordingWithBlob(audioBlobData, tabId) {
    const coolMessages = [
        { text: '🔍 Analyzing your voice...', duration: 2000 },
        { text: '🧠 Activating AI brain...', duration: 2000 },
        { text: '🐛 Crawling through the form...', duration: 3000 },
        { text: '⚡ Supercharging intelligence...', duration: 2000 },
        { text: '🎯 Pinpointing form fields...', duration: 2000 },
        { text: '✏️ Precision filling in progress...', duration: 2000 }
    ];

    let messageIndex = 0;
    const messageInterval = setInterval(() => {
        if (messageIndex < coolMessages.length) {
            const msg = coolMessages[messageIndex];
            transcriptDiv.textContent = msg.text;
            messageIndex++;
        }
    }, 2500);

    try {
        // Convert base64 to blob
        const audioBlob = await (await fetch(audioBlobData)).blob();
        
        // Extract form fields from the page
        updateStatus('Extracting form fields...', false);
        const response = await chrome.tabs.sendMessage(tabId, { action: 'extractFields' });
        const formFields = response.fields;
        
        if (formFields.length === 0) {
            clearInterval(messageInterval);
            showError('No form fields found on this page');
            updateStatus('Ready to record', false);
            transcriptDiv.textContent = '';
            return;
        }
        
        // Prepare FormData
        const formData = new FormData();
        formData.append('audio_file', audioBlob, 'recording.webm');
        formData.append('form_data_json', JSON.stringify({ fields: formFields }));
        
        // Send to backend
        updateStatus('Processing with AI...', false);
        const backendUrl = CONFIG.BACKEND_URL + CONFIG.API_ENDPOINTS.process;
        
        const apiResponse = await fetch(backendUrl, {
            method: 'POST',
            body: formData
        });
        
        clearInterval(messageInterval);
        
        if (!apiResponse.ok) {
            throw new Error(`Backend returned ${apiResponse.status}: ${apiResponse.statusText}`);
        }
        
        const result = await apiResponse.json();
        
        if (!result.success) {
            throw new Error(result.message || 'Backend processing failed');
        }
        
        // Fill form fields with mapped data
        updateStatus('Filling form...', false);
        console.log('Sending to fill:', result.form_data);
        
        try {
            const fillResponse = await chrome.tabs.sendMessage(tabId, {
                action: 'fillFields',
                data: result.form_data
            });
            console.log('Fill response:', fillResponse);
        } catch (fillError) {
            console.error('Fill error, retrying via scripting:', fillError);
            // Fallback: inject script directly
            await chrome.scripting.executeScript({
                target: { tabId: tabId },
                func: (data) => {
                    console.log('Direct fill with data:', data);
                    Object.entries(data).forEach(([fieldId, value]) => {
                        if (!value) return;
                        const element = document.getElementById(fieldId) || document.querySelector(`[name="${fieldId}"]`);
                        if (element) {
                            // React hack
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
                            console.log(`Filled ${fieldId} with: ${value}`);
                        }
                    });
                },
                args: [result.form_data]
            });
        }
        
        // Success!
        updateStatus('Form filled successfully! ✓', false);
        transcriptDiv.textContent = '🎉 All fields filled perfectly!';
        
    } catch (error) {
        showError(error.message);
        updateStatus('Ready to record', false);
        transcriptDiv.textContent = '';
    }
}

// Log when popup loads
console.log('FormFiller popup loaded');
console.log('Backend URL:', CONFIG.BACKEND_URL);

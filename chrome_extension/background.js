/**
 * FormFiller Background Service Worker
 * Handles communication between popup and content scripts
 */

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Background received message:', request);
    
    if (request.action === 'startRecording') {
        console.log('Starting recording from background');
        sendResponse({ status: 'recording_started' });
    }
    
    if (request.action === 'stopRecording') {
        console.log('Stopping recording from background');
        sendResponse({ status: 'recording_stopped' });
    }
    
    if (request.action === 'sendToBackend') {
        console.log('Sending audio to backend:', request.data);
        // This will be implemented to send to FastAPI backend
        sendResponse({ status: 'sent_to_backend' });
    }
});

// Log when service worker activates
chrome.runtime.onInstalled.addListener(() => {
    console.log('FormFiller extension installed');
});

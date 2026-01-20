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
        updateStatus('Background Processing...', false);
        transcriptDiv.textContent = 'Processing continues in background. You can close this popup.';
        
        // Send message to content script to stop recording and get audio
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'stopRecording' });
        
        if (response.error) {
            throw new Error(response.error);
        }
        
        // Hand off to Background Service Worker
        chrome.runtime.sendMessage({
            action: 'PROCESS_AUDIO',
            audioBlobData: response.audioBlob,
            tabId: tab.id
        });
        
    } catch (error) {
        showError(`Failed to stop recording: ${error.message}`);
        updateStatus('Ready to record', false);
        transcriptDiv.textContent = '';
    }
});

/**
 * Check if recording is already in progress
 */
async function checkRecordingStatus() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) return;
        
        // 1. Check recording status from Content Script
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'getRecordingStatus' });
        if (response && response.isRecording) {
            startBtn.disabled = true;
            stopBtn.disabled = false;
            updateStatus('Recording...', true);
            transcriptDiv.textContent = 'Recording in progress... (recovered)';
            return;
        }

        // 2. Check processing status from Background Script
        const bgState = await chrome.runtime.sendMessage({ action: 'GET_STATUS' });
        if (bgState) {
            handleStatusUpdate(bgState);
        }

    } catch (e) {
        // Content script might not be loaded yet or other error
        console.log('Could not check recording status:', e);
    }
}

// Listen for status updates from background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'STATUS_UPDATE') {
        handleStatusUpdate(request.state);
    }
});

function handleStatusUpdate(state) {
    if (!state) return;
    
    // If IDLE, do nothing (unless we want to clear?)
    if (state.step === 'IDLE') return;

    // Determine UI state
    if (state.step === 'SUCCESS') {
        startBtn.disabled = false;
        stopBtn.disabled = true;
        updateStatus('Completed', false);
        transcriptDiv.textContent = state.message;
    } else if (state.step === 'ERROR') {
        showError(state.message);
        startBtn.disabled = false;
        stopBtn.disabled = true;
        updateStatus('Error', false);
    } else {
        // Active processing
        startBtn.disabled = true;
        stopBtn.disabled = true;
        updateStatus('Processing...', true);
        transcriptDiv.textContent = state.message;
    }
}

// Initial check
checkRecordingStatus();

/* 
 * Replaced by Background Processing
 */
// async function processRecordingWithBlob(audioBlobData, tabId) { ... }


// processRecordingWithBlob has been moved to background.js

// Log when popup loads
console.log('FormFiller popup loaded');
console.log('Backend URL:', CONFIG.BACKEND_URL);

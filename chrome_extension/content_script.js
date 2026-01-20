/**
 * FormFiller Content Script
 * Main orchestrator for form extraction, filling, and audio recording
 */

import { extractFormFields } from './formExtractor.js';
import { fillFormFields } from './formFiller.js';
import { startRecording, stopRecording, isRecording } from './audioRecorder.js';

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if (!request || typeof request.action !== 'string') {
        sendResponse({ error: 'Invalid request' });
        return true;
    }

    try {
        if (request.action === 'getRecordingStatus') {
            sendResponse({ isRecording: isRecording() });
            return true;
        }

        if (request.action === 'extractFields') {
            const fields = extractFormFields();
            sendResponse({ fields: fields });
        }
        
        if (request.action === 'fillFields') {
            if (!request.data || typeof request.data !== 'object') {
                throw new Error('Invalid data for fillFields');
            }
            fillFormFields(request.data);
            sendResponse({ status: 'fields_filled' });
        }
        
        if (request.action === 'startRecording') {
            startRecording()
                .then(() => sendResponse({ success: true }))
                .catch(error => sendResponse({ error: error.message }));
            return true;
        }
        
        if (request.action === 'stopRecording') {
            stopRecording()
                .then(audioBlob => sendResponse({ audioBlob: audioBlob }))
                .catch(error => sendResponse({ error: error.message }));
            return true;
        }
    } catch (error) {
        console.error('Error in content script:', error);
        sendResponse({ error: error.message });
    }
    
    return true;
});

console.log('FormFiller content script loaded');

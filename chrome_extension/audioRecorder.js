/**
 * Audio Recorder Module
 * Handles microphone recording functionality
 */

let mediaRecorder = null;
let audioChunks = [];
let audioStream = null;

async function startRecording() {
    try {
        audioChunks = [];
        
        // Request microphone access and get audio stream
        audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Initialize MediaRecorder with the audio stream
        mediaRecorder = new MediaRecorder(audioStream);
        
        // Handle data chunks as they become available
        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                audioChunks.push(event.data);
            }
        };
        
        // Start recording
        mediaRecorder.start();
        
    } catch (error) {
        console.error('Failed to start recording:', error);
        throw error;
    }
}

async function stopRecording() {
    return new Promise((resolve, reject) => {
        if (!mediaRecorder || mediaRecorder.state !== 'recording') {
            reject(new Error('No active recording'));
            return;
        }
        
        mediaRecorder.onstop = async () => {
            try {
                // Stop all audio tracks to release microphone
                if (audioStream) {
                    audioStream.getTracks().forEach(track => track.stop());
                }
                
                // Combine audio chunks into a single blob
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                
                // Convert blob to base64 data URL for transmission
                const reader = new FileReader();
                reader.onloadend = () => {
                    resolve(reader.result);
                };
                reader.readAsDataURL(audioBlob);
                
            } catch (error) {
                reject(error);
            }
        };
        
        mediaRecorder.stop();
    });
}

function isRecording() {
    return mediaRecorder && mediaRecorder.state === 'recording';
}

export { startRecording, stopRecording, isRecording };

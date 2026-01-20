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
        
        audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        mediaRecorder = new MediaRecorder(audioStream);
        
        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                audioChunks.push(event.data);
            }
        };
        
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
                if (audioStream) {
                    audioStream.getTracks().forEach(track => track.stop());
                }
                
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                
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

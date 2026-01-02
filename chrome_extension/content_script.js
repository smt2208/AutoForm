/**
 * FormFiller Content Script
 * Extracts form field information from the current webpage
 */

// Recording state
let mediaRecorder = null;
let audioChunks = [];
let audioStream = null;

/**
 * Extract all form fields from the current page
 * @returns {Array} Array of form field objects with id, name, type, and label
 */
function extractFormFields() {
    const formFields = [];
    const seenFields = new Set();
    
    // Find all input, select, and textarea elements
    const elements = document.querySelectorAll('input, select, textarea');
    
    elements.forEach((element, index) => {
        // Filter out hidden and submit/button inputs
        const type = element.type?.toLowerCase() || 'text';
        if (type === 'hidden' || type === 'submit' || type === 'button' || type === 'reset' || type === 'image') {
            return;
        }
        
        // Skip if element is not visible
        const style = window.getComputedStyle(element);
        if (style.display === 'none' || style.visibility === 'hidden' || element.offsetParent === null) {
            return;
        }
        
        // Extract field information
        // Prioritize stable attributes for better cross-site compatibility
        const fieldId = element.id || 
                       element.name || 
                       element.getAttribute('data-testid') || 
                       element.getAttribute('data-field') ||
                       element.getAttribute('data-automation-id') ||
                       element.getAttribute('aria-labelledby') ||
                       `field_${index}`;
        
        // Skip duplicate fields
        if (seenFields.has(fieldId)) {
            return;
        }
        seenFields.add(fieldId);
        
        const fieldName = element.name || element.id || element.getAttribute('data-testid') || fieldId;
        const fieldType = element.tagName.toLowerCase() === 'select' ? 'select' : 
                         element.tagName.toLowerCase() === 'textarea' ? 'textarea' : type;
        
        // Try to find associated label
        let labelText = '';
        
        // Method 1: Label with 'for' attribute
        if (element.id) {
            const label = document.querySelector(`label[for="${element.id}"]`);
            if (label) {
                labelText = label.textContent.trim();
            }
        }
        
        // Method 2: aria-labelledby
        if (!labelText) {
            const ariaLabelledBy = element.getAttribute('aria-labelledby');
            if (ariaLabelledBy) {
                const labelElement = document.getElementById(ariaLabelledBy);
                if (labelElement) {
                    labelText = labelElement.textContent.trim();
                }
            }
        }
        
        // Method 3: Parent label element
        if (!labelText) {
            const parentLabel = element.closest('label');
            if (parentLabel) {
                // Get only the text not from nested inputs
                labelText = Array.from(parentLabel.childNodes)
                    .filter(node => node.nodeType === Node.TEXT_NODE)
                    .map(node => node.textContent.trim())
                    .join(' ');
            }
        }
        
        // Method 4: Placeholder or aria-label
        if (!labelText) {
            labelText = element.getAttribute('aria-label') || 
                       element.placeholder || 
                       element.getAttribute('title') || '';
        }
        
        // Method 5: Previous sibling text
        if (!labelText) {
            const prevSibling = element.previousElementSibling;
            if (prevSibling && (prevSibling.tagName === 'LABEL' || prevSibling.tagName === 'SPAN' || prevSibling.tagName === 'DIV')) {
                labelText = prevSibling.textContent.trim();
            }
        }
        
        // Method 6: Closest div with label-like class
        if (!labelText) {
            const parent = element.closest('div[class*="field"], div[class*="form-group"], div[class*="input"]');
            if (parent) {
                const labelInParent = parent.querySelector('label, span[class*="label"]');
                if (labelInParent) {
                    labelText = labelInParent.textContent.trim();
                }
            }
        }
        
        // Add field to array
        formFields.push({
            id: fieldId,
            name: fieldName,
            type: fieldType,
            label: labelText,
            tagName: element.tagName.toLowerCase()
        });
    });
    
    console.log('Extracted form fields:', formFields);
    return formFields;
}

/**
 * Fill form fields with provided data
 * @param {Object} fieldData - Object mapping field IDs to values
 */
function fillFormFields(fieldData) {
    console.log('Filling form fields with data:', fieldData);
    
    if (!fieldData || typeof fieldData !== 'object') {
        console.error('Invalid field data:', fieldData);
        return;
    }
    
    Object.entries(fieldData).forEach(([fieldId, value]) => {
        // Skip empty values
        if (value === null || value === undefined || value === '' || value === 'None' || value === 'null') {
            console.log(`Skipping empty value for field: ${fieldId}`);
            return;
        }
        
        // Try multiple selectors to find the element for better cross-site compatibility
        let element = document.getElementById(fieldId) || 
                     document.querySelector(`[name="${fieldId}"]`) ||
                     document.querySelector(`[data-testid="${fieldId}"]`) ||
                     document.querySelector(`[data-field="${fieldId}"]`) ||
                     document.querySelector(`[aria-labelledby="${fieldId}"]`);
        
        console.log(`Looking for field: ${fieldId}, found:`, element ? 'yes' : 'no');
        
        if (element) {
            // Set value based on element type
            if (element.tagName.toLowerCase() === 'select') {
                // For select elements, try to match option by value or text
                const options = Array.from(element.options);
                const matchingOption = options.find(opt => 
                    opt.value.toLowerCase() === value.toLowerCase() || 
                    opt.text.toLowerCase() === value.toLowerCase()
                );
                if (matchingOption) {
                    element.value = matchingOption.value;
                    element.dispatchEvent(new Event('change', { bubbles: true }));
                    element.dispatchEvent(new Event('input', { bubbles: true }));
                }
            } else if (element.type === 'checkbox' || element.type === 'radio') {
                const valStr = String(value).toLowerCase();
                const isBooleanTrue = valStr === 'yes' || valStr === 'true' || valStr === '1' || valStr === 'on';
                
                let targetElement = element;
                
                // Handle Radio/Checkbox Groups
                // If we found the element by name, we might have the wrong one from the group.
                // We need to find the one that matches the value.
                if (element.name) {
                    // Try to find the specific input in the group that matches the value
                    // e.g. name="gender" value="male"
                    const group = document.querySelectorAll(`input[name="${element.name}"]`);
                    if (group.length > 1) {
                        let found = false;
                        for (const input of group) {
                            // Check value attribute
                            if (input.value.toLowerCase() === valStr) {
                                targetElement = input;
                                found = true;
                                break;
                            }
                            
                            // Check associated label text
                            let labelText = '';
                            if (input.id) {
                                const label = document.querySelector(`label[for="${input.id}"]`);
                                if (label) labelText = label.textContent.trim().toLowerCase();
                            }
                            if (!labelText && input.parentElement.tagName === 'LABEL') {
                                labelText = input.parentElement.textContent.trim().toLowerCase();
                            }
                            
                            if (labelText === valStr) {
                                targetElement = input;
                                found = true;
                                break;
                            }
                        }
                        
                        // If we didn't find a match in the group, and it's not a boolean true,
                        // we might be trying to set a radio button to a value that doesn't exist.
                        if (!found && !isBooleanTrue) {
                            console.warn(`Could not find radio/checkbox option "${value}" for group "${element.name}"`);
                        }
                    }
                }

                // Apply the check
                if (isBooleanTrue) {
                    targetElement.checked = true;
                } else if (targetElement.value.toLowerCase() === valStr) {
                    targetElement.checked = true;
                } else {
                    // If we found the target element via label match above, check it
                    // If we are here, it means we might have found it in the loop above
                    // or it's a single element that didn't match value/boolean.
                    // But if we switched targetElement in the loop, we should check it.
                    if (targetElement !== element) {
                         targetElement.checked = true;
                    }
                }

                // Trigger events
                if (targetElement.checked) {
                    targetElement.dispatchEvent(new Event('click', { bubbles: true }));
                    targetElement.dispatchEvent(new Event('change', { bubbles: true }));
                    targetElement.dispatchEvent(new Event('input', { bubbles: true }));
                }
            } else {
                // For text inputs and textareas
                // React 15/16+ hack to trigger onChange
                const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                    window.HTMLInputElement.prototype, 
                    "value"
                ).set;
                
                const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(
                    window.HTMLTextAreaElement.prototype, 
                    "value"
                ).set;

                if (element.tagName.toLowerCase() === 'textarea' && nativeTextAreaValueSetter) {
                    nativeTextAreaValueSetter.call(element, value);
                } else if (nativeInputValueSetter) {
                    nativeInputValueSetter.call(element, value);
                } else {
                    element.value = value;
                }
                
                // Trigger input event for reactive frameworks
                element.dispatchEvent(new Event('input', { bubbles: true }));
                element.dispatchEvent(new Event('change', { bubbles: true }));
                element.dispatchEvent(new Event('blur', { bubbles: true })); // Sometimes needed
            }
            
            console.log(`Filled field ${fieldId} with value: ${value}`);
        } else {
            console.warn(`Field not found: ${fieldId}`);
        }
    });
}

// Listen for messages from popup or background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Content script received message:', request);
    
    if (request.action === 'extractFields') {
        const fields = extractFormFields();
        sendResponse({ fields: fields });
    }
    
    if (request.action === 'fillFields') {
        fillFormFields(request.data);
        sendResponse({ status: 'fields_filled' });
    }
    
    if (request.action === 'startRecording') {
        startRecording()
            .then(() => sendResponse({ success: true }))
            .catch(error => sendResponse({ error: error.message }));
        return true; // Keep channel open for async
    }
    
    if (request.action === 'stopRecording') {
        stopRecording()
            .then(audioBlob => sendResponse({ audioBlob: audioBlob }))
            .catch(error => sendResponse({ error: error.message }));
        return true; // Keep channel open for async
    }
    
    return true; // Keep message channel open for async response
});

/**
 * Start recording audio from microphone
 */
async function startRecording() {
    try {
        audioChunks = [];
        
        // Request microphone access
        audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Create MediaRecorder
        mediaRecorder = new MediaRecorder(audioStream);
        
        // Collect audio data
        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                audioChunks.push(event.data);
            }
        };
        
        // Start recording
        mediaRecorder.start();
        console.log('Recording started in content script');
        
    } catch (error) {
        console.error('Failed to start recording:', error);
        throw error;
    }
}

/**
 * Stop recording and return audio blob
 */
async function stopRecording() {
    return new Promise((resolve, reject) => {
        if (!mediaRecorder || mediaRecorder.state !== 'recording') {
            reject(new Error('No active recording'));
            return;
        }
        
        mediaRecorder.onstop = async () => {
            try {
                // Stop all audio tracks
                if (audioStream) {
                    audioStream.getTracks().forEach(track => track.stop());
                }
                
                // Create blob from chunks
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                console.log('Recording stopped, blob size:', audioBlob.size);
                
                // Convert blob to data URL for transfer
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

// Log when content script loads
console.log('FormFiller content script loaded');

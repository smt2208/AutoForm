/**
 * Form Field Filler Module
 * Handles filling form fields with provided data
 */

function fillFormFields(fieldData) {
    if (!fieldData || typeof fieldData !== 'object') {
        console.error('Invalid field data:', fieldData);
        return;
    }
    
    // Track if we have scrolled to the first element yet
    let hasScrolled = false;
    
    Object.entries(fieldData).forEach(([fieldId, value]) => {
        // Skip null/undefined/empty values
        if (value === null || value === undefined || value === '' || value === 'null') {
            return;
        }
        
        // Find the element by various strategies
        let element = document.getElementById(fieldId) || 
                     document.querySelector(`[name="${fieldId}"]`) ||
                     document.querySelector(`[data-testid="${fieldId}"]`) ||
                     document.querySelector(`[data-field="${fieldId}"]`) ||
                     document.querySelector(`[aria-labelledby="${fieldId}"]`);
        
        if (element) {
            // UX IMPROVEMENT: Only scroll to the FIRST field found.
            // This prevents the screen from jumping wildly if 10 fields are filled at once.
            if (!hasScrolled) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                hasScrolled = true;
            }

            // --- Strategy 1: SELECT (Dropdowns) ---
            if (element.tagName.toLowerCase() === 'select') {
                const options = Array.from(element.options);
                const valLower = String(value).toLowerCase();
                
                // Try exact value match, then text match, then partial text match
                let matchingOption = options.find(opt => opt.value.toLowerCase() === valLower);
                
                if (!matchingOption) {
                    matchingOption = options.find(opt => opt.text.toLowerCase() === valLower);
                }
                
                if (!matchingOption) {
                    matchingOption = options.find(opt => opt.text.toLowerCase().includes(valLower));
                }

                if (matchingOption) {
                    element.value = matchingOption.value;
                    element.dispatchEvent(new Event('change', { bubbles: true }));
                    element.dispatchEvent(new Event('input', { bubbles: true }));
                }
            
            // --- Strategy 2: CHECKBOX & RADIO ---
            } else if (element.type === 'checkbox' || element.type === 'radio') {
                const valStr = String(value).toLowerCase();
                const isBooleanTrue = valStr === 'yes' || valStr === 'true' || valStr === '1' || valStr === 'on';
                const isBooleanFalse = valStr === 'no' || valStr === 'false' || valStr === '0' || valStr === 'off';
                
                let targetElement = element;
                
                // Handle groups (radio buttons or checkboxes with same name)
                if (element.name) {
                    const group = document.querySelectorAll(`input[name="${element.name}"]`);
                    if (group.length > 1) {
                        let found = false;
                        
                        // Sub-Strategy A: Check value attribute
                        for (const input of group) {
                            if (input.value.toLowerCase() === valStr) {
                                targetElement = input;
                                found = true;
                                break;
                            }
                        }
                        
                        // Sub-Strategy B: Check associated labels
                        if (!found) {
                            for (const input of group) {
                                let labelText = '';
                                // Check for label with 'for' attribute
                                if (input.id) {
                                    const label = document.querySelector(`label[for="${input.id}"]`);
                                    if (label) labelText = label.textContent.trim().toLowerCase();
                                }
                                // Check for parent label
                                if (!labelText && input.parentElement.tagName === 'LABEL') {
                                    labelText = input.parentElement.textContent.trim().toLowerCase();
                                }
                                
                                if (labelText && (labelText === valStr || labelText.includes(valStr))) {
                                    targetElement = input;
                                    found = true;
                                    break;
                                }
                            }
                        }
                    }
                }

                // Apply the change
                if (isBooleanTrue) {
                    // Check/enable the box
                    if (!targetElement.checked) {
                        targetElement.checked = true;
                        targetElement.dispatchEvent(new Event('click', { bubbles: true }));
                        targetElement.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                } else if (isBooleanFalse) {
                    // Uncheck/disable the box
                    if (targetElement.checked) {
                        targetElement.checked = false;
                        targetElement.dispatchEvent(new Event('click', { bubbles: true }));
                        targetElement.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                }
            
            // --- Strategy 3: TEXT INPUTS & TEXTAREA ---
            } else {
                // Try standard assignment first
                element.value = value;
                
                // React/Angular Hack: Try React-compatible setter if available
                // Many modern frameworks override the native value setter
                const proto = window[element.constructor.name].prototype;
                const nativeSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
                
                if (nativeSetter) {
                    nativeSetter.call(element, value);
                }
                
                element.dispatchEvent(new Event('input', { bubbles: true }));
                element.dispatchEvent(new Event('change', { bubbles: true }));
                element.dispatchEvent(new Event('blur', { bubbles: true }));
            }
        } else {
            console.warn(`Field not found: ${fieldId}`);
        }
    });
}

export { fillFormFields };
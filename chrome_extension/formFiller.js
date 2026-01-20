/**
 * Form Field Filler Module
 * Handles filling form fields with provided data
 */

/**
 * Format time value to HH:MM format
 * Accepts various formats: "2:30 PM", "14:30", "230", etc.
 */
function formatTime(value) {
    if (!value) return '';
    
    const valStr = String(value).trim();
    
    // Already in HH:MM or HH:MM:SS format
    if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(valStr)) {
        return valStr;
    }
    
    // Handle 12-hour format with AM/PM
    const ampmMatch = valStr.match(/(\d{1,2}):?(\d{2})?\s*(AM|PM)/i);
    if (ampmMatch) {
        let hours = parseInt(ampmMatch[1]);
        const minutes = ampmMatch[2] || '00';
        const period = ampmMatch[3].toUpperCase();
        
        if (period === 'PM' && hours < 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;
        
        return `${String(hours).padStart(2, '0')}:${minutes}`;
    }
    
    return valStr;
}

/**
 * Format date value to DD/MM/YYYY or YYYY-MM-DD format
 * Accepts various formats: "2026-01-15", "15/01/2026", "15-01-2026", etc.
 */
function formatDate(value, useISOFormat = false) {
    if (!value) return '';
    
    const valStr = String(value).trim();
    
    // Try to parse various date formats
    let day, month, year;
    
    // ISO format: YYYY-MM-DD
    const isoMatch = valStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (isoMatch) {
        year = isoMatch[1];
        month = isoMatch[2].padStart(2, '0');
        day = isoMatch[3].padStart(2, '0');
        return useISOFormat ? `${year}-${month}-${day}` : `${day}/${month}/${year}`;
    }
    
    // DD/MM/YYYY or DD-MM-YYYY format
    const dmyMatch = valStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (dmyMatch) {
        day = dmyMatch[1].padStart(2, '0');
        month = dmyMatch[2].padStart(2, '0');
        year = dmyMatch[3];
        return useISOFormat ? `${year}-${month}-${day}` : `${day}/${month}/${year}`;
    }
    
    // MM/DD/YYYY format (US)
    const mdyMatch = valStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (mdyMatch) {
        month = mdyMatch[1].padStart(2, '0');
        day = mdyMatch[2].padStart(2, '0');
        year = mdyMatch[3];
        return useISOFormat ? `${year}-${month}-${day}` : `${day}/${month}/${year}`;
    }
    
    return valStr;
}

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
                     document.querySelector(`[aria-labelledby="${fieldId}"]`) ||
                     document.querySelector(`.${fieldId}`);
        
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
                
                // Handle groups (radio buttons or checkboxes with same name or class)
                if (element.name || element.className) {
                    // Try name first
                    let group = element.name ? document.querySelectorAll(`input[name="${element.name}"]`) : [];
                    
                    // If name doesn't work, try class (for cases like class="sagender")
                    if (group.length <= 1 && element.className) {
                        const classList = element.className.split(' ').filter(c => c && c !== 'option-input' && c !== 'radio' && c !== 'checkbox');
                        for (const cls of classList) {
                            const classBased = document.querySelectorAll(`.${cls}`);
                            if (classBased.length > 1) {
                                group = classBased;
                                break;
                            }
                        }
                    }
                    
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
                        
                        // Sub-Strategy B: Check associated labels (including next sibling labels)
                        if (!found) {
                            for (const input of group) {
                                let labelText = '';
                                // Check for label with 'for' attribute
                                if (input.id) {
                                    const label = document.querySelector(`label[for="${input.id}"]`);
                                    if (label) labelText = label.textContent.trim().toLowerCase();
                                }
                                // Check for next sibling label
                                if (!labelText && input.nextElementSibling && input.nextElementSibling.tagName === 'LABEL') {
                                    labelText = input.nextElementSibling.textContent.trim().toLowerCase();
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
                if (isBooleanTrue || targetElement !== element) {
                    // Check/enable the box or select the specific radio button
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
                // Special handling for date and time pickers
                if (element.classList.contains('timepicker') || element.id.includes('time')) {
                    // Handle time values - ensure proper format (HH:MM or HH:MM:SS)
                    const timeValue = formatTime(value);
                    element.value = timeValue || value;
                } else if (element.id.includes('date') || element.type === 'date') {
                    // Handle date values - ensure proper format (DD/MM/YYYY or YYYY-MM-DD)
                    const dateValue = formatDate(value, element.type === 'date');
                    element.value = dateValue || value;
                } else {
                    // Standard text input
                    element.value = value;
                }
                
                // Try React/Angular Hack: Use React-compatible setter if available
                // Many modern frameworks override the native value setter
                const proto = window[element.constructor.name]?.prototype;
                const nativeSetter = proto ? Object.getOwnPropertyDescriptor(proto, 'value')?.set : null;
                
                if (nativeSetter) {
                    nativeSetter.call(element, element.value);
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
/**
 * Form Field Extractor Module
 * Handles extraction of form fields from the current webpage
 */

function extractFormFields() {
    const formFields = [];
    const seenFields = new Set();
    
    // Select all form input elements
    const elements = document.querySelectorAll('input, select, textarea');
    
    elements.forEach((element, index) => {
        const type = element.type?.toLowerCase() || 'text';
        // Skip non-interactive input types
        if (type === 'hidden' || type === 'submit' || type === 'button' || type === 'reset' || type === 'image') {
            return;
        }
        
        const style = window.getComputedStyle(element);
        const isSelect2Hidden = element.classList.contains('select2-hidden-accessible');
        // Skip hidden elements unless they're Select2 hidden fields
        if (!isSelect2Hidden) {
            if (style.display === 'none' || style.visibility === 'hidden' || element.offsetParent === null) {
                return;
            }
        }
        
        const fieldId = element.id || 
                       element.name || 
                       element.getAttribute('data-testid') || 
                       element.getAttribute('data-field') ||
                       element.getAttribute('data-automation-id') ||
                       element.getAttribute('aria-labelledby') ||
                       `field_${index}`;
        
        if (seenFields.has(fieldId)) {
            return;
        }
        seenFields.add(fieldId);
        
        const fieldName = element.name || element.id || element.getAttribute('data-testid') || fieldId;
        const fieldType = element.tagName.toLowerCase() === 'select' ? 'select' : 
                         element.tagName.toLowerCase() === 'textarea' ? 'textarea' : type;
        
        let labelText = '';
        
        // Strategy 1: Check for label with 'for' attribute
        if (element.id) {
            const label = document.querySelector(`label[for="${element.id}"]`);
            if (label) {
                labelText = label.textContent.trim();
            }
        }
        
        // Strategy 2: Check aria-labelledby
        if (!labelText) {
            const ariaLabelledBy = element.getAttribute('aria-labelledby');
            if (ariaLabelledBy) {
                const labelElement = document.getElementById(ariaLabelledBy);
                if (labelElement) {
                    labelText = labelElement.textContent.trim();
                }
            }
        }
        
        // Strategy 3: Check if element is inside a label (extract only text nodes)
        if (!labelText) {
            const parentLabel = element.closest('label');
            if (parentLabel) {
                labelText = Array.from(parentLabel.childNodes)
                    .filter(node => node.nodeType === Node.TEXT_NODE)
                    .map(node => node.textContent.trim())
                    .filter(text => text.length > 0)
                    .join(' ');
            }
        }
        
        // Strategy 4: Check sibling labels (radio buttons often have labels next to them)
        if (!labelText && (type === 'radio' || type === 'checkbox')) {
            const nextLabel = element.nextElementSibling;
            if (nextLabel && nextLabel.tagName === 'LABEL') {
                labelText = nextLabel.textContent.trim();
            }
        }
        
        // Fallback to aria-label, placeholder, or title
        if (!labelText) {
            labelText = element.getAttribute('aria-label') || 
                       element.placeholder || 
                       element.getAttribute('title') || '';
        }
        
        if (!labelText) {
            const prevSibling = element.previousElementSibling;
            if (prevSibling && (prevSibling.tagName === 'LABEL' || prevSibling.tagName === 'SPAN' || prevSibling.tagName === 'DIV')) {
                labelText = prevSibling.textContent.trim();
            }
        }
        
        if (!labelText) {
            const parent = element.closest('div[class*="field"], div[class*="form-group"], div[class*="input"]');
            if (parent) {
                const labelInParent = parent.querySelector('label, span[class*="label"]');
                if (labelInParent) {
                    labelText = labelInParent.textContent.trim();
                }
            }
        }
        
        // Capture options for select elements
        let options = [];
        if (fieldType === 'select') {
            options = Array.from(element.options)
                .filter(opt => opt.value) // Exclude empty options
                .map(opt => ({
                    value: opt.value,
                    text: opt.text.trim()
                }));
        }
        
        // Capture current value
        let currentValue = element.value || '';
        if (type === 'checkbox' || type === 'radio') {
            currentValue = element.checked ? 'checked' : 'unchecked';
        }
        
        const fieldInfo = {
            id: fieldId,
            name: fieldName,
            type: fieldType,
            label: labelText,
            tagName: element.tagName.toLowerCase(),
            placeholder: element.placeholder || '',
            currentValue: currentValue
        };
        
        // Add options for select elements
        if (options.length > 0) {
            fieldInfo.options = options;
        }
        
        // Mark Select2 fields
        if (element.classList.contains('select2-hidden-accessible')) {
            fieldInfo.isSelect2 = true;
        }
        
        formFields.push(fieldInfo);
    });
    
    return formFields;
}

export { extractFormFields };

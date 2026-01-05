/**
 * Form Field Extractor Module
 * Handles extraction of form fields from the current webpage
 */

function extractFormFields() {
    const formFields = [];
    const seenFields = new Set();
    
    const elements = document.querySelectorAll('input, select, textarea');
    
    elements.forEach((element, index) => {
        const type = element.type?.toLowerCase() || 'text';
        if (type === 'hidden' || type === 'submit' || type === 'button' || type === 'reset' || type === 'image') {
            return;
        }
        
        const style = window.getComputedStyle(element);
        if (style.display === 'none' || style.visibility === 'hidden' || element.offsetParent === null) {
            return;
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
        
        if (element.id) {
            const label = document.querySelector(`label[for="${element.id}"]`);
            if (label) {
                labelText = label.textContent.trim();
            }
        }
        
        if (!labelText) {
            const ariaLabelledBy = element.getAttribute('aria-labelledby');
            if (ariaLabelledBy) {
                const labelElement = document.getElementById(ariaLabelledBy);
                if (labelElement) {
                    labelText = labelElement.textContent.trim();
                }
            }
        }
        
        if (!labelText) {
            const parentLabel = element.closest('label');
            if (parentLabel) {
                labelText = Array.from(parentLabel.childNodes)
                    .filter(node => node.nodeType === Node.TEXT_NODE)
                    .map(node => node.textContent.trim())
                    .join(' ');
            }
        }
        
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
        
        formFields.push({
            id: fieldId,
            name: fieldName,
            type: fieldType,
            label: labelText,
            tagName: element.tagName.toLowerCase()
        });
    });
    
    return formFields;
}

export { extractFormFields };

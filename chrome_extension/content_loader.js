/**
 * Content Script Loader
 * Dynamically imports the main content script module to support ES modules
 */
(async () => {
    const src = chrome.runtime.getURL('content_script.js');
    await import(src);
})();

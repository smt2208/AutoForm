# Chrome Extension - FormFiller

## Structure

```
chrome_extension/
├── manifest.json       # Manifest V3 configuration
├── popup.html         # Extension popup UI
├── popup.js           # Popup event handlers
├── background.js      # Service worker
├── styles.css         # Popup styling
├── config.js          # Configuration (portable)
└── README.md          # This file
```

## Installation

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select the `chrome_extension` folder

## Features

✅ **Manifest V3** - Latest Chrome Extension standard
✅ **Portable** - Change `config.js` to adjust backend URL
✅ **Recording UI** - Start/Stop buttons with status indicator
✅ **Service Worker** - Background message handling
✅ **Console Logging** - Track actions in DevTools

## Configuration

Edit `config.js` to change the backend URL:

```javascript
BACKEND_URL: 'http://localhost:8000'  // Change as needed
```

## Testing

1. Open the extension popup (click icon in Chrome toolbar)
2. Click "Start Recording" - button disables, indicator turns green
3. Click "Stop Recording" - button re-enables, indicator turns grey
4. Check Chrome DevTools console for logs

## Next Steps

- [ ] Add audio recording using Web Audio API
- [ ] Send recordings to FastAPI backend
- [ ] Display form field mapping results
- [ ] Auto-fill detected fields on the webpage
- [ ] Add configuration UI for backend URL

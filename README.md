# AutoForm - Privacy-First Voice Form Filler

AutoForm is a fully offline, privacy-focused browser extension that automates web form filling using voice commands. It leverages local AI models to transcribe speech and intelligently map your intent to form fields without ever sending your data to the cloud.

## 🚀 Key Features

*   **100% Offline & Private**: All processing happens locally on your machine. No audio or form data leaves your network.
*   **Voice-Powered**: Simply speak to fill out forms.
*   **Intelligent Mapping**: Uses LLMs to understand context and map your speech to the correct fields (e.g., "My name is John" -> fills `First Name` field).
*   **Universal Compatibility**: Works on any website with standard HTML forms.

## 🛠️ Tech Stack

*   **Backend**: Python, FastAPI, Uvicorn
*   **Speech-to-Text**: Faster-Whisper (local inference)
*   **LLM**: Ollama (running Ministral-3:3b)
*   **Orchestration**: LangChain
*   **Frontend**: Chrome Extension (Manifest V3), JavaScript, HTML/CSS

## 📊 Architecture Flow

![AutoForm Architecture](assets/AutoForm%20Architecture.png)

## 📦 Installation

### Prerequisites
1.  **Python 3.10+** installed.
2.  **Ollama** installed and running (`ollama serve`).
3.  **Google Chrome** or a Chromium-based browser.

### 1. Backend Setup
```bash
# Clone the repository
git clone https://github.com/yourusername/AutoForm.git
cd AutoForm

# Create and activate virtual environment
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Pull the Ollama model (default is ministral-3:3b)
ollama pull ministral-3:3b

# Start the server
python main.py
```

### 2. Extension Setup
1.  Open Chrome and navigate to `chrome://extensions`.
2.  Enable **Developer mode** (top right toggle).
3.  Click **Load unpacked**.
4.  Select the `chrome_extension` folder from this project.
5.  The AutoForm icon should appear in your toolbar.

## 📖 Usage

1.  Ensure the backend server is running (`http://localhost:8000`).
2.  Navigate to any website with a form (e.g., a registration page).
3.  Click the **AutoForm extension icon**.
4.  Click **Start Recording** and speak the information you want to fill (e.g., "My name is Alice, email is alice@example.com").
5.  Click **Stop Recording**.
6.  Watch as the form fields are automatically filled!

## ⚠️ Limitations

AutoForm is a **generic form filler** designed for simple to mid-complexity forms. It works well for:
- Basic contact forms
- Standard registration/signup forms
- Surveys and questionnaires
- General government forms
- Exam/test registration forms
- General information fields

**May struggle with:**
- Highly dynamic forms that change based on user input
- Complex forms with intricate conditional logic
- Forms with multiple interdependent field validations
- Real-time validation forms with complex rules

For best results, speak clearly and provide detailed information. The tool performs well on standard forms but may need additional context for highly complex dynamic scenarios.

## 🛡️ Privacy Note
This project is designed with privacy as the top priority. 
- **Whisper** runs locally for transcription.
- **Ollama (Ministral-3:3b)** runs locally for reasoning.
- No external API keys are required.
- No data is stored on external servers.

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
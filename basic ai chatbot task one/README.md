# Gemini AI Chatbot

A minimal command-line chatbot powered by [Google Gemini](https://ai.google.dev/) via the `google-genai` Python SDK.

## Features

- Interactive terminal chat loop
- Configurable model via environment variable
- Automatic retry with backoff on server errors
- Optional `.env` file support for local development

## Requirements

- Python 3.8+
- A [Google Gemini API key](https://aistudio.google.com/app/apikey)

## Installation

```bash
git clone https://github.com/your-username/your-repo-name.git
cd your-repo-name
```

Optionally create a virtual environment:

```bash
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

`requirements.txt` should contain:

```
google-genai
python-dotenv
```

## Configuration

**Option 1 — `.env` file** (recommended for local dev, do not commit):

```
GEMINI_API_KEY=your-api-key-here
```

**Option 2 — environment variable:**

```bash
# macOS/Linux
export GEMINI_API_KEY="your-api-key-here"

# Windows PowerShell (current session)
$env:GEMINI_API_KEY="your-api-key-here"

# Windows PowerShell (permanent)
setx GEMINI_API_KEY "your-api-key-here"
```

To use a different model (default: `gemini-2.5-flash`):

```
GEMINI_MODEL=gemini-2.5-pro
```

## Usage

```bash
python chatbot.py
```

```
Simple chatbot — type 'exit' to quit.
You: What is the capital of France?
AI: The capital of France is Paris.
You: exit
Goodbye.
```

## Project Structure

```
.
├── chatbot.py        # Main chatbot script
├── requirements.txt  # Python dependencies
├── .env              # Local secrets (not committed)
└── .gitignore
```

## .gitignore

```
.env
__pycache__/
*.pyc
.venv/
```

## Limitations

- No conversation history — each message is sent independently with no memory of prior turns
- No streaming output
- Single-user, single-session only

## License

MIT

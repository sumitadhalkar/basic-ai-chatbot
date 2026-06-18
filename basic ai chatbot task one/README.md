# Gemini AI Chatbot with React UI

A minimal AI chatbot with a Python backend and React frontend.

## Features

- Flask backend that serves a React frontend
- Gemini chatbot endpoint at `/api/chat`
- React chat UI with message bubbles and error handling

## Requirements

- Python 3.8+
- Node.js 18+
- `google-genai`
- `python-dotenv`

## Setup

1. Install Python dependencies:

```powershell
cd "basic ai chatbot task one"
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
pip install flask
```

2. Install React frontend dependencies:

```powershell
cd frontend
npm install
```

3. Set your Gemini API key:

```powershell
$env:GEMINI_API_KEY="your-api-key-here"
```

Or create a `.env` file in `basic ai chatbot task one`:

```env
GEMINI_API_KEY=your-api-key-here
```

## Run locally

1. Build the React app:

```powershell
cd frontend
npm run build
```

2. Start the Flask server:

```powershell
cd ..
.\.venv\Scripts\activate
python aibot_server.py
```

3. Open `http://localhost:5000` in your browser.

## Notes

- The React app is served from `frontend/build`.
- The Flask API endpoint is `/api/chat`.
- Keep `.env` out of version control.

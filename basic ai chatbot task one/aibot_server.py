import os
import sys
import time
from pathlib import Path
from flask import Flask, request, jsonify

try:
    from google import genai
    from google.genai.errors import APIError, ServerError
except Exception:
    print("Missing 'google-genai'. Install with: pip install -r requirements.txt")
    sys.exit(1)

try:
    from dotenv import load_dotenv
    env_path = Path(__file__).with_name('.env')
    if env_path.exists():
        load_dotenv(env_path)
except Exception:
    pass

API_KEY = os.getenv('GEMINI_API_KEY')
if not API_KEY:
    print('Please set GEMINI_API_KEY and rerun.')
    sys.exit(1)

client = genai.Client(api_key=API_KEY)
MODEL = os.getenv('GEMINI_MODEL', 'gemini-2.5-flash')
MAX_RETRIES = 3
RETRY_DELAY = 2

SYSTEM_PROMPT = (
    'You are a friendly AI chatbot. Answer user messages directly and politely. '
    'If the user types a greeting, greet them back and ask how you can help. '
    'If the user enters a short phrase or keyword, treat it as a request and answer it clearly.'
)

app = Flask(__name__, static_folder='frontend/public', static_url_path='')


def build_prompt(text):
    trimmed = text.strip()
    if len(trimmed.split()) <= 4 and not trimmed.endswith('?'):
        trimmed = 'Please respond to this request: ' + trimmed
    return f"{SYSTEM_PROMPT}\n\nUser: {trimmed}\nAssistant:"


def generate(text):
    last_error = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            resp = client.models.generate_content(model=MODEL, contents=text)
            return getattr(resp, 'text', str(resp)).strip()
        except ServerError as e:
            last_error = e
            if getattr(e, 'status_code', None) == 503 and attempt < MAX_RETRIES:
                time.sleep(RETRY_DELAY * attempt)
                continue
            break
        except APIError as e:
            last_error = e
            break
        except Exception as e:
            last_error = e
            break

    return None


@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.get_json(silent=True) or {}
    message = data.get('message', '').strip()
    if not message:
        return jsonify({'error': 'No message provided.'}), 400

    prompt = build_prompt(message)
    reply = generate(prompt)
    if reply is None:
        return jsonify({'error': 'Could not get a response from the AI service.'}), 500

    return jsonify({'reply': reply})


@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_frontend(path):
    if path != '' and os.path.exists(os.path.join(app.static_folder, path)):
        return app.send_static_file(path)
    return app.send_static_file('index.html')


def open_browser():
    import webbrowser
    webbrowser.open_new('http://127.0.0.1:5000')


if __name__ == '__main__':
    if os.environ.get('WERKZEUG_RUN_MAIN') == 'true' or not app.debug:
        open_browser()
    app.run(host='0.0.0.0', port=5000, debug=True)

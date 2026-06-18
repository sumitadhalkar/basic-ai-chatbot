"""Minimal AI chatbot using Google Gemini via `genai`.

Make sure `GEMINI_API_KEY` is set in the environment.
"""

import os
import sys
import time
from pathlib import Path

try:
	from google import genai
	from google.genai.errors import APIError, ServerError
except Exception:
	print("Missing 'google-genai'. Install with: pip install -r requirements.txt")
	sys.exit(1)

# Optionally load a local .env file for development (not checked into VCS)
try:
	from dotenv import load_dotenv
	env_path = Path(__file__).with_name('.env')
	if env_path.exists():
		load_dotenv(env_path)
except Exception:
	# dotenv is optional; we'll fall back to environment variables
	pass

API_KEY = os.getenv("GEMINI_API_KEY")
if not API_KEY:
	print("Please set GEMINI_API_KEY and rerun.")
	sys.exit(1)

client = genai.Client(api_key=API_KEY)
MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

MAX_RETRIES = 3
RETRY_DELAY = 2

SYSTEM_PROMPT = (
	"You are a friendly AI chatbot. Answer user messages directly and politely. "
	"If the user types a greeting, greet them back and ask how you can help. "
	"If the user enters a short phrase or keyword, treat it as a request and answer it clearly."
)

GREETINGS = (
	"hi",
	"hello",
	"hey",
	"hiya",
	"good morning",
	"good afternoon",
	"good evening",
	"yo",
)


def is_greeting(text):
	normalized = text.lower().strip()[:-1] if text.strip().endswith("?") else text.lower().strip()
	return any(
		normalized == greeting or normalized.startswith(greeting + " ")
		for greeting in GREETINGS
	)


def build_prompt(text):
	trimmed = text.strip()
	if len(trimmed.split()) <= 4 and not trimmed.endswith("?"):
		trimmed = "Please respond to this request: " + trimmed
	return f"{SYSTEM_PROMPT}\n\nUser: {trimmed}\nAssistant:"


def generate(text):
	last_error = None
	for attempt in range(1, MAX_RETRIES + 1):
		try:
			resp = client.models.generate_content(model=MODEL, contents=text)
			return getattr(resp, "text", str(resp)).strip()
		except ServerError as e:
			last_error = e
			if getattr(e, 'status_code', None) == 503 and attempt < MAX_RETRIES:
				print("Model busy, retrying... (attempt {}/{})".format(attempt, MAX_RETRIES))
				time.sleep(RETRY_DELAY * attempt)
				continue
			print("Server error: {}".format(e))
			break
		except APIError as e:
			last_error = e
			print("API error: {}".format(e))
			break
		except Exception as e:
			last_error = e
			print("Unexpected error: {}".format(e))
			break

	return "Sorry, I couldn't get a response right now. Please try again."

def main():
	print("Simple chatbot — type 'exit' to quit.")
	while True:
		try:
			msg = input("You: ").strip()
		except (KeyboardInterrupt, EOFError):
			print("\nGoodbye.")
			break

		if not msg:
			continue
		if msg.lower() == "exit":
			print("Goodbye.")
			break

		if is_greeting(msg):
			print("AI: Hello! How can I help you today?")
			continue

		out = generate(msg)
		print("AI:", out)

if __name__ == "__main__":
	main()


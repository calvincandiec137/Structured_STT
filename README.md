# Voice Programmer Dictation Prototype

A focused demo for structured voice dictation aimed at programmers. It records a full voice clip in the browser, sends one complete audio file to FastAPI, transcribes with Groq Whisper, parses `slash` commands, and inserts formatted output into Monaco Editor.

## What It Does

- Records microphone audio in browser (push-to-talk)
- Sends one complete audio file to backend via `POST /transcribe`
- Transcribes with Groq Whisper API
- Converts spoken commands like `slash newline` and `slash open paren`
- Appends parsed output directly into Monaco editor
- Shows transcript, status, and debug logs in UI

## Folder Structure

```text
backend/
  main.py
  parser.py
  requirements.txt
  .env
frontend/
  index.html
  style.css
  script.js
  vite.config.js
README.md
```

## Setup

### 1. Backend

```bash
cd backend
python -m venv .venv
# Windows PowerShell
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Set API keys in `backend/.env`:

```env
GROQ_API_KEYS=your_key_1,your_key_2,your_key_3
```

Run backend:

```bash
python main.py
```

Backend runs at `http://localhost:8000` with endpoint `POST /transcribe`.

### 2. Frontend

Open a second terminal:

```bash
cd frontend
npx vite
```

Open the URL shown by Vite (usually `http://localhost:5173`).

## How to Use

1. Click **Start Recording**
2. Speak commands
3. Click **Stop Recording**
4. App receives transcript + parsed text from backend
5. Parsed output is inserted into editor

## Example Commands

- `slash newline`
- `slash double newline`
- `slash indent`
- `slash tab`
- `slash bullet`
- `slash numbered point`
- `slash open paren` / `slash close paren`
- `slash open brace` / `slash close brace`
- `slash open bracket` / `slash close bracket`
- `slash colon`
- `slash comma`
- `slash dot`
- `slash equals`
- `slash question mark`
- `slash exclamation mark`
- `slash semicolon`
- `slash quote`
- `slash single quote`
- `slash slash`
- `slash backslash`
- `slash dash`
- `slash underscore`
- `slash plus`
- `slash star`

## Error Handling Included

- Microphone permission failure
- Missing API keys
- API request failures
- Empty audio uploads

## Screenshots

- Add screenshots here after running the demo.

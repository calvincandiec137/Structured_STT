# Voice Programmer Dictation Prototype

A focused demo for structured voice dictation aimed at programmers. It streams microphone audio to a FastAPI backend, transcribes with Groq Whisper, parses `slash` commands, and inserts formatted output into Monaco Editor live.

## What It Does

- Streams microphone audio (`audio/webm`) from browser to backend over WebSocket
- Transcribes chunks with Groq Whisper API
- Converts spoken commands like `slash newline` and `slash open paren`
- Appends parsed output directly into a Monaco editor
- Shows a live transcript panel and connection status

## Folder Structure

```text
project/
├── backend/
│   ├── main.py
│   ├── parser.py
│   ├── requirements.txt
│   └── .env
├── frontend/
│   ├── index.html
│   ├── style.css
│   ├── script.js
│   └── vite.config.js
└── README.md
```

## Setup

### 1. Backend

```bash
cd project/backend
python -m venv .venv
# Windows PowerShell
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Set API keys in `project/backend/.env`:

```env
GROQ_API_KEYS=your_key_1,your_key_2,your_key_3
```

Run backend:

```bash
python main.py
```

Backend runs at `http://localhost:8000` with WebSocket endpoint `ws://localhost:8000/ws`.

### 2. Frontend

Open a second terminal:

```bash
cd project/frontend
npx vite
```

Open the URL shown by Vite (usually `http://localhost:5173`).

## How to Use

1. Click **Start Recording**
2. Allow microphone access
3. Speak normally plus slash-commands
4. Watch parsed output appear in Monaco editor
5. Click **Stop Recording** when done

## Supported Commands

### Formatting and spacing

- `slash newline`
- `slash double newline`
- `slash indent`
- `slash tab`
- `slash space`
- `slash bullet`
- `slash numbered point`

### Punctuation

- `slash question mark`
- `slash exclamation mark`
- `slash semicolon`
- `slash quote`
- `slash single quote`

### Symbols

- `slash open paren` / `slash close paren`
- `slash open brace` / `slash close brace`
- `slash open bracket` / `slash close bracket`
- `slash colon`
- `slash comma`
- `slash dot`
- `slash equals`
- `slash slash`
- `slash backslash`
- `slash dash`
- `slash underscore`
- `slash plus`
- `slash star`

## Demo Example

Spoken:

```text
this is point one
slash newline
slash bullet
this is point two
slash newline
slash indent
nested point
```

Output:

```text
this is point one
- this is point two
    nested point
```

## Error Handling Included

- Microphone permission failure
- WebSocket disconnect/failure
- Missing API keys
- Transcription/API failures

## Screenshots

- Add screenshots here after running the demo.

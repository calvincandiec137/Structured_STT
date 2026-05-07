# Voice Programmer Dictation

Minimal prototype for structured voice typing.

Record audio in the browser, send one complete file to FastAPI, transcribe with Groq Whisper, parse `slash` commands, and insert formatted text into Monaco.

## Stack

- Frontend: React + Vite + Monaco + CSS
- Backend: FastAPI (Python)
- STT: Groq Whisper API

## Project Structure

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
# PowerShell
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Create `backend/.env`:

```env
GROQ_API_KEYS=key1,key2,key3
```

Run backend:

```bash
python main.py
```

### 2. Frontend

```bash
cd frontend
npx vite
```

Open: `http://127.0.0.1:5173`

## How To Use

1. Click **Start Recording**
2. Speak text and `slash` commands
3. Click **Stop Recording**
4. Transcript is parsed and inserted into editor

## API

- `GET /health`
- `POST /transcribe` (multipart form with `file`)

## Notes

- English only
- Insertion-only prototype (no cursor movement/editing)
- API key rotation is enabled in backend

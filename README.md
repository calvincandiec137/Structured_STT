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

## Slash Commands Guide

### Line breaks

- `slash new line`, `slash next line`, `slash line break` -> new line
- `slash double new line`, `slash new paragraph` -> blank line

### Spacing

- `slash indent` -> 4 spaces
- `slash tab`, `slash new tab` -> tab
- `slash space` -> space

### Lists

- `slash bullet`, `slash bullet point` -> `- `
- `slash numbered point` -> `1. `

### Punctuation

- `slash question mark` -> `?`
- `slash exclamation mark` -> `!`
- `slash comma` -> `,`
- `slash colon` -> `:`
- `slash semicolon` -> `;`
- `slash dot`, `slash period` -> `.`

### Quotes

- `slash quote`, `slash double quote` -> `"`
- `slash single quote`, `slash apostrophe` -> `'`

### Brackets

- `slash open paren` / `slash close paren` -> `(` / `)`
- `slash open parenthesis` / `slash close parenthesis` -> `(` / `)`
- `slash open bracket` / `slash close bracket` -> `[` / `]`
- `slash open square bracket` / `slash close square bracket` -> `[` / `]`
- `slash open brace` / `slash close brace` -> `{` / `}`
- `slash open curly brace` / `slash close curly brace` -> `{` / `}`
- `slash open angle bracket` / `slash close angle bracket` -> `<` / `>`

### Operators and symbols

- `slash equals` -> `=`
- `slash plus` -> `+`
- `slash minus`, `slash dash` -> `-`
- `slash underscore` -> `_`
- `slash star`, `slash asterisk` -> `*`
- `slash slash` -> `/`
- `slash backslash` -> `\`
- `slash greater than` -> `>`
- `slash less than` -> `<`
- `slash ampersand` -> `&`
- `slash pipe` -> `|`
- `slash percent` -> `%`
- `slash dollar sign` -> `$`
- `slash hash` -> `#`
- `slash at sign` -> `@`
- `slash arrow` -> `->`
- `slash fat arrow` -> `=>`

### Markdown helpers

- `slash code block` -> ``````
- `slash markdown heading` -> `# `

## API

- `GET /health`
- `POST /transcribe` (multipart form with `file`)

## Notes

- English only
- Insertion-only prototype (no cursor movement/editing)
- API key rotation is enabled in backend

import asyncio
import logging
import os
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from groq import APIConnectionError, APIStatusError, Groq

try:
    from parser import parse_transcript
except ModuleNotFoundError:
    # Render often runs from repo root via `uvicorn backend.main:app`.
    from backend.parser import parse_transcript

load_dotenv()
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("voice-dictation-backend")

app = FastAPI(title="Voice Programmer Dictation")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _read_keys() -> list[str]:
    raw = os.getenv("GROQ_API_KEYS", "")
    return [item.strip() for item in raw.split(",") if item.strip()]


API_KEYS = _read_keys()


class ApiKeyRotator:
    def __init__(self, keys: list[str]):
        self.keys = keys
        self.index = 0
        self.lock = asyncio.Lock()

    async def next_key(self) -> tuple[int, str]:
        async with self.lock:
            idx = self.index
            self.index = (self.index + 1) % len(self.keys)
            return idx, self.keys[idx]


rotator = ApiKeyRotator(API_KEYS) if API_KEYS else None


def _is_rate_limit_error(error: Exception) -> bool:
    if isinstance(error, APIStatusError) and error.status_code == 429:
        return True

    message = str(error).lower()
    return "rate limit" in message or "429" in message


async def transcribe_file(audio_bytes: bytes, filename: str, content_type: str) -> str:
    if not API_KEYS or rotator is None:
        raise RuntimeError("Missing GROQ_API_KEYS in backend/.env")

    if not audio_bytes:
        return ""

    last_error: Exception | None = None

    for attempt in range(len(API_KEYS)):
        key_index, api_key = await rotator.next_key()
        client = Groq(api_key=api_key)

        try:
            logger.info(
                "Transcription attempt=%s key_index=%s bytes=%s filename=%s content_type=%s",
                attempt + 1,
                key_index,
                len(audio_bytes),
                filename,
                content_type,
            )

            response = client.audio.transcriptions.create(
                model="whisper-large-v3",
                file=(filename, audio_bytes, content_type),
                language="en",
                response_format="json",
                temperature=0,
            )

            text = getattr(response, "text", "")
            logger.info("Transcription success text_len=%s", len(text or ""))
            return text.strip() if text else ""

        except APIConnectionError as error:
            last_error = error
            logger.warning("APIConnectionError key_index=%s error=%s", key_index, error)
            continue
        except APIStatusError as error:
            last_error = error
            logger.warning("APIStatusError key_index=%s status=%s error=%s", key_index, error.status_code, error)
            if _is_rate_limit_error(error):
                continue
            raise
        except Exception as error:
            last_error = error
            logger.warning("Transcription error key_index=%s error=%s", key_index, error)
            if _is_rate_limit_error(error):
                continue
            raise

    if last_error:
        raise last_error

    raise RuntimeError("No Groq API keys available")


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.websocket("/ws")
async def legacy_ws(websocket: WebSocket) -> None:
    await websocket.accept()
    await websocket.send_json(
        {
            "type": "error",
            "message": "WebSocket dictation is deprecated. Use POST /transcribe flow (Start -> Stop).",
        }
    )
    await websocket.close(code=1000)


@app.post("/transcribe")
async def transcribe(file: UploadFile = File(...)) -> dict[str, Any]:
    if not API_KEYS:
        raise HTTPException(status_code=500, detail="Missing GROQ_API_KEYS in backend/.env")

    audio_bytes = await file.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Empty audio file")

    filename = file.filename or "recording.webm"
    content_type = file.content_type or "audio/webm"

    try:
        raw = await transcribe_file(audio_bytes, filename, content_type)
    except Exception as error:
        logger.exception("Transcription failed")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {error}") from error

    parsed = parse_transcript(raw)
    return {
        "raw": raw,
        "parsed": parsed,
    }


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8000"))
    logger.info("Starting backend with keys=%s port=%s", len(API_KEYS), port)
    uvicorn.run(app, host="0.0.0.0", port=port, reload=False)

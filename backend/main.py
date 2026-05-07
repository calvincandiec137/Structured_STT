import asyncio
import os
from tempfile import NamedTemporaryFile

from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from groq import APIConnectionError, APIStatusError, Groq
from starlette.websockets import WebSocketState

from parser import parse_transcript

load_dotenv()

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


async def transcribe_chunk(audio_bytes: bytes) -> str:
    if not API_KEYS or rotator is None:
        raise RuntimeError("Missing GROQ_API_KEYS in backend/.env")

    last_error: Exception | None = None

    for _ in range(len(API_KEYS)):
        _, api_key = await rotator.next_key()
        client = Groq(api_key=api_key)

        try:
            with NamedTemporaryFile(suffix=".webm", delete=True) as temp:
                temp.write(audio_bytes)
                temp.flush()
                with open(temp.name, "rb") as file_obj:
                    response = client.audio.transcriptions.create(
                        model="whisper-large-v3",
                        file=file_obj,
                        language="en",
                        response_format="json",
                        temperature=0,
                    )

            text = getattr(response, "text", "")
            return text.strip() if text else ""

        except APIConnectionError as error:
            last_error = error
            continue
        except APIStatusError as error:
            last_error = error
            if _is_rate_limit_error(error):
                continue
            raise
        except Exception as error:
            last_error = error
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
async def websocket_endpoint(websocket: WebSocket) -> None:
    await websocket.accept()

    if not API_KEYS:
        await websocket.send_json({"type": "error", "message": "Missing GROQ_API_KEYS in backend/.env"})
        await websocket.close(code=1011)
        return

    await websocket.send_json({"type": "status", "message": "connected"})

    try:
        while True:
            packet = await websocket.receive()
            message_type = packet.get("type")

            if message_type == "websocket.disconnect":
                break

            if "bytes" in packet and packet["bytes"]:
                audio_bytes = packet["bytes"]
                try:
                    transcript = await transcribe_chunk(audio_bytes)
                except Exception as error:
                    await websocket.send_json({"type": "error", "message": f"Transcription failed: {error}"})
                    continue

                if not transcript:
                    continue

                parsed = parse_transcript(transcript)
                await websocket.send_json(
                    {
                        "type": "transcript",
                        "raw": transcript,
                        "parsed": parsed,
                    }
                )

            elif "text" in packet and packet["text"]:
                text = packet["text"].strip().lower()
                if text == "stop":
                    await websocket.send_json({"type": "status", "message": "stopping"})
                    break

    except WebSocketDisconnect:
        return
    except RuntimeError as error:
        # Starlette can raise RuntimeError when disconnect is already consumed.
        if "disconnect message has been received" in str(error).lower():
            return
        raise
    finally:
        try:
            if websocket.application_state == WebSocketState.CONNECTED:
                await websocket.close()
        except RuntimeError:
            pass


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

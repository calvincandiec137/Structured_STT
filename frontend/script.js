import React, { useEffect, useMemo, useRef, useState } from "https://esm.sh/react@18.3.1";
import { createRoot } from "https://esm.sh/react-dom@18.3.1/client";

const TRANSCRIBE_URL = "http://localhost:8000/transcribe";
const DEBUG = true;
const INITIAL_CODE = `# Voice Programmer Dictation Demo
# Speak commands like:
# slash newline
# slash indent
# slash open paren
`;

function loadMonaco() {
  return new Promise((resolve, reject) => {
    if (window.monaco) {
      resolve(window.monaco);
      return;
    }

    if (!window.require) {
      reject(new Error("Monaco loader failed to initialize."));
      return;
    }

    window.require.config({
      paths: {
        vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.52.2/min/vs",
      },
    });

    window.require(["vs/editor/editor.main"], () => {
      resolve(window.monaco);
    }, reject);
  });
}

function App() {
  const editorMountRef = useRef(null);
  const editorRef = useRef(null);
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);

  const [transcript, setTranscript] = useState("Waiting for speech...");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [debugLines, setDebugLines] = useState([]);

  function logDebug(message) {
    if (!DEBUG) return;
    const line = `${new Date().toLocaleTimeString()} | ${message}`;
    console.log(`[voice-debug] ${line}`);
    setDebugLines((prev) => [...prev.slice(-39), line]);
  }

  const statusLabel = useMemo(() => {
    if (status === "recording") return "Recording";
    if (status === "transcribing") return "Transcribing";
    if (status === "error") return "Error";
    return "Idle";
  }, [status]);

  useEffect(() => {
    let disposed = false;

    loadMonaco()
      .then((monaco) => {
        if (disposed || !editorMountRef.current) return;

        monaco.editor.defineTheme("dictation-dark", {
          base: "vs-dark",
          inherit: true,
          rules: [],
          colors: {
            "editor.background": "#0f172a",
            "editor.lineHighlightBackground": "#1e293b66",
          },
        });

        editorRef.current = monaco.editor.create(editorMountRef.current, {
          value: INITIAL_CODE,
          language: "python",
          theme: "dictation-dark",
          automaticLayout: true,
          minimap: { enabled: false },
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 14,
          lineNumbersMinChars: 3,
          smoothScrolling: true,
          scrollBeyondLastLine: false,
        });
      })
      .catch((err) => {
        setError(err.message || "Failed to load Monaco editor.");
        setStatus("error");
      });

    return () => {
      disposed = true;
      cleanupRecorder();
      editorRef.current?.dispose();
      editorRef.current = null;
    };
  }, []);

  function appendToEditor(text) {
    const editor = editorRef.current;
    if (!editor || !text) return;

    const model = editor.getModel();
    if (!model) return;

    const current = model.getValue();
    let chunk = text;

    if (current.length > 0) {
      const lastChar = current[current.length - 1];
      const firstChar = chunk[0];
      const needsSpace = !/\s/.test(lastChar) && !/^[,.:;!?\)\]\}]/.test(firstChar);
      if (needsSpace && firstChar !== "\n") {
        chunk = ` ${chunk}`;
      }
    }

    const lineCount = model.getLineCount();
    const endColumn = model.getLineMaxColumn(lineCount);

    editor.executeEdits("voice-dictation", [
      {
        range: {
          startLineNumber: lineCount,
          startColumn: endColumn,
          endLineNumber: lineCount,
          endColumn,
        },
        text: chunk,
      },
    ]);

    editor.revealLine(model.getLineCount());
  }

  function pickRecorderMimeType() {
    const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/ogg"];
    for (const type of candidates) {
      if (MediaRecorder.isTypeSupported(type)) return type;
    }
    return "";
  }

  function cleanupRecorder() {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    recorderRef.current = null;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    streamRef.current = null;

    chunksRef.current = [];
  }

  async function sendForTranscription(blob, mimeType) {
    setStatus("transcribing");
    logDebug(`upload begin bytes=${blob.size} mime=${mimeType || "unknown"}`);

    const extension = mimeType.includes("ogg") ? "ogg" : "webm";
    const file = new File([blob], `recording.${extension}`, { type: mimeType || "audio/webm" });
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(TRANSCRIBE_URL, {
        method: "POST",
        body: formData,
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        const detail = payload?.detail || `HTTP ${response.status}`;
        throw new Error(detail);
      }

      const raw = payload.raw || "";
      const parsed = payload.parsed || "";
      logDebug(`upload done raw_len=${raw.length} parsed_len=${parsed.length}`);

      setTranscript(raw || "(no speech detected)");
      if (parsed) {
        appendToEditor(parsed);
      }
      setStatus("idle");
    } catch (err) {
      const message = err?.message || "Transcription request failed.";
      logDebug(`upload failed error=${message}`);
      setError(message);
      setStatus("error");
    }
  }

  async function startRecording() {
    if (status === "recording" || status === "transcribing") return;

    setError("");
    setTranscript("Listening...");
    chunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = pickRecorderMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (!event.data || event.data.size === 0) return;
        chunksRef.current.push(event.data);
        logDebug(`chunk captured size=${event.data.size} type=${event.data.type || mimeType || "unknown"}`);
      };

      recorder.onerror = () => {
        logDebug("recorder error");
        setError("Audio recording failed.");
        setStatus("error");
      };

      recorder.onstop = async () => {
        logDebug(`recorder stopped chunks=${chunksRef.current.length}`);
        const recordedBlob = new Blob(chunksRef.current, { type: recorder.mimeType || mimeType || "audio/webm" });
        chunksRef.current = [];

        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;

        if (!recordedBlob.size) {
          setError("No audio captured. Please try again.");
          setStatus("error");
          return;
        }

        await sendForTranscription(recordedBlob, recorder.mimeType || mimeType || "audio/webm");
      };

      recorder.start();
      setStatus("recording");
      logDebug(`recorder started mime=${recorder.mimeType || mimeType || "browser-default"}`);
    } catch (err) {
      const message = err?.message || "Microphone permission denied.";
      logDebug(`start failed error=${message}`);
      setError(message);
      setStatus("error");
      cleanupRecorder();
    }
  }

  function stopRecording() {
    if (!recorderRef.current) return;
    if (recorderRef.current.state === "inactive") return;
    logDebug("stop requested");
    recorderRef.current.stop();
  }

  return (
    React.createElement("div", { className: "page" },
      React.createElement("header", { className: "top" },
        React.createElement("h1", null, "Voice Programmer Dictation"),
        React.createElement("p", null, "Press start, speak commands, then stop to transcribe and insert structured text.")
      ),
      React.createElement("main", { className: "workspace" },
        React.createElement("section", { className: "panel editor-panel" },
          React.createElement("div", { className: "panel-title" }, "Editor"),
          React.createElement("div", { ref: editorMountRef, className: "editor" })
        ),
        React.createElement("section", { className: "panel transcript-panel" },
          React.createElement("div", { className: "panel-title" }, "Transcript"),
          React.createElement("pre", { className: "transcript" }, transcript),
          React.createElement("div", { className: "panel-title" }, "Debug Log"),
          React.createElement("pre", { className: "transcript" }, debugLines.join("\n")),
          error ? React.createElement("div", { className: "error" }, error) : null
        )
      ),
      React.createElement("footer", { className: "controls" },
        React.createElement("div", { className: "buttons" },
          React.createElement(
            "button",
            { className: "start", disabled: status === "recording" || status === "transcribing", onClick: startRecording },
            "Start Recording"
          ),
          React.createElement(
            "button",
            { className: "stop", disabled: status !== "recording", onClick: stopRecording },
            "Stop Recording"
          )
        ),
        React.createElement("div", { className: `status ${status}` },
          React.createElement("span", { className: "dot" }),
          React.createElement("span", null, statusLabel)
        )
      )
    )
  );
}

createRoot(document.getElementById("app")).render(React.createElement(App));

import React, { useEffect, useMemo, useRef, useState } from "https://esm.sh/react@18.3.1";
import { createRoot } from "https://esm.sh/react-dom@18.3.1/client";

const WS_URL = "ws://localhost:8000/ws";
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
  const socketRef = useRef(null);
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const lastTranscriptRef = useRef("");

  const [transcript, setTranscript] = useState("Waiting for speech...");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  const isRecording = status === "recording";

  const statusLabel = useMemo(() => {
    if (status === "recording") return "Recording";
    if (status === "connecting") return "Connecting";
    if (status === "connected") return "Connected";
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
      stopRecording();
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

  async function startRecording() {
    if (isRecording || status === "connecting") return;

    setError("");
    setStatus("connecting");
    setTranscript("Listening...");
    lastTranscriptRef.current = "";

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const socket = new WebSocket(WS_URL);
      socket.binaryType = "arraybuffer";

      socket.onopen = () => {
        setStatus("connected");
      };

      socket.onerror = () => {
        setStatus("error");
        setError("WebSocket connection failed.");
      };

      socket.onclose = () => {
        if (status !== "idle") {
          setStatus((prev) => (prev === "error" ? "error" : "idle"));
        }
      };

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);

          if (payload.type === "error") {
            setError(payload.message || "Unknown backend error.");
            setStatus("error");
            return;
          }

          if (payload.type === "status") {
            if (payload.message === "connected") {
              setStatus("recording");
            }
            return;
          }

          if (payload.type === "transcript") {
            setTranscript(payload.raw || "");

            const parsed = payload.parsed || "";
            if (parsed && parsed !== lastTranscriptRef.current) {
              appendToEditor(parsed);
              lastTranscriptRef.current = parsed;
            }
          }
        } catch {
          setError("Invalid server message.");
          setStatus("error");
        }
      };

      socketRef.current = socket;

      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      recorderRef.current = recorder;

      recorder.ondataavailable = async (event) => {
        if (!event.data || event.data.size === 0) return;
        if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;

        const bytes = await event.data.arrayBuffer();
        socketRef.current.send(bytes);
      };

      recorder.onerror = () => {
        setError("Audio recording failed.");
        setStatus("error");
      };

      recorder.start(900);
    } catch (err) {
      const message = err?.message || "Microphone permission denied.";
      setError(message);
      setStatus("error");
      cleanupStream();
    }
  }

  function cleanupStream() {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    recorderRef.current = null;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    streamRef.current = null;

    if (socketRef.current) {
      if (socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send("stop");
      }
      socketRef.current.close();
    }
    socketRef.current = null;
  }

  function stopRecording() {
    cleanupStream();
    setStatus("idle");
  }

  return (
    React.createElement("div", { className: "page" },
      React.createElement("header", { className: "top" },
        React.createElement("h1", null, "Voice Programmer Dictation"),
        React.createElement("p", null, "Speak structure-first commands and watch code format itself in real time.")
      ),
      React.createElement("main", { className: "workspace" },
        React.createElement("section", { className: "panel editor-panel" },
          React.createElement("div", { className: "panel-title" }, "Editor"),
          React.createElement("div", { ref: editorMountRef, className: "editor" })
        ),
        React.createElement("section", { className: "panel transcript-panel" },
          React.createElement("div", { className: "panel-title" }, "Live Transcript"),
          React.createElement("pre", { className: "transcript" }, transcript),
          error ? React.createElement("div", { className: "error" }, error) : null
        )
      ),
      React.createElement("footer", { className: "controls" },
        React.createElement("div", { className: "buttons" },
          React.createElement("button", { className: "start", disabled: isRecording || status === "connecting", onClick: startRecording }, "Start Recording"),
          React.createElement("button", { className: "stop", disabled: !isRecording && status !== "connected", onClick: stopRecording }, "Stop Recording")
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

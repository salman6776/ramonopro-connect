import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Loader2, Sparkles, AlertCircle, RotateCw } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { transcribeAudio } from "@/lib/ai.functions";
import { requireAccessToken } from "@/lib/session";

type Props = { onTranscribed: (text: string) => void };

const MAX_RECORD_MS = 120_000; // 2 min

function isMediaRecorderSupported() {
  return typeof window !== "undefined" && typeof window.MediaRecorder !== "undefined";
}

export function VoiceRecorder({ onTranscribed }: Props) {
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [supported, setSupported] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const lastBlobRef = useRef<{ blob: Blob; mimeType: string } | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transcribe = useServerFn(transcribeAudio);

  useEffect(() => {
    if (!recording) return;
    setElapsed(0);
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, [recording]);

  useEffect(() => {
    setSupported(isMediaRecorderSupported());
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, []);

  const runTranscription = async (blob: Blob, mimeType: string) => {
    setBusy(true);
    setError(null);
    try {
      const base64 = await blobToBase64(blob);
      const access_token = await requireAccessToken();
      const { text } = await transcribe({ data: { access_token, audioBase64: base64, mimeType } });
      if (text) onTranscribed(text);
      else setError("Aucun texte détecté.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur transcription");
    } finally {
      setBusy(false);
    }
  };

  const start = async () => {
    setError(null);
    if (!supported) {
      setError("Dictée non supportée sur ce navigateur.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream, { mimeType: pickMime() });
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
        const blob = new Blob(chunksRef.current, { type: rec.mimeType });
        if (blob.size < 1000) {
          setError("Enregistrement trop court.");
          return;
        }
        lastBlobRef.current = { blob, mimeType: rec.mimeType };
        await runTranscription(blob, rec.mimeType);
      };
      rec.start();
      recRef.current = rec;
      setRecording(true);
      timeoutRef.current = setTimeout(() => {
        if (recRef.current?.state === "recording") recRef.current.stop();
        setRecording(false);
      }, MAX_RECORD_MS);
    } catch (err) {
      const name = (err as { name?: string })?.name;
      if (name === "NotAllowedError" || name === "SecurityError") {
        setError("Accès au micro refusé. Autorisez-le dans les réglages du navigateur.");
      } else if (name === "NotFoundError") {
        setError("Aucun micro détecté.");
      } else {
        setError("Micro inaccessible.");
      }
    }
  };

  const stop = () => {
    recRef.current?.stop();
    setRecording(false);
  };

  const retry = () => {
    if (lastBlobRef.current) {
      void runTranscription(lastBlobRef.current.blob, lastBlobRef.current.mimeType);
    } else {
      void start();
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      {busy ? (
        <Button type="button" variant="secondary" size="sm" disabled>
          <Loader2 className="h-4 w-4 mr-1 animate-spin" />Transcription IA…
        </Button>
      ) : recording ? (
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-destructive tabular-nums">
            {String(Math.floor(elapsed / 60)).padStart(2, "0")}:{String(elapsed % 60).padStart(2, "0")}
          </span>
          <Button type="button" variant="destructive" size="sm" onClick={stop} className="animate-pulse">
            <Square className="h-4 w-4 mr-1" />Terminer
          </Button>
        </div>
      ) : (
        <Button type="button" variant="secondary" size="sm" onClick={start} disabled={!supported}>
          <Mic className="h-4 w-4 mr-1" />Dicter
        </Button>
      )}
      {recording && !busy && (
        <span className="text-[11px] text-muted-foreground">Parlez normalement, puis « Terminer »</span>
      )}
      {error && (
        <div className="flex items-center gap-2 text-xs text-destructive max-w-[260px] text-right">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span className="flex-1">{error}</span>
          <button type="button" onClick={retry}
            className="inline-flex items-center gap-1 underline hover:no-underline">
            <RotateCw className="h-3 w-3" />Réessayer
          </button>
        </div>
      )}
    </div>
  );
}

export function AIIcon() {
  return <Sparkles className="h-4 w-4 mr-1" />;
}

function pickMime() {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
  for (const m of candidates) if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m)) return m;
  return "";
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onloadend = () => {
      const s = String(r.result);
      resolve(s.slice(s.indexOf(",") + 1));
    };
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

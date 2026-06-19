import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Loader2, Sparkles } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { transcribeAudio } from "@/lib/ai.functions";
import { toast } from "sonner";

type Props = {
  onTranscribed: (text: string) => void;
};

/** Bouton d'enregistrement → transcription Groq Whisper FR. */
export function VoiceRecorder({ onTranscribed }: Props) {
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const transcribe = useServerFn(transcribeAudio);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream, { mimeType: pickMime() });
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: rec.mimeType });
        if (blob.size < 1000) {
          toast.error("Enregistrement trop court");
          return;
        }
        setBusy(true);
        try {
          const base64 = await blobToBase64(blob);
          const { text } = await transcribe({ data: { audioBase64: base64, mimeType: rec.mimeType } });
          if (text) {
            onTranscribed(text);
            toast.success("Note vocale transcrite ✓");
          } else {
            toast.error("Aucun texte détecté");
          }
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Erreur transcription");
        } finally {
          setBusy(false);
        }
      };
      rec.start();
      recRef.current = rec;
      setRecording(true);
    } catch {
      toast.error("Microphone inaccessible");
    }
  };

  const stop = () => {
    recRef.current?.stop();
    setRecording(false);
  };

  if (busy) {
    return (
      <Button type="button" variant="secondary" size="sm" disabled>
        <Loader2 className="h-4 w-4 mr-1 animate-spin" />Transcription IA…
      </Button>
    );
  }
  return recording ? (
    <Button type="button" variant="destructive" size="sm" onClick={stop} className="animate-pulse">
      <Square className="h-4 w-4 mr-1" />Arrêter
    </Button>
  ) : (
    <Button type="button" variant="secondary" size="sm" onClick={start}>
      <Mic className="h-4 w-4 mr-1" />Dicter
    </Button>
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

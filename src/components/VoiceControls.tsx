import { useEffect, useRef, useState } from "react";
import { Loader2, Mic, Square, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useProfile } from "@/lib/queries";
import { speak, startRecording, transcribe, type Recorder, type VoiceGender } from "@/lib/voice";

export function useVoiceGender(): VoiceGender {
  const { data: profile } = useProfile();
  return profile?.voice_gender === "male" ? "male" : "female";
}

export function MicButton({
  onText,
  disabled,
}: {
  onText: (text: string) => void;
  disabled?: boolean;
}) {
  const [recorder, setRecorder] = useState<Recorder | null>(null);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (recorder) {
      setBusy(true);
      try {
        const blob = await recorder.stop();
        setRecorder(null);
        const text = await transcribe(blob);
        if (text) onText(text);
        else toast.error("Je n'ai rien entendu, réessayez.");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Transcription impossible.");
      } finally {
        setBusy(false);
      }
      return;
    }
    try {
      setRecorder(await startRecording());
    } catch {
      toast.error("Accès au micro refusé.");
    }
  }

  return (
    <Button
      type="button"
      variant={recorder ? "destructive" : "outline"}
      size="icon"
      aria-label={recorder ? "Arrêter l'enregistrement" : "Dicter au micro"}
      disabled={disabled || busy}
      onClick={() => void toggle()}
    >
      {busy ? (
        <Loader2 className="size-4 animate-spin" />
      ) : recorder ? (
        <Square className="size-4" />
      ) : (
        <Mic className="size-4" />
      )}
    </Button>
  );
}

export function SpeakButton({
  text,
  autoPlay = false,
  className,
  onSpeakingChange,
}: {
  text: string;
  autoPlay?: boolean;
  className?: string;
  onSpeakingChange?: (speaking: boolean) => void;
}) {
  const gender = useVoiceGender();
  const [playing, setPlaying] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const played = useRef(false);
  const notify = useRef(onSpeakingChange);
  notify.current = onSpeakingChange;

  const setSpeaking = (value: boolean) => {
    setPlaying(value);
    notify.current?.(value);
  };

  const play = async () => {
    if (!text.trim()) return;
    controller.current?.abort();
    const ac = new AbortController();
    controller.current = ac;
    setSpeaking(true);
    try {
      await speak(text, gender, ac.signal);
    } catch (e) {
      if (!ac.signal.aborted) {
        toast.error(e instanceof Error ? e.message : "Lecture vocale impossible.");
      }
    } finally {
      if (controller.current === ac) setSpeaking(false);
    }
  };

  useEffect(() => {
    if (!autoPlay || played.current || !text.trim()) return;
    played.current = true;
    void play();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay, text]);

  useEffect(() => () => controller.current?.abort(), []);

  function stop() {
    controller.current?.abort();
    controller.current = null;
    setSpeaking(false);
  }


  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={className}
      aria-label={playing ? "Arrêter la lecture" : "Écouter"}
      onClick={() => (playing ? stop() : void play())}
    >
      {playing ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
    </Button>
  );
}

import { useEffect, useRef, useState } from "react";
import { transcribeAudio, type TranscribeResult, getComfortMessage } from "@/lib/api";

type Props = {
  sessionId: string;
  disabled?: boolean;
  onTranscribed: (result: { originalText: string; correctedText: string }) => void;
  maxDurationSec?: number;
};

export default function AudioRecorder({
  sessionId,
  disabled,
  onTranscribed,
  maxDurationSec = 30,
}: Props) {
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [comfortMessage, setComfortMessage] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      stopStream();
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, []);

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  async function startRecording() {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("이 브라우저에서는 마이크 녹음이 지원되지 않습니다.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeCandidates = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg"];
      const mime = mimeCandidates.find((m) => MediaRecorder.isTypeSupported(m)) || "";
      const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = handleStop;
      recorder.start();
      recorderRef.current = recorder;
      setIsRecording(true);
      setElapsed(0);
      timerRef.current = window.setInterval(() => {
        setElapsed((s) => {
          const next = s + 1;
          if (next >= maxDurationSec) {
            stopRecording();
          }
          return next;
        });
      }, 1000);
    } catch (e) {
      console.error(e);
      setError("마이크 권한을 허용해야 녹음을 시작할 수 있습니다.");
    }
  }

  function stopRecording() {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const r = recorderRef.current;
    if (r && r.state !== "inactive") r.stop();
    setIsRecording(false);
  }

  async function handleStop() {
    stopStream();
    const blob = new Blob(chunksRef.current, { type: chunksRef.current[0]?.type || "audio/webm" });
    chunksRef.current = [];
    if (blob.size === 0) {
      setError("녹음된 오디오가 없습니다. 다시 시도해주세요.");
      return;
    }
    setIsUploading(true);
    try {
      const ext = (blob.type.split("/")[1] || "webm").split(";")[0];
      const result: TranscribeResult = await transcribeAudio(sessionId, blob, `audio.${ext}`);
      onTranscribed({ originalText: result.original_text, correctedText: result.corrected_text });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg || "음성 변환에 실패했습니다. 다시 시도해주세요.");

      // 위로글 가져오기
      try {
        const comfort = await getComfortMessage();
        setComfortMessage(comfort.message);
      } catch {
        // ignore
      }
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {!isRecording ? (
          <button
            type="button"
            onClick={startRecording}
            disabled={disabled || isUploading}
            className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white shadow disabled:cursor-not-allowed disabled:opacity-50 hover:bg-brand-600"
          >
            {isUploading ? "처리 중..." : "녹음 시작"}
          </button>
        ) : (
          <button
            type="button"
            onClick={stopRecording}
            className="rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-rose-700"
          >
            녹음 종료 ({elapsed}s)
          </button>
        )}
        {isUploading && <span className="text-xs text-slate-500">음성을 텍스트로 변환 중...</span>}
      </div>
      {error && (
        <div className="space-y-2">
          <div className="rounded border border-rose-200 bg-rose-50 p-2 text-sm text-rose-700">
            {error}
          </div>
          {comfortMessage && (
            <p className="text-xs text-emerald-700 italic">{comfortMessage}</p>
          )}
        </div>
      )}
      <p className="text-xs text-slate-400">
        한 번의 녹음은 최대 {maxDurationSec}초까지 가능합니다.
      </p>
    </div>
  );
}

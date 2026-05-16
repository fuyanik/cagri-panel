"use client";

import { useState, useEffect } from "react";
import { PlayCircle, Loader2, CheckCircle, AlertCircle, Activity } from "lucide-react";

interface ProcessButtonProps {
  onComplete: () => void;
}

export default function ProcessButton({ onComplete }: ProcessButtonProps) {
  const [starting, setStarting] = useState(false);
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Pipeline durumunu periyodik olarak kontrol et
  useEffect(() => {
    if (!pipelineRunning) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/process");
        const data = await res.json();
        if (!data.running) {
          setPipelineRunning(false);
          onComplete();
        }
        // Her kontrol sonrası çağrı listesini güncelle
        onComplete();
      } catch {
        // Sessizce geç
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [pipelineRunning, onComplete]);

  async function handleProcess() {
    setStarting(true);
    setMessage(null);
    setError(null);

    try {
      const res = await fetch("/api/process", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Bilinmeyen hata oluştu");
        return;
      }

      setMessage(data.message);
      if (data.started) {
        setPipelineRunning(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "İstek başarısız");
    } finally {
      setStarting(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        onClick={handleProcess}
        disabled={starting || pipelineRunning}
        className="inline-flex items-center gap-2 bg-[#0071E3] hover:bg-[#0077ED] disabled:bg-gray-300 text-white font-medium px-5 py-2.5 rounded-xl transition-colors duration-150 text-sm w-fit"
      >
        {starting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Başlatılıyor...
          </>
        ) : pipelineRunning ? (
          <>
            <Activity className="w-4 h-4 animate-pulse" />
            Pipeline Çalışıyor...
          </>
        ) : (
          <>
            <PlayCircle className="w-4 h-4" />
            Klasörü İşle
          </>
        )}
      </button>

      {pipelineRunning && (
        <p className="text-xs text-gray-400">
          Dosyalar arka planda işleniyor. Liste otomatik güncelleniyor (5sn).
        </p>
      )}

      {message && !pipelineRunning && (
        <div className="flex items-start gap-2 text-sm bg-green-50 border border-green-100 rounded-xl px-4 py-3">
          <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
          <span className="text-green-700">{message}</span>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 text-sm bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
          <span className="text-red-700">{error}</span>
        </div>
      )}
    </div>
  );
}

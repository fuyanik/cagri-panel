"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Zap, Loader2, CheckCircle2, XCircle, ExternalLink, Minus, StopCircle } from "lucide-react";

const COUNT_OPTIONS = [
  { label: "1", value: 1 },
  { label: "10", value: 10 },
  { label: "20", value: 20 },
  { label: "30", value: 30 },
  { label: "50", value: 50 },
  { label: "100", value: 100 },
  { label: "200", value: 200 },
  { label: "Tümü", value: -1 },
];

interface LogEntry {
  index: number;
  total: number;
  callId: string;
  fileName: string;
  score?: number;
  notEvaluable?: boolean;
  error?: string;
}

interface Props {
  folderName: string; // e.g. "20260511"
}

export default function PipelineRunner({ folderName }: Props) {
  const [selectedCount, setSelectedCount] = useState(10);
  const [running, setRunning] = useState(false);
  const [blockingFolder, setBlockingFolder] = useState<string | null>(null); // başka gün çalışıyorsa
  const [log, setLog] = useState<LogEntry[]>([]);
  const logRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Log en alta scroll
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [log]);

  // Cleanup
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const pollStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/pipeline");
      if (!res.ok) return;
      const data = await res.json();
      setLog(data.log ?? []);
      if (data.running && data.folder === folderName) {
        setRunning(true);
        setBlockingFolder(null);
      } else if (data.running && data.folder !== folderName) {
        setBlockingFolder(data.folder);
        setRunning(false);
      } else {
        setRunning(false);
        setBlockingFolder(null);
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      }
    } catch {}
  }, [folderName]);

  // Mount'ta mevcut durumu kontrol et
  useEffect(() => {
    async function checkOnMount() {
      try {
        const res = await fetch("/api/pipeline");
        if (!res.ok) return;
        const data = await res.json();
        if (data.log?.length > 0) setLog(data.log);
        if (data.running) {
          if (data.folder === folderName) {
            setRunning(true);
          } else {
            setBlockingFolder(data.folder);
          }
          pollRef.current = setInterval(pollStatus, 2500);
        }
      } catch {}
    }
    checkOnMount();
  }, [folderName, pollStatus]);

  async function handleStart() {
    setRunning(true);
    setLog([]);
    try {
      const res = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderName, count: selectedCount }),
      });
      const data = await res.json();
      if (res.status === 409) {
        setBlockingFolder(data.folder);
        setRunning(false);
        return;
      }
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(pollStatus, 2500);
    } catch {
      setRunning(false);
    }
  }

  const isDisabled = running || !!blockingFolder;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 px-5 py-5 mb-6">
      {/* Başlık + kontroller */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-4 mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-4 h-4 text-[#0071E3] shrink-0" />
            <h2 className="text-sm font-medium text-gray-700">Süreci Başlat</h2>
          </div>
          <p className="text-xs text-gray-400">
            Ses dosyasını transkript et, konuşmacıları ayır ve yönerge uygunluğunu analiz et — tek adımda.
          </p>
          {blockingFolder && (
            <p className="text-xs text-amber-600 mt-1">
              ⚠ Başka bir gün işleniyor: <span className="font-mono">{blockingFolder}</span>. O bitene kadar başlatamazsın.
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 shrink-0">
          {/* Sayı seçici */}
          <div className="flex flex-wrap items-center gap-1 bg-gray-50 rounded-xl p-1">
            {COUNT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSelectedCount(opt.value)}
                disabled={isDisabled}
                className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
                  selectedCount === opt.value
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleStart}
              disabled={isDisabled}
              className="inline-flex items-center gap-1.5 bg-[#0071E3] hover:bg-[#0077ED] disabled:bg-gray-200 disabled:text-gray-400 text-white text-xs font-medium px-4 py-2 rounded-xl transition-colors whitespace-nowrap"
            >
              {running ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" />İşleniyor...</>
              ) : (
                <><Zap className="w-3.5 h-3.5" />Süreci Başlat</>
              )}
            </button>

            {running && (
              <button
                onClick={async () => {
                  await fetch("/api/pipeline", { method: "DELETE" });
                }}
                className="inline-flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-medium px-3 py-2 rounded-xl transition-colors whitespace-nowrap"
                title="Süreci durdur"
              >
                <StopCircle className="w-3.5 h-3.5" />
                Durdur
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Log */}
      {log.length > 0 && (
        <div
          ref={logRef}
          className="max-h-52 overflow-y-auto bg-gray-50 rounded-xl px-3 py-2 flex flex-col gap-1"
        >
          {log.map((entry, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span className="text-gray-400 font-mono shrink-0 w-12">{entry.index}/{entry.total}</span>
              <span className="text-gray-600 truncate flex-1">{entry.fileName}</span>

              {/* Skor */}
              {entry.notEvaluable && (
                <span className="shrink-0 text-[11px] font-semibold text-gray-400">—</span>
              )}
              {entry.score !== undefined && !entry.notEvaluable && (
                <span className={`shrink-0 text-[11px] font-semibold ${
                  entry.score >= 80 ? "text-green-600" : entry.score >= 60 ? "text-amber-500" : "text-red-500"
                }`}>
                  {entry.score}
                </span>
              )}

              {/* İkon */}
              {entry.error && <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />}
              {entry.notEvaluable && <Minus className="w-3.5 h-3.5 text-gray-400 shrink-0" />}
              {entry.score !== undefined && !entry.notEvaluable && !entry.error && (
                entry.score >= 70
                  ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                  : <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
              )}
              {entry.score === undefined && !entry.notEvaluable && !entry.error && (
                <Loader2 className="w-3 h-3 animate-spin text-blue-400 shrink-0" />
              )}

              {/* Detay link */}
              {entry.callId && (entry.score !== undefined || entry.notEvaluable) && (
                <button
                  onClick={() => window.open(`/calls/${entry.callId}`, "_blank", "noopener,noreferrer")}
                  title="Detayı aç"
                  className="shrink-0 text-gray-300 hover:text-[#0071E3] transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}

          {running && (
            <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              Sonraki analiz bekleniyor...
            </div>
          )}
        </div>
      )}
    </div>
  );
}

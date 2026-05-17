"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ShieldCheck, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useCalls } from "@/providers/CallsProvider";

const COUNT_OPTIONS = [
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
  fileName: string;
  score?: number;
  error?: string;
}

function isLongEnough(transcript: string): boolean {
  return transcript.trim().split(/\s+/).length >= 65;
}

export default function ComplianceChecker() {
  const { calls, loading } = useCalls();
  const [selectedCount, setSelectedCount] = useState(10);
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<LogEntry[]>([]);
  const logRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const completedCalls = calls.filter((c) => c.status === "completed");
  const longEnough = completedCalls.filter((c) => c.transcript && isLongEnough(c.transcript));
  const checked = longEnough.filter((c) => c.compliance);
  const unchecked = longEnough.length - checked.length;
  const percent = longEnough.length > 0 ? Math.round((checked.length / longEnough.length) * 100) : 0;

  // Log en alta scroll et
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [log]);

  // Polling temizle
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const pollStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/compliance");
      if (!res.ok) return;
      const data = await res.json();
      setLog(data.log ?? []);
      if (!data.running) {
        setRunning(false);
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      }
    } catch {}
  }, []);

  // Mount'ta mevcut durumu kontrol et — sayfa yenilense bile sürece bağlan
  useEffect(() => {
    async function checkOnMount() {
      try {
        const res = await fetch("/api/compliance");
        if (!res.ok) return;
        const data = await res.json();
        if (data.log?.length > 0) setLog(data.log);
        if (data.running) {
          setRunning(true);
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = setInterval(pollStatus, 2000);
        }
      } catch {}
    }
    checkOnMount();
  }, [pollStatus]);

  async function handleStart() {
    setRunning(true);
    setLog([]);
    try {
      const res = await fetch("/api/compliance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: selectedCount }),
      });
      const data = await res.json();
      if (data.log?.length > 0) setLog(data.log);
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(pollStatus, 2000);
    } catch {
      setRunning(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 px-5 py-5 mb-6">
      {/* Üst satır */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-4 mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-4 h-4 text-[#0071E3] shrink-0" />
            <h2 className="text-sm font-medium text-gray-700">Yönerge Uygunluğu</h2>
          </div>
          <p className="text-xs text-gray-400">
            {loading ? "Yükleniyor..." : (
              <>
                {checked.length}/{longEnough.length} çağrı kontrol edildi
                {unchecked > 0 && ` · ${unchecked} bekliyor`}
                {" · 30sn+ olan çağrılar"}
              </>
            )}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 shrink-0">
          <div className="flex flex-wrap items-center gap-1 bg-gray-50 rounded-xl p-1">
            {COUNT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSelectedCount(opt.value)}
                disabled={running}
                className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
                  selectedCount === opt.value
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-400 hover:text-gray-600 disabled:hover:text-gray-400"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            onClick={handleStart}
            disabled={running || unchecked === 0 || loading}
            className="inline-flex items-center gap-1.5 bg-[#0071E3] hover:bg-[#0077ED] disabled:bg-gray-200 disabled:text-gray-400 text-white text-xs font-medium px-4 py-2 rounded-xl transition-colors whitespace-nowrap"
          >
            {running ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" />Analiz ediliyor...</>
            ) : (
              <><ShieldCheck className="w-3.5 h-3.5" />Uygunluğu Test Et</>
            )}
          </button>
        </div>
      </div>

      {/* Progress bar */}
      {(loading || longEnough.length > 0) && (
        <div className="mb-3">
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            {loading ? (
              <div className="h-full bg-gray-200 rounded-full animate-pulse w-1/3" />
            ) : (
              <div
                className="h-full bg-[#0071E3] rounded-full transition-all duration-500"
                style={{ width: `${percent}%` }}
              />
            )}
          </div>
          <p className="text-[10px] text-gray-400 mt-1">
            {loading ? "Veriler yükleniyor..." : `${percent}% tamamlandı`}
          </p>
        </div>
      )}

      {/* Canlı log */}
      {log.length > 0 && (
        <div
          ref={logRef}
          className="mt-2 max-h-40 overflow-y-auto bg-gray-50 rounded-xl px-3 py-2 flex flex-col gap-1"
        >
          {log.map((entry, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span className="text-gray-400 font-mono shrink-0 w-12">
                {entry.index}/{entry.total}
              </span>
              <span className="text-gray-600 truncate flex-1">{entry.fileName}</span>
              {entry.score !== undefined && (
                <span className={`shrink-0 font-semibold ${
                  entry.score >= 80 ? "text-green-600" : entry.score >= 60 ? "text-amber-500" : "text-red-500"
                }`}>
                  {entry.score}
                </span>
              )}
              {entry.score !== undefined && (
                entry.score >= 70
                  ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                  : <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
              )}
              {entry.error && <span className="text-red-400 shrink-0">hata</span>}
              {entry.score === undefined && !entry.error && (
                <Loader2 className="w-3 h-3 animate-spin text-blue-400 shrink-0" />
              )}
            </div>
          ))}
          {running && (
            <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Sonraki analiz bekleniyor...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

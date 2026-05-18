"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Zap, Loader2, CheckCircle2, XCircle, ExternalLink, Minus, StopCircle, ChevronDown, ChevronRight } from "lucide-react";

const COUNT_OPTIONS = [
  { label: "1", value: 1 },
  { label: "3", value: 3 },
  { label: "5", value: 5 },
  { label: "10", value: 10 },
  { label: "20", value: 20 },
  { label: "50", value: 50 },
  { label: "100", value: 100 },
  { label: "200", value: 200 },
  { label: "Tümü", value: -1 },
];

interface StepInfo {
  label: string;
  status: "waiting" | "running" | "done" | "error";
  detail?: string;
}

interface LogEntry {
  index: number;
  total: number;
  callId: string;
  fileName: string;
  steps: StepInfo[];
  score?: number;
  notEvaluable?: boolean;
  error?: string;
  step2Tokens?: number;
  step3Tokens?: number;
}

function shortFileName(name: string): string {
  const parts = name.split("-");
  if (parts.length >= 2) return parts.slice(0, 2).join("-") + "-";
  return name;
}

function fmtTokens(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

interface Props {
  folderName: string;
}

function StepRow({ step }: { step: StepInfo }) {
  return (
    <div className="flex items-center gap-2 text-[11px] py-0.5">
      <span className="w-3 shrink-0 flex justify-center">
        {step.status === "running" && <Loader2 className="w-2.5 h-2.5 animate-spin text-blue-400" />}
        {step.status === "done" && <CheckCircle2 className="w-2.5 h-2.5 text-green-500" />}
        {step.status === "error" && <XCircle className="w-2.5 h-2.5 text-red-400" />}
        {step.status === "waiting" && <span className="w-2 h-2 rounded-full bg-gray-200 inline-block" />}
      </span>
      <span className={`${
        step.status === "done" ? "text-gray-500" :
        step.status === "running" ? "text-blue-600 font-medium" :
        step.status === "error" ? "text-red-500" :
        "text-gray-300"
      }`}>
        {step.label}
      </span>
      {step.detail && (
        <span className={`ml-auto shrink-0 ${step.status === "error" ? "text-red-400" : "text-gray-400"} truncate max-w-[120px]`}>
          {step.detail}
        </span>
      )}
    </div>
  );
}

function LogRow({ entry }: { entry: LogEntry }) {
  const [expanded, setExpanded] = useState(false);

  const isRunning = entry.steps.some((s) => s.status === "running");
  const isDone = entry.score !== undefined || entry.notEvaluable === true;
  const hasError = !!entry.error;

  // Auto-expand while running, collapse when done
  useEffect(() => {
    if (isRunning) setExpanded(true);
    if (isDone || hasError) setExpanded(false);
  }, [isRunning, isDone, hasError]);

  return (
    <div className="border border-gray-100 rounded-lg overflow-hidden">
      {/* Header row */}
      <button
        onClick={() => setExpanded((p) => !p)}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-50 transition-colors text-left"
      >
        <span className="text-gray-400 font-mono shrink-0 w-10 text-[11px]">
          {entry.index}/{entry.total}
        </span>

        <span className="text-gray-600 truncate flex-1 min-w-0 font-mono">{shortFileName(entry.fileName)}</span>

        {/* Token rozetleri */}
        {entry.step2Tokens !== undefined && (
          <span className="shrink-0 text-[10px] font-medium bg-violet-50 text-violet-500 rounded-md px-1.5 py-0.5">
            S2 {fmtTokens(entry.step2Tokens)}
          </span>
        )}
        {entry.step3Tokens !== undefined && (
          <span className="shrink-0 text-[10px] font-medium bg-sky-50 text-sky-500 rounded-md px-1.5 py-0.5">
            S3 {fmtTokens(entry.step3Tokens)}
          </span>
        )}

        {/* Durum ikonu */}
        <span className="shrink-0 ml-1">
          {hasError && <XCircle className="w-3.5 h-3.5 text-red-400" />}
          {entry.notEvaluable && !hasError && <Minus className="w-3.5 h-3.5 text-gray-400" />}
          {isDone && !entry.notEvaluable && !hasError && (
            entry.score! >= 70
              ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
              : <XCircle className="w-3.5 h-3.5 text-red-400" />
          )}
          {!isDone && !hasError && isRunning && (
            <Loader2 className="w-3 h-3 animate-spin text-blue-400" />
          )}
        </span>

        {/* Skor */}
        {entry.notEvaluable && !hasError && (
          <span className="text-[11px] font-semibold text-gray-400 shrink-0">—</span>
        )}
        {entry.score !== undefined && !entry.notEvaluable && !hasError && (
          <span className={`text-[11px] font-semibold shrink-0 ${
            entry.score >= 80 ? "text-green-600" : entry.score >= 60 ? "text-amber-500" : "text-red-500"
          }`}>
            {entry.score}
          </span>
        )}

        {/* Detay linki */}
        {entry.callId && isDone && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              window.open(`/calls/${entry.callId}`, "_blank", "noopener,noreferrer");
            }}
            title="Detayı aç"
            className="shrink-0 text-gray-300 hover:text-[#0071E3] transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
          </button>
        )}

        {/* Expand toggle */}
        <span className="shrink-0 text-gray-300">
          {expanded
            ? <ChevronDown className="w-3.5 h-3.5" />
            : <ChevronRight className="w-3.5 h-3.5" />
          }
        </span>
      </button>

      {/* Adımlar */}
      {expanded && (
        <div className="px-4 pb-2.5 pt-0.5 bg-gray-50 border-t border-gray-100">
          {entry.steps?.map((step, si) => (
            <StepRow key={si} step={step} />
          ))}
          {hasError && (
            <p className="text-[11px] text-red-400 mt-1 break-words">{entry.error}</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function PipelineRunner({ folderName }: Props) {
  const [selectedCount, setSelectedCount] = useState(10);
  const [running, setRunning] = useState(false);
  const [blockingFolder, setBlockingFolder] = useState<string | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);
  const logRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [log]);

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

  useEffect(() => {
    async function checkOnMount() {
      try {
        const res = await fetch("/api/pipeline");
        if (!res.ok) return;
        const data = await res.json();
        if (data.log?.length > 0) setLog(data.log);
        if (data.running) {
          if (data.folder === folderName) setRunning(true);
          else setBlockingFolder(data.folder);
          pollRef.current = setInterval(pollStatus, 2000);
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
      pollRef.current = setInterval(pollStatus, 2000);
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
            Gemini ses→transkript+atama · Gemini yönerge analizi
          </p>
          {blockingFolder && (
            <p className="text-xs text-amber-600 mt-1">
              ⚠ Başka bir gün işleniyor: <span className="font-mono">{blockingFolder}</span>
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 shrink-0">
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
                onClick={async () => { await fetch("/api/pipeline", { method: "DELETE" }); }}
                className="inline-flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-medium px-3 py-2 rounded-xl transition-colors whitespace-nowrap"
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
          className="max-h-80 overflow-y-auto flex flex-col gap-1 pr-1"
        >
          {log.map((entry, i) => (
            <div key={i} className="shrink-0">
              <LogRow entry={entry} />
            </div>
          ))}

          {running && (
            <div className="flex items-center gap-2 text-xs text-gray-400 px-1 py-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              Sonraki dosya bekleniyor...
            </div>
          )}
        </div>
      )}
    </div>
  );
}

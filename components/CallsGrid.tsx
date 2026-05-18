"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, Clock, Loader2, FileAudio, Bookmark, ExternalLink, RotateCcw } from "lucide-react";
import { useState } from "react";
import type { CallRecord } from "@/lib/types";

interface CallsGridProps {
  calls: CallRecord[];
  startIndex?: number;
}

const statusConfig = {
  completed: {
    label: "Tamamlandı",
    icon: CheckCircle2,
    className: "text-green-600 bg-green-50",
  },
  error: {
    label: "Hata",
    icon: XCircle,
    className: "text-red-500 bg-red-50",
  },
  processing: {
    label: "İşleniyor",
    icon: Loader2,
    className: "text-blue-500 bg-blue-50",
  },
  pending: {
    label: "Bekliyor",
    icon: Clock,
    className: "text-gray-400 bg-gray-50",
  },
};

function StatusBadge({ status }: { status: CallRecord["status"] }) {
  const config = statusConfig[status];
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${config.className}`}>
      <Icon className={`w-3 h-3 ${status === "processing" ? "animate-spin" : ""}`} />
      <span className="hidden sm:inline">{config.label}</span>
    </span>
  );
}

const AGENT_COLORS = [
  "text-blue-600",
  "text-violet-600",
  "text-emerald-600",
  "text-rose-600",
  "text-amber-600",
  "text-cyan-600",
  "text-pink-600",
  "text-teal-600",
];

function agentColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AGENT_COLORS[Math.abs(hash) % AGENT_COLORS.length];
}

function estimateDuration(call: CallRecord): string | null {
  // Önce kayıtlı saniye değerine bak
  const seconds = call.estimatedDurationSeconds ?? (() => {
    const text = call.transcript || (call.transcriptLines?.map((l) => l.text).join(" ") ?? "");
    if (text.length < 10) return null;
    return Math.round((text.trim().split(/\s+/).length / 130) * 60);
  })();

  if (!seconds) return null;
  if (seconds < 60) return `~${seconds}sn`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `~${mins}dk ${secs}sn` : `~${mins}dk`;
}

function formatCheckedAt(checkedAt: unknown): string {
  if (!checkedAt) return "";
  let date: Date | null = null;
  if (checkedAt instanceof Date) {
    date = checkedAt;
  } else if (
    typeof checkedAt === "object" &&
    checkedAt !== null &&
    "seconds" in checkedAt
  ) {
    date = new Date((checkedAt as { seconds: number }).seconds * 1000);
  }
  if (!date || isNaN(date.getTime())) return "";
  const months = ["Oca","Şub","Mar","Nis","May","Haz","Tem","Ağu","Eyl","Eki","Kas","Ara"];
  const d = date.getDate();
  const m = months[date.getMonth()];
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${d} ${m} ${hh}:${mm}:${ss}`;
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

function formatFolderDate(dateStr: string): string {
  if (!dateStr || dateStr.length !== 8) return dateStr;
  const year = parseInt(dateStr.slice(0, 4));
  const month = parseInt(dateStr.slice(4, 6)) - 1;
  const day = parseInt(dateStr.slice(6, 8));
  return new Date(year, month, day).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function CallCard({ call, index }: { call: CallRecord; index: number }) {
  const router = useRouter();
  const isClickable = call.status === "completed";
  const duration = estimateDuration(call);
  const isEven = index % 2 === 0;
  const [saved, setSaved] = useState(!!call.saved);
  const [saving, setSaving] = useState(false);

  async function toggleSave(e: React.MouseEvent) {
    e.stopPropagation();
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/calls/${call.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ saved: !saved }),
      });
      if (res.ok) setSaved((v) => !v);
    } catch {}
    finally { setSaving(false); }
  }

  function handleRowClick() {
    if (isClickable) router.push(`/calls/${call.id}`);
  }

  return (
    <div
      onClick={handleRowClick}
      className={`flex items-center gap-4 px-4 py-3.5 border-b border-gray-100 last:border-0 transition-all duration-200 ${
        isEven ? "bg-white" : "bg-gray-100/70"
      } ${isClickable ? "hover:bg-blue-50 cursor-pointer" : ""}`}
    >
      {/* Sıra numarası */}
      <span className="text-xs text-gray-500 font-mono w-7 shrink-0 text-right select-none">
        {index}
      </span>

      {/* İkon — mobilde gizle */}
      <div className="w-8 h-8 rounded-xl bg-blue-50 items-center justify-center shrink-0 hidden sm:flex">
        <FileAudio className="w-4 h-4 text-[#0071E3]" />
      </div>

      {/* Dosya adı + asistan adı + token rozetleri + hata */}
      <div className="min-w-0 flex-1">
        <p
          className="text-sm font-medium text-gray-900 font-mono truncate"
          title={call.fileName}
        >
          {shortFileName(call.fileName)}
        </p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {call.agentName && (
            <span className={`text-[11px] font-medium ${agentColor(call.agentName)}`}>
              {call.agentName}
            </span>
          )}
          {call.step2Tokens !== undefined && (
            <span className="text-[10px] font-medium bg-violet-50 text-violet-500 rounded-md px-1.5 py-0.5 shrink-0">
              S2 {fmtTokens(call.step2Tokens)}
            </span>
          )}
          {call.step3Tokens !== undefined && (
            <span className="text-[10px] font-medium bg-sky-50 text-sky-500 rounded-md px-1.5 py-0.5 shrink-0">
              S3 {fmtTokens(call.step3Tokens)}
            </span>
          )}
          {call.errorMessage && (
            <p className="text-xs text-red-400 line-clamp-1">{call.errorMessage}</p>
          )}
        </div>
      </div>

      {/* Süre */}
      {duration && (
        <span className="text-xs text-gray-400 shrink-0 w-16 text-right">{duration}</span>
      )}

      {/* Tarih */}
      <span className="text-xs text-gray-400 shrink-0 text-right hidden sm:block">
        {formatFolderDate(call.folderDate)}
      </span>

      {/* Uygunluk skoru + analiz saati */}
      {call.compliance && (
        <div className="shrink-0 flex flex-col items-end gap-0.5">
          {call.compliance.notEvaluable ? (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">
              —
            </span>
          ) : (
            <span
              className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                call.compliance.score >= 80
                  ? "bg-green-50 text-green-600"
                  : call.compliance.score >= 60
                  ? "bg-amber-50 text-amber-600"
                  : "bg-red-50 text-red-500"
              }`}
            >
              {call.compliance.score}
            </span>
          )}
          {(() => {
            const t = formatCheckedAt(call.compliance.checkedAt);
            return t ? (
              <span className="text-[10px] text-gray-400 hidden sm:block leading-none">
                {t}
              </span>
            ) : null;
          })()}
        </div>
      )}

      {/* Durum */}
      <StatusBadge status={call.status} />

      {/* Hatalıysa tekrar dene */}
      {call.status === "error" && (
        <button
          onClick={async (e) => {
            e.stopPropagation();
            await fetch("/api/retry", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ callId: call.id }),
            });
          }}
          title="Tekrar dene"
          className="shrink-0 p-1.5 rounded-lg text-red-300 hover:text-red-500 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      )}

      {/* Yeni sekmede aç — mobilde gizle */}
      {isClickable && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            window.open(`/calls/${call.id}`, "_blank", "noopener,noreferrer");
          }}
          title="Yeni sekmede aç"
          className="shrink-0 p-1.5 rounded-lg text-gray-300 hover:text-gray-500 transition-colors hidden sm:block"
        >
          <ExternalLink className="w-4 h-4" />
        </button>
      )}

      {/* Kaydet butonu */}
      <button
        onClick={toggleSave}
        disabled={saving}
        title={saved ? "Kaydı kaldır" : "Kaydet"}
        className={`shrink-0 p-1.5 rounded-lg transition-colors ${
          saved
            ? "text-[#0071E3]"
            : "text-gray-300 hover:text-gray-500"
        }`}
      >
        <Bookmark
          className="w-4 h-4"
          fill={saved ? "currentColor" : "none"}
        />
      </button>
    </div>
  );
}

export default function CallsGrid({ calls, startIndex }: CallsGridProps) {
  if (calls.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-sm">Henüz işlenmiş çağrı yok.</p>
        <p className="text-xs mt-1">Klasörü İşle butonuna basarak başlat.</p>
      </div>
    );
  }

  const base = startIndex ?? calls.length;

  return (
    <div className="flex flex-col">
      {calls.map((call, i) => (
        <CallCard key={call.id} call={call} index={base - i} />
      ))}
    </div>
  );
}

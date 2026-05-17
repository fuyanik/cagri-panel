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

function estimateDuration(call: CallRecord): string | null {
  // 1. Önce dosya boyutundan dene
  if (call.fileSizeBytes && call.fileSizeBytes > 0) {
    const seconds = Math.round(call.fileSizeBytes / 16000);
    if (seconds < 60) return `~${seconds}sn`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `~${mins}dk ${secs}sn` : `~${mins}dk`;
  }

  // 2. Transkript satır/kelime sayısından tahmin et
  // Ortalama Türkçe konuşma: ~130 kelime/dk
  const text = call.transcript || 
    (call.transcriptLines?.map((l) => l.text).join(" ") ?? "");
  
  if (text.length < 10) return null;

  const wordCount = text.trim().split(/\s+/).length;
  const estimatedSeconds = Math.round((wordCount / 130) * 60);

  if (estimatedSeconds < 60) return `~${estimatedSeconds}sn`;
  const mins = Math.floor(estimatedSeconds / 60);
  const secs = estimatedSeconds % 60;
  return secs > 0 ? `~${mins}dk ${secs}sn` : `~${mins}dk`;
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

      {/* Dosya adı + hata */}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900 truncate">{call.fileName}</p>
        {call.errorMessage && (
          <p className="text-xs text-red-400 line-clamp-1 mt-0.5">{call.errorMessage}</p>
        )}
      </div>

      {/* Süre */}
      {duration && (
        <span className="text-xs text-gray-400 shrink-0 w-16 text-right">{duration}</span>
      )}

      {/* Tarih */}
      <span className="text-xs text-gray-400 shrink-0 text-right hidden sm:block">
        {formatFolderDate(call.folderDate)}
      </span>

      {/* Uygunluk skoru */}
      {call.compliance && (
        <span
          className={`shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
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

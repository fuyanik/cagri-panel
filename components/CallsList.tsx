"use client";

import Link from "next/link";
import { ChevronRight, CheckCircle2, XCircle, Clock, Loader2 } from "lucide-react";
import type { CallRecord } from "@/lib/types";

interface CallsListProps {
  calls: CallRecord[];
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
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${config.className}`}
    >
      <Icon className={`w-3 h-3 ${status === "processing" ? "animate-spin" : ""}`} />
      {config.label}
    </span>
  );
}

export default function CallsList({ calls }: CallsListProps) {
  if (calls.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-sm">Henüz işlenmiş çağrı yok.</p>
        <p className="text-xs mt-1">Klasörü İşle butonuna basarak başlat.</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-50">
      {calls.map((call) => (
        <div
          key={call.id}
          className="flex items-center gap-4 py-4 group"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 mb-1">
              <span className="text-sm font-medium text-gray-900 truncate">
                {call.fileName}
              </span>
              <StatusBadge status={call.status} />
            </div>
            {call.summary && (
              <p className="text-xs text-gray-400 line-clamp-2">{call.summary}</p>
            )}
            {call.errorMessage && (
              <p className="text-xs text-red-400 line-clamp-1">{call.errorMessage}</p>
            )}
          </div>

          <div className="text-xs text-gray-300 shrink-0 text-right">
            {call.folderDate}
          </div>

          {call.status === "completed" && (
            <Link
              href={`/calls/${call.id}`}
              className="shrink-0 text-gray-300 hover:text-[#0071E3] transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </Link>
          )}
        </div>
      ))}
    </div>
  );
}

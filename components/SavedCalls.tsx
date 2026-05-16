"use client";

import Link from "next/link";
import { Bookmark, ChevronRight } from "lucide-react";
import type { CallRecord } from "@/lib/types";

interface SavedCallsProps {
  calls: CallRecord[];
}

export default function SavedCalls({ calls }: SavedCallsProps) {
  const saved = calls.filter((c) => c.saved && c.status === "completed");

  if (saved.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 px-6 py-2 mb-6">
      <div className="flex items-center gap-2 py-3 mb-1">
        <Bookmark className="w-4 h-4 text-[#0071E3]" fill="currentColor" />
        <h2 className="text-sm font-medium text-gray-700">Kaydedilenler</h2>
        <span className="ml-auto text-xs text-gray-300">{saved.length}</span>
      </div>

      <div className="divide-y divide-gray-50">
        {saved.map((call) => (
          <div key={call.id} className="flex items-center gap-4 py-3.5 group">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 truncate">{call.fileName}</p>
              {call.summary && (
                <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">{call.summary}</p>
              )}
            </div>
            <span className="text-xs text-gray-300 shrink-0">{call.folderDate}</span>
            <Link
              href={`/calls/${call.id}`}
              className="shrink-0 text-gray-300 hover:text-[#0071E3] transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

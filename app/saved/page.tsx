"use client";

import Link from "next/link";
import { ArrowLeft, Bookmark } from "lucide-react";
import CallsGrid from "@/components/CallsGrid";
import { useCalls } from "@/providers/CallsProvider";

export default function SavedPage() {
  const { calls, loading, error } = useCalls();
  const saved = calls.filter((c) => c.saved);

  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      <div className="max-w-5xl mx-auto px-6 py-12">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Dashboard
        </Link>

        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <Bookmark className="w-5 h-5 text-[#0071E3]" fill="currentColor" />
            <h1 className="text-3xl font-semibold text-gray-900 tracking-tight">Kaydedilenler</h1>
          </div>
          <p className="text-sm text-gray-400">{saved.length} kaydedilmiş çağrı</p>
        </div>

        {loading ? (
          <div className="text-center py-16 text-sm text-gray-300">Yükleniyor...</div>
        ) : error ? (
          <div className="text-center py-16">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        ) : saved.length === 0 ? (
          <div className="text-center py-16">
            <Bookmark className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">Henüz kaydedilen çağrı yok.</p>
            <p className="text-xs text-gray-300 mt-1">
              Çağrı detay sayfasındaki bookmark ikonuna tıklayarak kayıt ekleyebilirsin.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <CallsGrid calls={saved} />
          </div>
        )}
      </div>
    </div>
  );
}

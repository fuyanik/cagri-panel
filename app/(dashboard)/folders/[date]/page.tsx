"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Bookmark, RotateCcw, ArrowDownUp, ArrowUp, ArrowDown, X } from "lucide-react";
import StatsCards from "@/components/StatsCards";
import CallsGrid from "@/components/CallsGrid";
import PipelineRunner from "@/components/PipelineRunner";
import { useCalls } from "@/providers/CallsProvider";
import { useFolders } from "@/providers/FoldersProvider";
import type { CallRecord } from "@/lib/types";

type ComplianceSort = null | "asc" | "desc";

function formatDate(yyyymmdd: string): { date: string; dayName: string } {
  const year = parseInt(yyyymmdd.slice(0, 4));
  const month = parseInt(yyyymmdd.slice(4, 6)) - 1;
  const day = parseInt(yyyymmdd.slice(6, 8));
  const d = new Date(year, month, day);
  const date = d.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
  const dayName = d.toLocaleDateString("tr-TR", { weekday: "long" });
  return { date, dayName: dayName.charAt(0).toUpperCase() + dayName.slice(1) };
}

export default function FolderDetailPage() {
  const params = useParams();
  const dateParam = params.date as string;
  const { calls, loading, error } = useCalls();
  const { getFolderDetail, folderDetailLoading, loadFolderDetail } = useFolders();

  // Cache'ten oku, yoksa yükle (bir kez)
  useEffect(() => {
    loadFolderDetail(dateParam);
  }, [dateParam, loadFolderDetail]);

  const folderDetail = getFolderDetail(dateParam);
  const wavLoading = folderDetailLoading(dateParam);
  const wavCount = folderDetail?.wavCount ?? null;

  const [complianceSort, setComplianceSort] = useState<ComplianceSort>(() => {
    if (typeof window === "undefined") return null;
    const saved = localStorage.getItem("complianceSort");
    return (saved === "asc" || saved === "desc") ? saved : null;
  });

  // Sadece bu günün çağrılarını filtrele
  const dayCalls = calls.filter((c) => c.folderDate === dateParam);
  const queuedCalls = dayCalls.filter((c) => c.status === "pending");
  const processingCalls = dayCalls.filter((c) => c.status === "processing");
  const doneCalls = dayCalls.filter((c) => c.status === "completed" || c.status === "error");
  const savedCount = dayCalls.filter((c) => c.saved).length;

  const sortedDoneCalls: CallRecord[] = complianceSort
    ? [...doneCalls].sort((a, b) => {
        const scoreA = a.compliance?.score ?? (complianceSort === "asc" ? 999 : -1);
        const scoreB = b.compliance?.score ?? (complianceSort === "asc" ? 999 : -1);
        return complianceSort === "asc" ? scoreA - scoreB : scoreB - scoreA;
      })
    : doneCalls;

  function cycleSort() {
    setComplianceSort((v) => {
      const next = v === null ? "asc" : v === "asc" ? "desc" : null;
      if (next === null) localStorage.removeItem("complianceSort");
      else localStorage.setItem("complianceSort", next);
      return next;
    });
  }

  const { date, dayName } = formatDate(dateParam);

  return (
    <div className="overflow-x-hidden">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Back */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 bg-white shadow-sm hover:shadow px-3.5 py-2 rounded-xl transition-all cursor-pointer mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Ana Sayfaya Geri Dön
        </Link>

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 tracking-tight">{dayName}</h1>
            <p className="text-sm text-gray-400 mt-1">{date}</p>
          </div>
          <Link
            href="/saved"
            className="inline-flex items-center gap-2 bg-white border border-gray-100 hover:border-gray-200 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-700 transition-colors"
          >
            <Bookmark className={`w-4 h-4 ${savedCount > 0 ? "text-[#0071E3]" : "text-gray-400"}`} fill={savedCount > 0 ? "currentColor" : "none"} />
            Kaydedilenler
            {savedCount > 0 && (
              <span className="bg-[#0071E3] text-white text-[11px] font-semibold px-1.5 py-0.5 rounded-full leading-none">
                {savedCount}
              </span>
            )}
          </Link>
        </div>

        {/* Stats */}
        <div className="mb-8">
          <StatsCards calls={dayCalls} wavTotal={wavCount} wavLoading={wavLoading} />
        </div>

        {/* Birleşik Pipeline */}
        <PipelineRunner folderName={dateParam} />

        {loading ? (
          <div className="py-12 text-center text-sm text-gray-300">Yükleniyor...</div>
        ) : error ? (
          <div className="py-12 text-center text-sm text-red-400">{error}</div>
        ) : (
          <>
            {/* Sıradaki */}
            {queuedCalls.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-6">
                <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-medium text-gray-700">Sıradaki Çağrılar</h2>
                    <span className="text-[11px] bg-gray-100 text-gray-500 font-medium px-2 py-0.5 rounded-full">{queuedCalls.length}</span>
                  </div>
                </div>
                <div className="overflow-y-auto" style={{ maxHeight: "30vh" }}>
                  <CallsGrid calls={queuedCalls} startIndex={doneCalls.length + processingCalls.length + queuedCalls.length} />
                </div>
              </div>
            )}

            {/* İşleniyor */}
            {processingCalls.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-6">
                <div className="flex items-center gap-2 px-4 sm:px-6 py-3 border-b border-gray-100">
                  <h2 className="text-sm font-medium text-gray-700">İşleniyor</h2>
                  <span className="text-[11px] bg-blue-50 text-blue-500 font-medium px-2 py-0.5 rounded-full">{processingCalls.length}</span>
                </div>
                <div className="overflow-y-auto" style={{ maxHeight: "30vh" }}>
                  <CallsGrid calls={processingCalls} startIndex={doneCalls.length + processingCalls.length} />
                </div>
              </div>
            )}

            {/* Tamamlanan */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <h2 className="text-xs sm:text-sm font-medium text-gray-700">Tamamlanan</h2>
                  <span className="text-[10px] sm:text-[11px] bg-green-50 text-green-600 font-medium px-1.5 sm:px-2 py-0.5 rounded-full hidden sm:inline">
                    {doneCalls.filter(c => c.status === "completed").length}
                  </span>
                  {doneCalls.filter(c => c.status === "error").length > 0 && (
                    <span className="text-[10px] sm:text-[11px] bg-red-50 text-red-500 font-medium px-1.5 sm:px-2 py-0.5 rounded-full">
                      {doneCalls.filter(c => c.status === "error").length} hata
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={cycleSort}
                      className={`inline-flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs font-medium px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl transition-colors ${
                        complianceSort ? "bg-[#0071E3] text-white" : "bg-gray-50 text-gray-400 hover:text-gray-600"
                      }`}
                    >
                      {complianceSort === "asc" ? <ArrowUp className="w-3.5 h-3.5" /> : complianceSort === "desc" ? <ArrowDown className="w-3.5 h-3.5" /> : <ArrowDownUp className="w-3.5 h-3.5" />}
                      Yönerge Skoru
                    </button>
                    {complianceSort && (
                      <button onClick={() => setComplianceSort(null)} className="p-1.5 rounded-xl bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  {doneCalls.filter(c => c.status === "error").length > 0 && (
                    <button
                      onClick={async () => {
                        await fetch("/api/retry", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
                      }}
                      className="inline-flex items-center gap-1.5 text-xs text-red-400 hover:text-red-600 transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Tüm hataları tekrar dene</span>
                    </button>
                  )}
                </div>
              </div>
              <CallsGrid calls={sortedDoneCalls} startIndex={doneCalls.length} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { Bookmark, RotateCcw, ArrowDownUp, ArrowUp, ArrowDown, X, LogOut, User } from "lucide-react";
import StatsCards from "@/components/StatsCards";
import CallsGrid from "@/components/CallsGrid";
import ProcessButton from "@/components/ProcessButton";
import ComplianceChecker from "@/components/ComplianceChecker";
import { useCalls } from "@/providers/CallsProvider";
import { useAuth } from "@/providers/AuthProvider";
import { signOut, sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase-client";
import type { CallRecord } from "@/lib/types";

type ComplianceSort = null | "asc" | "desc";

export default function Dashboard() {
  const { calls, loading, error } = useCalls();
  const { user } = useAuth();
  const [complianceSort, setComplianceSort] = useState<ComplianceSort>(() => {
    if (typeof window === "undefined") return null;
    const saved = localStorage.getItem("complianceSort");
    return (saved === "asc" || saved === "desc") ? saved : null;
  });
  const [resetSent, setResetSent] = useState(false);

  async function handlePasswordReset() {
    if (!user?.email) return;
    try {
      await sendPasswordResetEmail(auth, user.email);
      setResetSent(true);
      setTimeout(() => setResetSent(false), 4000);
    } catch (err) {
      console.error(err);
    }
  }

  const savedCount = calls.filter((c) => c.saved).length;
  const queuedCalls = calls.filter((c) => c.status === "pending");
  const processingCalls = calls.filter((c) => c.status === "processing");
  const doneCalls = calls.filter((c) => c.status === "completed" || c.status === "error");

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

  return (
    <div className="min-h-screen bg-[#F5F5F7] overflow-x-hidden">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Header — mobilde dikey, masaüstünde yatay */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8 sm:mb-10">
          {/* Üst satır: kullanıcı + çıkış */}
          <div className="flex items-center justify-between sm:justify-start gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#0071E3] flex items-center justify-center shrink-0">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 truncate max-w-[180px] sm:max-w-none">{user?.email}</p>
                <button
                  onClick={handlePasswordReset}
                  className="text-xs text-[#0071E3] hover:underline mt-0.5"
                >
                  {resetSent ? "✓ Link gönderildi" : "Şifre değiştir"}
                </button>
              </div>
            </div>
            {/* Çıkış — sadece mobilde burada */}
            <button
              onClick={() => signOut(auth)}
              className="sm:hidden p-2 bg-white border border-gray-100 rounded-xl text-gray-400"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          {/* Kaydedilenler + Çıkış (masaüstü) */}
          <div className="flex items-center gap-3">
            <Link
              href="/saved"
              className="inline-flex items-center gap-2 bg-white border border-gray-100 hover:border-gray-200 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-700 transition-colors"
            >
              <Bookmark className="w-4 h-4 text-[#0071E3]" fill={savedCount > 0 ? "currentColor" : "none"} />
              Kaydedilenler
              {savedCount > 0 && (
                <span className="bg-[#0071E3] text-white text-[11px] font-semibold px-1.5 py-0.5 rounded-full leading-none">
                  {savedCount}
                </span>
              )}
            </Link>
            <button
              onClick={() => signOut(auth)}
              title="Çıkış yap"
              className="hidden sm:block p-2.5 bg-white border border-gray-100 hover:border-gray-200 rounded-xl text-gray-400 hover:text-gray-600 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-8">
          <StatsCards calls={calls} />
        </div>

        {/* Compliance */}
        <ComplianceChecker />

        {/* Process */}
        <div className="bg-white rounded-2xl border border-gray-100 px-6 py-5 mb-6">
          <h2 className="text-sm font-medium text-gray-700 mb-3">İşlem</h2>
          <ProcessButton onComplete={() => {}} />
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-gray-300">Yükleniyor...</div>
        ) : error ? (
          <div className="py-12 text-center text-sm text-red-400">{error}</div>
        ) : (
          <>
            {/* Sıradaki Çağrılar - pending */}
            {queuedCalls.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-6">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-medium text-gray-700">Sıradaki Çağrılar</h2>
                    <span className="text-[11px] bg-gray-100 text-gray-500 font-medium px-2 py-0.5 rounded-full">
                      {queuedCalls.length}
                    </span>
                  </div>
                  <span className="text-xs text-gray-300">Bekliyor</span>
                </div>
                <div className="overflow-y-auto" style={{ maxHeight: "30vh" }}>
                  <CallsGrid calls={queuedCalls} startIndex={doneCalls.length + processingCalls.length + queuedCalls.length} />
                </div>
              </div>
            )}

            {/* Gelecek Çağrılar - processing */}
            {processingCalls.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-6">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-medium text-gray-700">İşleniyor</h2>
                    <span className="text-[11px] bg-blue-50 text-blue-500 font-medium px-2 py-0.5 rounded-full">
                      {processingCalls.length}
                    </span>
                  </div>
                  <span className="text-xs text-gray-300">Gerçek zamanlı</span>
                </div>
                <div className="overflow-y-auto" style={{ maxHeight: "30vh" }}>
                  <CallsGrid calls={processingCalls} startIndex={doneCalls.length + processingCalls.length} />
                </div>
              </div>
            )}

            {/* Tamamlanan Çağrılar */}
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
                  {/* Yönerge skoruna göre sırala — 3 mod: off → kötüden iyiye → iyiden kötüye */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={cycleSort}
                      className={`inline-flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs font-medium px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl transition-colors ${
                        complianceSort
                          ? "bg-[#0071E3] text-white"
                          : "bg-gray-50 text-gray-400 hover:text-gray-600"
                      }`}
                    >
                      {complianceSort === "asc" ? (
                        <ArrowUp className="w-3.5 h-3.5" />
                      ) : complianceSort === "desc" ? (
                        <ArrowDown className="w-3.5 h-3.5" />
                      ) : (
                        <ArrowDownUp className="w-3.5 h-3.5" />
                      )}
                      Yönerge Skoru
                      {complianceSort === "asc" && " ↑"}
                      {complianceSort === "desc" && " ↓"}
                    </button>
                    {complianceSort && (
                      <button
                        onClick={() => setComplianceSort(null)}
                        className="p-1.5 rounded-xl bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                        title="Sıralamayı kaldır"
                      >
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
                      Tüm hataları tekrar dene
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

"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowUpDown, ArrowUp, ArrowDown, XCircle } from "lucide-react";
import { useCalls } from "@/providers/CallsProvider";
import type { CallRecord } from "@/lib/types";

function getFolderLabel(folderDate: string) {
  const year = parseInt(folderDate.slice(0, 4));
  const month = parseInt(folderDate.slice(4, 6)) - 1;
  const day = parseInt(folderDate.slice(6, 8));
  const d = new Date(year, month, day);
  const dayName = d.toLocaleDateString("tr-TR", { weekday: "long" });
  const dateName = d.toLocaleDateString("tr-TR", { day: "numeric", month: "long" });
  return `${dateName} ${dayName.charAt(0).toUpperCase() + dayName.slice(1)}`;
}

function checkedAtSeconds(checkedAt: unknown): number {
  if (!checkedAt) return 0;
  const raw = checkedAt as Record<string, unknown>;
  if (typeof raw.seconds === "number") return raw.seconds;
  if (typeof checkedAt === "string") return new Date(checkedAt).getTime() / 1000;
  return 0;
}

function sortScore(c: CallRecord): number {
  if (!c.compliance || c.compliance.notEvaluable) return 999;
  return c.compliance.score;
}

function shortName(fileName: string) {
  const parts = fileName.split("-");
  if (parts.length >= 2) return parts.slice(0, 2).join("-") + "-";
  return fileName;
}

function fmtTokens(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

function fmtCheckedAt(checkedAt: unknown): string {
  if (!checkedAt) return "";
  let date: Date | null = null;
  if (typeof checkedAt === "object" && checkedAt !== null && "seconds" in checkedAt) {
    date = new Date((checkedAt as { seconds: number }).seconds * 1000);
  } else if (typeof checkedAt === "string") {
    date = new Date(checkedAt);
  }
  if (!date || isNaN(date.getTime())) return "";
  const months = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
  return `${date.getDate()} ${months[date.getMonth()]} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function estimateDur(c: CallRecord): string | null {
  const seconds = c.estimatedDurationSeconds ?? (() => {
    const text = c.transcript || (c.transcriptLines?.map((l) => l.text).join(" ") ?? "");
    if (text.length < 10) return null;
    return Math.round((text.trim().split(/\s+/).length / 130) * 60);
  })();
  if (!seconds) return null;
  if (seconds < 60) return `~${seconds}sn`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `~${mins}dk ${secs}sn` : `~${mins}dk`;
}

export default function CallsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { calls: allCalls } = useCalls();

  const id = pathname.split("/")[2] ?? "";

  const currentCall = allCalls.find((c) => c.id === id);
  const folderDate = currentCall?.folderDate ?? "";

  const [complianceSort, setComplianceSort] = useState<"asc" | "desc" | null>(() => {
    if (typeof window === "undefined") return null;
    const saved = localStorage.getItem("complianceSort");
    return (saved === "asc" || saved === "desc") ? saved : null;
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [id]);

  const allDayCalls = allCalls.filter((c) => c.folderDate === folderDate);
  const pendingCalls = allDayCalls.filter((c) => c.status === "pending");
  const processingCalls = allDayCalls.filter((c) => c.status === "processing");
  const doneCalls = allDayCalls.filter((c) => c.status === "completed" || c.status === "error");

  const sortedDoneCalls = complianceSort
    ? [...doneCalls].sort((a, b) => {
        const sa = sortScore(a);
        const sb = sortScore(b);
        if (sa !== sb) return complianceSort === "asc" ? sa - sb : sb - sa;
        return checkedAtSeconds(b.compliance?.checkedAt) - checkedAtSeconds(a.compliance?.checkedAt);
      })
    : [...doneCalls].sort((a, b) =>
        checkedAtSeconds(b.compliance?.checkedAt) - checkedAtSeconds(a.compliance?.checkedAt)
      );

  const dayCalls = [...processingCalls, ...pendingCalls, ...sortedDoneCalls];

  function toggleComplianceSort() {
    setComplianceSort((prev) => {
      const next = prev === null ? "asc" : prev === "asc" ? "desc" : null;
      if (next === null) localStorage.removeItem("complianceSort");
      else localStorage.setItem("complianceSort", next);
      return next;
    });
  }

  function clearComplianceSort() {
    localStorage.removeItem("complianceSort");
    setComplianceSort(null);
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex overflow-x-hidden">
      {/* ── Sol Sidebar ── */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-screen w-[19rem] bg-white border-r border-gray-100 z-10">
        {/* Başlık */}
        <div className="px-4 pt-6 pb-3 border-b border-gray-100 shrink-0">
          {folderDate && (
            <Link
              href={`/folders/${folderDate}`}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors mb-3"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Klasöre dön
            </Link>
          )}
          <p className="text-sm font-semibold text-gray-800 leading-tight">
            {folderDate ? getFolderLabel(folderDate) : ""}
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5">{dayCalls.length} çağrı</p>
          <div className="mt-3 inline-flex items-center gap-1.5">
            <button
              type="button"
              onClick={toggleComplianceSort}
              className={`inline-flex items-center justify-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
                complianceSort !== null
                  ? "border-[#0071E3] bg-blue-50 text-[#0071E3]"
                  : "border-gray-200 bg-white text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              {complianceSort === "asc"
                ? <ArrowUp className="w-3.5 h-3.5" />
                : complianceSort === "desc"
                ? <ArrowDown className="w-3.5 h-3.5" />
                : <ArrowUpDown className="w-3.5 h-3.5" />}
              Yönerge uygunluğuna göre sırala
            </button>
            {complianceSort !== null && (
              <button
                type="button"
                onClick={clearComplianceSort}
                aria-label="Sıralamayı kapat"
                title="Sıralamayı kapat"
                className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white p-1.5 text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors"
              >
                <XCircle className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Çağrı listesi */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          {dayCalls.map((c, idx) => {
            const isActive = c.id === id;
            const score = c.compliance && !c.compliance.notEvaluable ? c.compliance.score : null;
            const dur = estimateDur(c);
            const checkedAt = c.compliance ? fmtCheckedAt(c.compliance.checkedAt) : "";
            const s2 = c.step2Tokens !== undefined ? fmtTokens(c.step2Tokens) : null;
            const s3 = c.step3Tokens !== undefined ? fmtTokens(c.step3Tokens) : null;
            const isClickable = c.status === "completed";

            return (
              <div
                key={c.id}
                ref={isActive ? activeRef : null}
                onClick={() => isClickable && router.push(`/calls/${c.id}`)}
                className={`px-4 py-3 border-b border-gray-100 last:border-0 transition-colors ${
                  isActive
                    ? "bg-blue-50 border-l-2 border-l-[#0071E3]"
                    : isClickable
                    ? "hover:bg-gray-50 cursor-pointer"
                    : ""
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="text-xs font-semibold text-gray-800 font-mono truncate">
                    {shortName(c.fileName)}
                  </p>
                  <span className="text-[10px] text-gray-400 shrink-0">#{dayCalls.length - idx}</span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 mb-1">
                  {c.agentName && (
                    <span className="text-[10px] font-medium text-blue-600">{c.agentName}</span>
                  )}
                  {s2 && (
                    <span className="text-[10px] bg-violet-50 text-violet-500 rounded px-1">S2 {s2}</span>
                  )}
                  {s3 && (
                    <span className="text-[10px] bg-sky-50 text-sky-500 rounded px-1">S3 {s3}</span>
                  )}
                  {dur && (
                    <span className="text-[10px] text-gray-400">{dur}</span>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {checkedAt && (
                      <span className="text-[10px] text-gray-400">{checkedAt}</span>
                    )}
                  </div>
                  {score !== null ? (
                    <span className={`text-xs font-bold px-2 py-1 rounded-full shrink-0 ${
                      score >= 80 ? "bg-green-50 text-green-600" :
                      score >= 60 ? "bg-amber-50 text-amber-600" :
                      "bg-red-50 text-red-500"
                    }`}>{score}</span>
                  ) : c.compliance?.notEvaluable ? (
                    <span className="text-xs font-bold px-2 py-1 rounded-full shrink-0 bg-gray-100 text-gray-400">—</span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      {/* ── Ana İçerik ── */}
      <div className="flex-1 lg:ml-[19rem] min-w-0">
        {children}
      </div>
    </div>
  );
}

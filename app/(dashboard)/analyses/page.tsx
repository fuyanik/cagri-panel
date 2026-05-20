"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, Flag, AlertTriangle, ChevronRight, Loader2 } from "lucide-react";

interface CallReview {
  id: string;
  callId: string;
  type: "general" | "violation";
  violationRule?: string;
  violationDetail?: string;
  violationCritical?: boolean;
  comment: string;
  createdAt: string | null;
}

interface ReviewGroup {
  callId: string;
  reviews: CallReview[];
  latestAt: string | null;
}

function fmtDate(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const months = ["Oca","Şub","Mar","Nis","May","Haz","Tem","Ağu","Eyl","Eki","Kas","Ara"];
  return `${d.getDate()} ${months[d.getMonth()]} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}

export default function AnalysesPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<ReviewGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/reviews");
        if (!res.ok) throw new Error("Yüklenemedi");
        const reviews: CallReview[] = await res.json();

        const map = new Map<string, CallReview[]>();
        for (const r of reviews) {
          if (!map.has(r.callId)) map.set(r.callId, []);
          map.get(r.callId)!.push(r);
        }

        const grouped: ReviewGroup[] = Array.from(map.entries()).map(([callId, revs]) => ({
          callId,
          reviews: revs,
          latestAt: revs[0]?.createdAt ?? null,
        }));

        setGroups(grouped);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Hata");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function toggleExpand(callId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(callId)) next.delete(callId); else next.add(callId);
      return next;
    });
  }

  return (
    <div className="px-4 sm:px-6 py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Analizler</h1>
        <p className="text-sm text-gray-400 mt-1">Değerlendirme yapılan çağrılar ve yorumlar</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-5 h-5 text-gray-300 animate-spin" />
        </div>
      ) : error ? (
        <div className="py-20 text-center text-sm text-red-400">{error}</div>
      ) : groups.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 py-20 text-center">
          <MessageSquare className="w-8 h-8 text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-400">Henüz değerlendirme yapılmamış</p>
          <p className="text-xs text-gray-300 mt-1">Çağrı detay sayfasından analiz bildirimi ekleyebilirsiniz</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {groups.map((g) => {
            const isOpen = expanded.has(g.callId);
            const violationCount = g.reviews.filter((r) => r.type === "violation").length;
            const generalCount = g.reviews.filter((r) => r.type === "general").length;

            return (
              <div key={g.callId} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                {/* Grup başlığı */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
                      <Flag className="w-4 h-4 text-orange-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 font-mono truncate">{g.callId}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {violationCount > 0 && (
                          <span className="text-[10px] bg-orange-50 text-orange-600 font-medium px-1.5 py-0.5 rounded-full">{violationCount} sorun bildirimi</span>
                        )}
                        {generalCount > 0 && (
                          <span className="text-[10px] bg-blue-50 text-blue-600 font-medium px-1.5 py-0.5 rounded-full">{generalCount} genel yorum</span>
                        )}
                        {g.latestAt && <span className="text-[10px] text-gray-400">{fmtDate(g.latestAt)}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => router.push(`/calls/${g.callId}`)}
                      className="text-[11px] font-medium text-[#0071E3] hover:underline flex items-center gap-1"
                    >
                      Çağrıya Git <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => toggleExpand(g.callId)}
                      className="text-[11px] text-gray-400 hover:text-gray-600 border border-gray-200 px-2 py-1 rounded-lg transition-colors"
                    >
                      {isOpen ? "Gizle" : `${g.reviews.length} yorum`}
                    </button>
                  </div>
                </div>

                {/* Yorumlar */}
                {isOpen && (
                  <div className="px-5 py-3 flex flex-col gap-2">
                    {g.reviews.map((r) => (
                      <div key={r.id} className={`rounded-xl border px-4 py-3 ${r.type === "violation" ? "bg-orange-50 border-orange-100" : "bg-blue-50 border-blue-100"}`}>
                        {r.type === "violation" && r.violationRule && (
                          <div className="flex items-start gap-1.5 mb-1.5">
                            {r.violationCritical
                              ? <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                              : <Flag className="w-3.5 h-3.5 text-orange-500 shrink-0 mt-0.5" />
                            }
                            <div>
                              <p className="text-[11px] font-semibold text-orange-700">{r.violationRule}</p>
                              {r.violationDetail && (
                                <p className="text-[10px] text-orange-600/70 mt-0.5 leading-relaxed">{r.violationDetail}</p>
                              )}
                            </div>
                          </div>
                        )}
                        {r.type === "general" && (
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <MessageSquare className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                            <p className="text-[11px] font-semibold text-blue-700">Genel Değerlendirme</p>
                          </div>
                        )}
                        <p className="text-xs text-gray-700 leading-relaxed break-words">{r.comment}</p>
                        {r.createdAt && <p className="text-[10px] text-gray-400 mt-1.5">{fmtDate(r.createdAt)}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

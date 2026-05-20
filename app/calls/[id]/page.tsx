"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileAudio, Calendar, Headphones, User, Bookmark, Volume2, CheckCircle2, XCircle, AlertTriangle, Copy, Check, Info, Trash2, CheckCircle, Clock, Loader2 } from "lucide-react";
import type { CallRecord, TranscriptLine } from "@/lib/types";
import { useCalls } from "@/providers/CallsProvider";

function parseTranscriptLines(call: CallRecord): TranscriptLine[] | null {
  if (call.transcriptLines && Array.isArray(call.transcriptLines) && call.transcriptLines.length > 0) {
    return call.transcriptLines;
  }
  if (call.transcript) {
    const lines = call.transcript.split("\n").filter(Boolean);
    const parsed: TranscriptLine[] = [];
    for (const line of lines) {
      if (line.startsWith("Asistan:")) {
        parsed.push({ speaker: "Asistan", text: line.replace("Asistan:", "").trim() });
      } else if (line.startsWith("Borçlu:") || line.startsWith("Arayan:")) {
        parsed.push({ speaker: "Borçlu", text: line.replace(/^(Borçlu|Arayan):/, "").trim() });
      } else if (parsed.length > 0) {
        parsed[parsed.length - 1].text += " " + line.trim();
      }
    }
    if (parsed.length > 0) return parsed;
    return null;
  }
  return null;
}

function ChatBubble({ line, index }: { line: TranscriptLine; index: number }) {
  const isAsistan = line.speaker === "Asistan";

  return (
    <div
      className={`flex gap-3 ${isAsistan ? "flex-row" : "flex-row-reverse"}`}
      style={{ animationDelay: `${index * 20}ms` }}
    >
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
          isAsistan ? "bg-[#0071E3]" : "bg-gray-200"
        }`}
      >
        {isAsistan ? (
          <Headphones className="w-4 h-4 text-white" />
        ) : (
          <User className="w-4 h-4 text-gray-500" />
        )}
      </div>

      <div className={`max-w-[98%] sm:max-w-[75%] ${isAsistan ? "items-start" : "items-end"} flex flex-col gap-1`}>
        <span className="text-[10px] font-medium text-gray-400 px-1">{line.speaker}</span>
        <div
          className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
            isAsistan
              ? "bg-[#0071E3] text-white rounded-tl-sm"
              : "bg-gray-100 text-gray-800 rounded-tr-sm"
          }`}
        >
          {line.text}
        </div>
      </div>
    </div>
  );
}

export default function CallDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [call, setCall] = useState<CallRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { calls: allCalls } = useCalls();

  async function handleDelete() {
    if (!call) return;
    if (!confirm(`"${call.fileName}" kaydını silmek istiyor musunuz? Bir sonraki analizde yeniden işlenecek.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/calls/${id}`, { method: "DELETE" });
      if (res.ok) {
        router.push(`/folders/${call.folderDate}`);
      }
    } catch (err) {
      console.error(err);
      setDeleting(false);
    }
  }

  function copyDriveLink() {
    if (!call) return;
    const url = `https://drive.google.com/file/d/${call.driveFileId}/view`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  useEffect(() => {
    async function fetchCall() {
      try {
        const res = await fetch(`/api/calls/${id}`);
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Kayıt bulunamadı");
          return;
        }
        setCall(data as CallRecord);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Bağlantı hatası");
      } finally {
        setLoading(false);
      }
    }
    fetchCall();
  }, [id]);

  async function toggleSave() {
    if (!call || saving) return;
    setSaving(true);
    try {
      const newSaved = !call.saved;
      const res = await fetch(`/api/calls/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ saved: newSaved }),
      });
      if (res.ok) {
        setCall((prev) => prev ? { ...prev, saved: newSaved } : prev);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center">
        <p className="text-sm text-gray-400">Yükleniyor...</p>
      </div>
    );
  }

  if (error || !call) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-red-400">{error || "Kayıt bulunamadı"}</p>
          <button onClick={() => router.back()} className="text-xs text-[#0071E3] mt-2 hover:underline">
            Geri dön
          </button>
        </div>
      </div>
    );
  }

  const transcriptLines = parseTranscriptLines(call);

  // Geri dön butonu için gün adını hesapla
  function getFolderLabel(folderDate: string) {
    const year = parseInt(folderDate.slice(0, 4));
    const month = parseInt(folderDate.slice(4, 6)) - 1;
    const day = parseInt(folderDate.slice(6, 8));
    const d = new Date(year, month, day);
    const dayName = d.toLocaleDateString("tr-TR", { weekday: "long" });
    const dateName = d.toLocaleDateString("tr-TR", { day: "numeric", month: "long" });
    return `${dateName} ${dayName.charAt(0).toUpperCase() + dayName.slice(1)}`;
  }

  // Sidebar için o günün çağrıları
  const folderDate = call.folderDate;
  function checkedAtSeconds(checkedAt: unknown): number {
    if (!checkedAt) return 0;
    const raw = checkedAt as Record<string, unknown>;
    if (typeof raw.seconds === "number") return raw.seconds;
    if (typeof checkedAt === "string") return new Date(checkedAt).getTime() / 1000;
    return 0;
  }

  const dayCalls = allCalls
    .filter((c) => c.folderDate === folderDate)
    .sort((a, b) =>
      checkedAtSeconds(b.compliance?.checkedAt) - checkedAtSeconds(a.compliance?.checkedAt)
    );

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
    const months = ["Oca","Şub","Mar","Nis","May","Haz","Tem","Ağu","Eyl","Eki","Kas","Ara"];
    return `${date.getDate()} ${months[date.getMonth()]} ${String(date.getHours()).padStart(2,"0")}:${String(date.getMinutes()).padStart(2,"0")}`;
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

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex">
      {/* ── Sol Sidebar ── */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-screen w-72 bg-white border-r border-gray-100 z-10">
        {/* Başlık */}
        <div className="px-4 pt-6 pb-3 border-b border-gray-100 shrink-0">
          <Link
            href={`/folders/${folderDate}`}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors mb-3"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Klasöre dön
          </Link>
          <p className="text-sm font-semibold text-gray-800 leading-tight">{getFolderLabel(folderDate)}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">{dayCalls.length} çağrı</p>
        </div>

        {/* Çağrı listesi */}
        <div className="flex-1 overflow-y-auto">
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
                onClick={() => isClickable && router.push(`/calls/${c.id}`)}
                className={`px-4 py-3 border-b border-gray-100 last:border-0 transition-colors ${
                  isActive
                    ? "bg-blue-50 border-l-2 border-l-[#0071E3]"
                    : isClickable
                    ? "hover:bg-gray-50 cursor-pointer"
                    : ""
                }`}
              >
                {/* Dosya adı + sıra */}
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="text-xs font-semibold text-gray-800 font-mono truncate">
                    {shortName(c.fileName)}
                  </p>
                  <span className="text-[10px] text-gray-400 shrink-0">#{dayCalls.length - idx}</span>
                </div>

                {/* Agent + tokenlar */}
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

                {/* Skor + saat + durum */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {score !== null ? (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        score >= 80 ? "bg-green-50 text-green-600" :
                        score >= 60 ? "bg-amber-50 text-amber-600" :
                        "bg-red-50 text-red-500"
                      }`}>{score}</span>
                    ) : c.compliance?.notEvaluable ? (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-400">—</span>
                    ) : null}
                    {checkedAt && (
                      <span className="text-[10px] text-gray-400">{checkedAt}</span>
                    )}
                  </div>
                  {/* Durum ikonu */}
                  {c.status === "completed" ? (
                    <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                  ) : c.status === "error" ? (
                    <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                  ) : c.status === "processing" ? (
                    <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin shrink-0" />
                  ) : (
                    <Clock className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      {/* ── Ana İçerik ── */}
      <div className="flex-1 lg:ml-72">
        <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Back (mobil) */}
        <button
          onClick={() => router.push(`/folders/${call.folderDate}`)}
          className="lg:hidden inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 bg-white shadow-sm hover:shadow px-4 py-2.5 rounded-xl transition-all cursor-pointer mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Geri Dön — {getFolderLabel(call.folderDate)}
        </button>

        {/* Header */}
        <div className="bg-white rounded-2xl border border-gray-100 px-6 py-5 mb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                <FileAudio className="w-5 h-5 text-[#0071E3]" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base font-semibold text-gray-900 truncate">{call.fileName}</h1>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <Calendar className="w-3 h-3 text-gray-300" />
                  <span className="text-xs text-gray-400">{call.folderDate}</span>
                  {call.agentName && (
                    <span className="text-xs font-medium text-[#0071E3]">· {call.agentName}</span>
                  )}
                  {call.processedAt && (
                    <span className="text-xs text-gray-300">
                      · {new Date(call.processedAt).toLocaleString("tr-TR")}
                    </span>
                  )}
                  {(() => {
                    const total = (call.step2Tokens ?? 0) + (call.step3Tokens ?? 0);
                    return total > 0 ? (
                      <span className="text-[11px] font-medium bg-violet-50 text-violet-500 rounded-md px-1.5 py-0.5">
                        {total.toLocaleString("tr-TR")} token
                      </span>
                    ) : null;
                  })()}
                </div>

                {/* Borçlu bilgileri */}
                {call.subjectInfo && (call.subjectInfo.name || call.subjectInfo.tcNo || call.subjectInfo.icraOffice || call.subjectInfo.fileNo) && (
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                    {call.subjectInfo.name && (
                      <span className="text-xs text-gray-600"><span className="text-gray-400">Borçlu:</span> {call.subjectInfo.name}</span>
                    )}
                    {call.subjectInfo.tcNo && (
                      <span className="text-xs text-gray-600"><span className="text-gray-400">TC:</span> {call.subjectInfo.tcNo}</span>
                    )}
                    {call.subjectInfo.icraOffice && (
                      <span className="text-xs text-gray-600"><span className="text-gray-400">İcra:</span> {call.subjectInfo.icraOffice}</span>
                    )}
                    {call.subjectInfo.fileNo && (
                      <span className="text-xs text-gray-600"><span className="text-gray-400">Dosya:</span> {call.subjectInfo.fileNo}</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Buton grubu — yan yana */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Sil */}
              <button
                onClick={handleDelete}
                disabled={deleting}
                title="Kaydı sil (yeniden analiz edilecek)"
                className="p-2 rounded-xl bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              {/* Linki kopyala */}
              <button
                onClick={copyDriveLink}
                title="Drive linkini kopyala"
                className="p-2 rounded-xl bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </button>

              {/* Drive'da dinle */}
              <a
                href={`https://drive.google.com/file/d/${call.driveFileId}/view`}
                target="_blank"
                rel="noopener noreferrer"
                title="Drive'da dinle"
                className="p-2 rounded-xl bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              >
                <Volume2 className="w-4 h-4" />
              </a>

              {/* Kaydet butonu */}
              <button
                onClick={toggleSave}
                disabled={saving}
                title={call.saved ? "Kaydı kaldır" : "Kaydet"}
                className={`p-2 rounded-xl transition-colors ${
                  call.saved
                    ? "bg-[#0071E3] text-white"
                    : "bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                }`}
              >
                <Bookmark
                  className="w-4 h-4"
                  fill={call.saved ? "currentColor" : "none"}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Summary */}
        {call.summary && (
          <div className="bg-white rounded-2xl border border-gray-100 px-6 py-5 mb-4">
            <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Görüşme Özeti</h2>
            <p className="text-sm text-gray-700 leading-relaxed">{call.summary}</p>
          </div>
        )}

        {/* Compliance */}
        {call.compliance && (
          <div className="bg-white rounded-2xl border border-gray-100 px-6 py-5 mb-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wider">Yönerge Uygunluğu</h2>
              {call.compliance.notEvaluable ? (
                <span className="text-sm font-semibold px-3 py-1 rounded-full bg-gray-100 text-gray-400">
                  Değerlendirilemez
                </span>
              ) : (
                <span
                  className={`text-sm font-bold px-3 py-1 rounded-full ${
                    call.compliance.score >= 80
                      ? "bg-green-50 text-green-600"
                      : call.compliance.score >= 60
                      ? "bg-amber-50 text-amber-600"
                      : "bg-red-50 text-red-500"
                  }`}
                >
                  {call.compliance.score}/100
                </span>
              )}
            </div>

            <p className="text-sm text-gray-700 leading-relaxed mb-4">{call.compliance.summary}</p>

            {/* Notlar (mavi/informational) */}
            {(call.compliance.warnings?.length ?? 0) > 0 && (
              <div className="mb-4">
                <p className="text-xs font-medium text-blue-500 mb-2">Notlar</p>
                <div className="flex flex-col gap-1.5">
                  {call.compliance.warnings!.map((w, i) => (
                    <div key={i} className="flex items-start gap-2 bg-gradient-to-br from-blue-50 to-white border border-blue-100/60 rounded-xl px-4 py-2.5">
                      <Info className="w-3.5 h-3.5 text-blue-400 mt-0.5 shrink-0" />
                      <p className="text-xs text-blue-700">{w}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Olumlu */}
            {call.compliance.positives.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-medium text-green-600 mb-2">Uygun Davranışlar</p>
                <div className="flex flex-col gap-1.5">
                  {call.compliance.positives.map((p, i) => (
                    <div key={i} className="flex items-start gap-2 bg-gradient-to-br from-green-50 to-white border border-green-100/60 rounded-xl px-4 py-2.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
                      <p className="text-xs text-green-700">{p}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* İhlaller */}
            {call.compliance.violations.length > 0 && (
              <div>
                <p className="text-xs font-medium text-red-500 mb-2">Tespit Edilen Sorunlar</p>
                <div className="flex flex-col gap-2">
                  {call.compliance.violations.map((v, i) => (
                    <div key={i} className={`rounded-xl px-4 py-3 ${v.critical ? "bg-gradient-to-br from-red-100 to-red-50 border border-red-200" : "bg-gradient-to-br from-red-50 to-white border border-red-100/60"}`}>
                      <div className="flex items-center gap-1.5 mb-1">
                        {v.critical
                          ? <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                          : <XCircle className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        }
                        <p className={`text-xs font-medium ${v.critical ? "text-red-600" : "text-gray-600"}`}>
                          {v.critical && "KRİTİK · "}{v.rule}
                        </p>
                      </div>
                      <p className="text-xs text-gray-500 leading-relaxed">{v.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Transcript */}
        <div className="bg-white rounded-2xl border border-gray-100 px-6 py-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wider">Transkript</h2>
            {transcriptLines && (
              <div className="flex items-center gap-4 text-xs text-gray-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#0071E3] inline-block" />
                  Asistan
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-gray-300 inline-block" />
                  Borçlu
                </span>
              </div>
            )}
          </div>

          {/* Scroll container */}
          <div className="sm:overflow-y-auto sm:max-h-[90vh] pr-1">
            {transcriptLines ? (
              <div className="flex flex-col gap-4">
                {transcriptLines.map((line, i) => (
                  <ChatBubble key={i} line={line} index={i} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                {call.transcript}
              </p>
            )}
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}

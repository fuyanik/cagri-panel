"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, FileAudio, Calendar, Headphones, User, Bookmark, Volume2, CheckCircle2, XCircle, AlertTriangle, Copy, Check, AlertCircle, Trash2 } from "lucide-react";
import type { CallRecord, TranscriptLine } from "@/lib/types";

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

      <div className={`max-w-[75%] ${isAsistan ? "items-start" : "items-end"} flex flex-col gap-1`}>
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

  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Back */}
        <button
          onClick={() => router.push(`/folders/${call.folderDate}`)}
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 bg-white shadow-sm hover:shadow px-4 py-2.5 rounded-xl transition-all cursor-pointer mb-8"
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

            {/* Uyarılar (sarı) */}
            {(call.compliance.warnings?.length ?? 0) > 0 && (
              <div className="mb-4">
                <p className="text-xs font-medium text-amber-600 mb-2">Dikkat Gerektiren Durumlar</p>
                <div className="flex flex-col gap-1.5">
                  {call.compliance.warnings!.map((w, i) => (
                    <div key={i} className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl px-4 py-2.5">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                      <p className="text-xs text-amber-700">{w}</p>
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
                    <div key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
                      <p className="text-xs text-gray-600">{p}</p>
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
                    <div key={i} className={`rounded-xl px-4 py-3 ${v.critical ? "bg-red-50 border border-red-100" : "bg-gray-50"}`}>
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
          <div className="overflow-y-auto max-h-[90vh] pr-1">
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
  );
}

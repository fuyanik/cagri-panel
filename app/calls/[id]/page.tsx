"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, FileAudio, Calendar, Headphones, User, Bookmark, Volume2, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
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

  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Back */}
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Dashboard
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
                <div className="flex items-center gap-2 mt-1">
                  <Calendar className="w-3 h-3 text-gray-300" />
                  <span className="text-xs text-gray-400">{call.folderDate}</span>
                  {call.processedAt && (
                    <span className="text-xs text-gray-300">
                      · {new Date(call.processedAt).toLocaleString("tr-TR")}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Drive'da dinle */}
            <a
              href={`https://drive.google.com/file/d/${call.driveFileId}/view`}
              target="_blank"
              rel="noopener noreferrer"
              title="Drive'da dinle"
              className="shrink-0 p-2 rounded-xl bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            >
              <Volume2 className="w-4 h-4" />
            </a>

            {/* Kaydet butonu */}
            <button
              onClick={toggleSave}
              disabled={saving}
              title={call.saved ? "Kaydı kaldır" : "Kaydet"}
              className={`shrink-0 p-2 rounded-xl transition-colors ${
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
            </div>

            <p className="text-sm text-gray-700 leading-relaxed mb-4">{call.compliance.summary}</p>

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

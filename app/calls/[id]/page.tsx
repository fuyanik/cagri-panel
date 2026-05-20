"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, FileAudio, Calendar, Headphones, User, Bookmark, Volume2,
  CheckCircle2, XCircle, AlertTriangle, Copy, Check, Info, Trash2,
  Flag, CheckSquare, Square, Send, MessageSquare, X, ChevronDown, ChevronUp,
  Pencil,
} from "lucide-react";
import type { CallRecord, TranscriptLine } from "@/lib/types";

// ─── Types ────────────────────────────────────────────────────────────────────

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

interface PendingViolation {
  rule: string;
  detail: string;
  critical: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function getFolderLabel(folderDate: string) {
  const year = parseInt(folderDate.slice(0, 4));
  const month = parseInt(folderDate.slice(4, 6)) - 1;
  const day = parseInt(folderDate.slice(6, 8));
  const d = new Date(year, month, day);
  const dayName = d.toLocaleDateString("tr-TR", { weekday: "long" });
  const dateName = d.toLocaleDateString("tr-TR", { day: "numeric", month: "long" });
  return `${dateName} ${dayName.charAt(0).toUpperCase() + dayName.slice(1)}`;
}

function fmtDate(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const months = ["Oca","Şub","Mar","Nis","May","Haz","Tem","Ağu","Eyl","Eki","Kas","Ara"];
  return `${d.getDate()} ${months[d.getMonth()]} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}

// ─── ChatBubble ───────────────────────────────────────────────────────────────

function ChatBubble({ line, index }: { line: TranscriptLine; index: number }) {
  const isAsistan = line.speaker === "Asistan";
  return (
    <div
      className={`flex gap-3 min-w-0 ${isAsistan ? "flex-row" : "flex-row-reverse"}`}
      style={{ animationDelay: `${index * 20}ms` }}
    >
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${isAsistan ? "bg-[#0071E3]" : "bg-gray-200"}`}>
        {isAsistan ? <Headphones className="w-4 h-4 text-white" /> : <User className="w-4 h-4 text-gray-500" />}
      </div>
      <div className={`max-w-[calc(100%-2.75rem)] sm:max-w-[75%] min-w-0 ${isAsistan ? "items-start" : "items-end"} flex flex-col gap-1`}>
        <span className="text-[10px] font-medium text-gray-400 px-1">{line.speaker}</span>
        <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words ${isAsistan ? "bg-[#0071E3] text-white rounded-tl-sm" : "bg-gray-100 text-gray-800 rounded-tr-sm"}`}>
          {line.text}
        </div>
      </div>
    </div>
  );
}

// ─── Right Sidebar ────────────────────────────────────────────────────────────

type SubmitToast = { type: "success" | "error"; message: string } | null;

interface RightSidebarProps {
  reviews: CallReview[];
  pendingViolations: PendingViolation[];
  pendingComment: string;
  onPendingCommentChange: (v: string) => void;
  onSubmitReport: () => void;
  onCancelPending: () => void;
  submittingReport: boolean;
  generalComment: string;
  onGeneralCommentChange: (v: string) => void;
  onSubmitGeneral: () => void;
  submittingGeneral: boolean;
  toast: SubmitToast;
  reviewsOpen: boolean;
  onReviewsOpenChange: (open: boolean) => void;
  editingReviewId: string | null;
  editComment: string;
  onEditCommentChange: (v: string) => void;
  onStartEditReview: (r: CallReview) => void;
  onCancelEditReview: () => void;
  onSaveEditReview: () => void;
  onDeleteReview: (reviewId: string) => void;
  reviewActionId: string | null;
}

function RightSidebar({
  reviews, pendingViolations, pendingComment, onPendingCommentChange,
  onSubmitReport, onCancelPending, submittingReport,
  generalComment, onGeneralCommentChange, onSubmitGeneral, submittingGeneral,
  toast, reviewsOpen, onReviewsOpenChange,
  editingReviewId, editComment, onEditCommentChange,
  onStartEditReview, onCancelEditReview, onSaveEditReview, onDeleteReview, reviewActionId,
}: RightSidebarProps) {
  return (
    <aside className="hidden xl:flex flex-col fixed right-0 top-0 h-screen w-[19rem] bg-white border-l border-gray-100 z-10">
      <div className="px-4 pt-6 pb-3 border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-[#0071E3]" />
          <p className="text-sm font-semibold text-gray-800">Analiz Değerlendirmesi</p>
        </div>
        <p className="text-[11px] text-gray-400 mt-0.5">{reviews.length} yorum</p>

        {toast && (
          <div
            className={`mt-3 flex items-start gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
              toast.type === "success"
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-600 border border-red-200"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
            )}
            <span className="leading-snug">{toast.message}</span>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Bekleyen bildirim formu */}
        {pendingViolations.length > 0 && (
          <div className="mx-3 mt-3 bg-orange-50 border border-orange-200 rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-semibold text-orange-700 uppercase tracking-wide">
                Bildirim Hazırlanıyor
              </p>
              <button onClick={onCancelPending} className="text-orange-400 hover:text-orange-600 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex flex-col gap-1.5 mb-2">
              {pendingViolations.map((v, i) => (
                <div key={i} className={`flex items-start gap-1.5 rounded-lg px-2.5 py-1.5 ${v.critical ? "bg-red-100" : "bg-orange-100"}`}>
                  {v.critical ? <AlertTriangle className="w-3 h-3 text-red-500 shrink-0 mt-0.5" /> : <XCircle className="w-3 h-3 text-orange-500 shrink-0 mt-0.5" />}
                  <p className="text-[10px] text-orange-800 leading-tight">{v.rule}</p>
                </div>
              ))}
            </div>
            <textarea
              value={pendingComment}
              onChange={(e) => onPendingCommentChange(e.target.value)}
              placeholder="Bu tespitlerin neden yanlış olduğunu açıklayın..."
              className="w-full text-xs bg-white border border-orange-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:border-[#0071E3] placeholder-gray-400"
              rows={3}
            />
            <button
              onClick={onSubmitReport}
              disabled={submittingReport || !pendingComment.trim() || pendingViolations.length === 0}
              className="mt-2 w-full inline-flex items-center justify-center gap-1.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-xs font-medium rounded-lg py-2 transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              {submittingReport ? "Gönderiliyor..." : "Gönder"}
            </button>
          </div>
        )}

        {/* Genel değerlendirme */}
        <div className="mx-3 mt-3 bg-gray-50 rounded-xl p-3 border border-gray-100">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2">Genel Değerlendirme</p>
          <textarea
            value={generalComment}
            onChange={(e) => onGeneralCommentChange(e.target.value)}
            placeholder="Bu çağrı analizi hakkında genel değerlendirmenizi yazın..."
            className="w-full text-xs bg-white border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:border-[#0071E3] placeholder-gray-400"
            rows={4}
          />
          <button
            onClick={onSubmitGeneral}
            disabled={submittingGeneral || !generalComment.trim()}
            className="mt-2 w-full inline-flex items-center justify-center gap-1.5 bg-[#0071E3] hover:bg-blue-600 disabled:opacity-50 text-white text-xs font-medium rounded-lg py-2 transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            {submittingGeneral ? "Gönderiliyor..." : "Gönder"}
          </button>
        </div>

        {/* Kaydedilmiş yorumlar */}
        {reviews.length > 0 ? (
          <div className="mx-3 mt-3 mb-4">
            <button
              onClick={() => onReviewsOpenChange(!reviewsOpen)}
              className="flex items-center justify-between w-full text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2"
            >
              <span>Yorumlar ({reviews.length})</span>
              {reviewsOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            {reviewsOpen && (
              <div className="flex flex-col gap-2">
                {reviews.map((r) => {
                  const isEditing = editingReviewId === r.id;
                  const isBusy = reviewActionId === r.id;

                  return (
                    <div key={r.id} className={`rounded-xl border px-3 py-2.5 ${r.type === "violation" ? "bg-orange-50 border-orange-100" : "bg-blue-50 border-blue-100"}`}>
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="min-w-0 flex-1">
                          {r.type === "violation" && r.violationRule && (
                            <div className="flex items-start gap-1.5">
                              <Flag className="w-3 h-3 text-orange-500 shrink-0 mt-0.5" />
                              <p className="text-[10px] font-medium text-orange-700 leading-tight">{r.violationRule}</p>
                            </div>
                          )}
                          {r.type === "general" && (
                            <div className="flex items-center gap-1.5">
                              <MessageSquare className="w-3 h-3 text-blue-500 shrink-0" />
                              <p className="text-[10px] font-semibold text-blue-700">Genel Değerlendirme</p>
                            </div>
                          )}
                        </div>
                        {!isEditing && (
                          <div className="flex items-center gap-0.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => onStartEditReview(r)}
                              disabled={!!reviewActionId}
                              title="Düzenle"
                              className="p-1 rounded-md text-gray-400 hover:text-[#0071E3] hover:bg-white/80 transition-colors disabled:opacity-40"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteReview(r.id)}
                              disabled={!!reviewActionId}
                              title="Sil"
                              className="p-1 rounded-md text-gray-400 hover:text-red-500 hover:bg-white/80 transition-colors disabled:opacity-40"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>

                      {isEditing ? (
                        <>
                          <textarea
                            value={editComment}
                            onChange={(e) => onEditCommentChange(e.target.value)}
                            className="w-full text-xs bg-white border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:border-[#0071E3]"
                            rows={3}
                          />
                          <div className="flex gap-1.5 mt-2">
                            <button
                              type="button"
                              onClick={onSaveEditReview}
                              disabled={isBusy || !editComment.trim()}
                              className="flex-1 text-[10px] font-medium bg-[#0071E3] text-white rounded-lg py-1.5 disabled:opacity-50"
                            >
                              {isBusy ? "Kaydediliyor..." : "Kaydet"}
                            </button>
                            <button
                              type="button"
                              onClick={onCancelEditReview}
                              disabled={isBusy}
                              className="flex-1 text-[10px] font-medium border border-gray-200 text-gray-600 rounded-lg py-1.5 hover:bg-white disabled:opacity-50"
                            >
                              İptal
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <p className="text-xs text-gray-700 leading-relaxed break-words">{r.comment}</p>
                          {r.createdAt && (
                            <p className="text-[10px] text-gray-400 mt-1">{fmtDate(r.createdAt)}</p>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <p className="mx-3 mt-3 mb-4 text-[11px] text-gray-400 text-center py-4">
            Henüz yorum yok. Bildirim veya genel değerlendirme gönderin.
          </p>
        )}
      </div>
    </aside>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

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

  // Reviews
  const [reviews, setReviews] = useState<CallReview[]>([]);
  const [pendingViolations, setPendingViolations] = useState<PendingViolation[]>([]);
  const [pendingComment, setPendingComment] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);
  const [generalComment, setGeneralComment] = useState("");
  const [submittingGeneral, setSubmittingGeneral] = useState(false);

  // Multi-select
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedViolations, setSelectedViolations] = useState<Set<number>>(new Set());

  const [toast, setToast] = useState<SubmitToast>(null);
  const [reviewsOpen, setReviewsOpen] = useState(true);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [editComment, setEditComment] = useState("");
  const [reviewActionId, setReviewActionId] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((type: "success" | "error", message: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ type, message });
    toastTimerRef.current = setTimeout(() => setToast(null), 4000);
  }, []);

  const fetchReviews = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch(`/api/calls/${id}/reviews`);
      const data = await res.json();
      if (!res.ok) {
        showToast("error", (data as { error?: string }).error || "Yorumlar yüklenemedi");
        return false;
      }
      setReviews(data as CallReview[]);
      return true;
    } catch {
      showToast("error", "Yorumlar yüklenemedi — bağlantı hatası");
      return false;
    }
  }, [id, showToast]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setCall(null);
    setReviews([]);
    setPendingViolations([]);
    setPendingComment("");
    setMultiSelectMode(false);
    setSelectedViolations(new Set());
    setEditingReviewId(null);
    setEditComment("");

    async function fetchCall() {
      try {
        const res = await fetch(`/api/calls/${id}`);
        const data = await res.json();
        if (!res.ok) { setError(data.error || "Kayıt bulunamadı"); return; }
        setCall(data as CallRecord);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Bağlantı hatası");
      } finally {
        setLoading(false);
      }
    }
    fetchCall();
    fetchReviews();
  }, [id, fetchReviews]);

  async function handleDelete() {
    if (!call) return;
    if (!confirm(`"${call.fileName}" kaydını silmek istiyor musunuz?`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/calls/${id}`, { method: "DELETE" });
      if (res.ok) router.push(`/folders/${call.folderDate}`);
    } catch (err) { console.error(err); setDeleting(false); }
  }

  function copyDriveLink() {
    if (!call) return;
    navigator.clipboard.writeText(`https://drive.google.com/file/d/${call.driveFileId}/view`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

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
      if (res.ok) setCall((prev) => prev ? { ...prev, saved: newSaved } : prev);
    } catch (err) { console.error(err); } finally { setSaving(false); }
  }

  function addViolationToPending(v: PendingViolation) {
    setPendingViolations([v]);
    setPendingComment("");
  }

  function addMultiViolationsToPending() {
    if (!call?.compliance?.violations) return;
    const selected = call.compliance.violations.filter((_, i) => selectedViolations.has(i));
    setPendingViolations(selected.map((v) => ({ rule: v.rule, detail: v.detail, critical: v.critical })));
    setPendingComment("");
    setMultiSelectMode(false);
    setSelectedViolations(new Set());
  }

  async function submitReport() {
    if (!pendingComment.trim() || submittingReport || pendingViolations.length === 0) return;
    setSubmittingReport(true);
    try {
      const res = await fetch(`/api/calls/${id}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "violation", comment: pendingComment, violations: pendingViolations }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setPendingViolations([]);
        setPendingComment("");
        setReviewsOpen(true);
        const loaded = await fetchReviews();
        showToast("success", loaded ? "Bildirim gönderildi ve kaydedildi" : "Kaydedildi, liste yenilenirken sorun oluştu");
      } else {
        showToast("error", (data as { error?: string }).error || "Gönderilemedi, tekrar deneyin");
      }
    } catch {
      showToast("error", "Gönderilemedi — bağlantı hatası");
    } finally {
      setSubmittingReport(false);
    }
  }

  async function submitGeneral() {
    if (!generalComment.trim() || submittingGeneral) return;
    setSubmittingGeneral(true);
    try {
      const res = await fetch(`/api/calls/${id}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "general", comment: generalComment }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setGeneralComment("");
        setReviewsOpen(true);
        const loaded = await fetchReviews();
        showToast("success", loaded ? "Değerlendirme gönderildi ve kaydedildi" : "Kaydedildi, liste yenilenirken sorun oluştu");
      } else {
        showToast("error", (data as { error?: string }).error || "Gönderilemedi, tekrar deneyin");
      }
    } catch {
      showToast("error", "Gönderilemedi — bağlantı hatası");
    } finally {
      setSubmittingGeneral(false);
    }
  }

  function toggleViolationSelect(idx: number) {
    setSelectedViolations((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  }

  function startEditReview(r: CallReview) {
    setEditingReviewId(r.id);
    setEditComment(r.comment);
  }

  function cancelEditReview() {
    setEditingReviewId(null);
    setEditComment("");
  }

  async function saveEditReview() {
    if (!editingReviewId || !editComment.trim() || reviewActionId) return;
    setReviewActionId(editingReviewId);
    try {
      const res = await fetch(`/api/reviews/${editingReviewId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: editComment }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        cancelEditReview();
        const loaded = await fetchReviews();
        showToast("success", loaded ? "Yorum güncellendi" : "Güncellendi, liste yenilenemedi");
      } else {
        showToast("error", (data as { error?: string }).error || "Güncellenemedi");
      }
    } catch {
      showToast("error", "Güncellenemedi — bağlantı hatası");
    } finally {
      setReviewActionId(null);
    }
  }

  async function deleteReview(reviewId: string) {
    if (reviewActionId) return;
    if (!confirm("Bu yorumu silmek istiyor musunuz?")) return;
    setReviewActionId(reviewId);
    try {
      const res = await fetch(`/api/reviews/${reviewId}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        if (editingReviewId === reviewId) cancelEditReview();
        const loaded = await fetchReviews();
        showToast("success", loaded ? "Yorum silindi" : "Silindi, liste yenilenemedi");
      } else {
        showToast("error", (data as { error?: string }).error || "Silinemedi");
      }
    } catch {
      showToast("error", "Silinemedi — bağlantı hatası");
    } finally {
      setReviewActionId(null);
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-32"><p className="text-sm text-gray-400">Yükleniyor...</p></div>;
  }
  if (error || !call) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-center">
          <p className="text-sm text-red-400">{error || "Kayıt bulunamadı"}</p>
          <button onClick={() => router.back()} className="text-xs text-[#0071E3] mt-2 hover:underline">Geri dön</button>
        </div>
      </div>
    );
  }

  const transcriptLines = parseTranscriptLines(call);
  const violations = call.compliance?.violations ?? [];

  return (
    <>
      {/* Sağ sidebar */}
      <RightSidebar
        reviews={reviews}
        pendingViolations={pendingViolations}
        pendingComment={pendingComment}
        onPendingCommentChange={setPendingComment}
        onSubmitReport={submitReport}
        onCancelPending={() => { setPendingViolations([]); setPendingComment(""); }}
        submittingReport={submittingReport}
        generalComment={generalComment}
        onGeneralCommentChange={setGeneralComment}
        onSubmitGeneral={submitGeneral}
        submittingGeneral={submittingGeneral}
        toast={toast}
        reviewsOpen={reviewsOpen}
        onReviewsOpenChange={setReviewsOpen}
        editingReviewId={editingReviewId}
        editComment={editComment}
        onEditCommentChange={setEditComment}
        onStartEditReview={startEditReview}
        onCancelEditReview={cancelEditReview}
        onSaveEditReview={saveEditReview}
        onDeleteReview={deleteReview}
        reviewActionId={reviewActionId}
      />

      {/* Ana içerik — sağ sidebar için xl'de sağ margin */}
      <div className="xl:mr-[19rem]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 min-w-0">
          {/* Back (mobil) */}
          <button
            onClick={() => router.push(`/folders/${call.folderDate}`)}
            className="lg:hidden inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 bg-white shadow-sm hover:shadow px-4 py-2.5 rounded-xl transition-all cursor-pointer mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Geri Dön — {getFolderLabel(call.folderDate)}
          </button>

          {/* Header */}
          <div className="bg-white rounded-2xl border border-gray-100 px-4 sm:px-6 py-5 mb-4 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                  <FileAudio className="w-5 h-5 text-[#0071E3]" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-base font-semibold text-gray-900 truncate">{call.fileName}</h1>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <Calendar className="w-3 h-3 text-gray-300" />
                    <span className="text-xs text-gray-400 break-all">{call.folderDate}</span>
                    {call.agentName && <span className="text-xs font-medium text-[#0071E3]">· {call.agentName}</span>}
                    {call.processedAt && <span className="text-xs text-gray-300">· {new Date(call.processedAt).toLocaleString("tr-TR")}</span>}
                    {(() => {
                      const total = (call.step2Tokens ?? 0) + (call.step3Tokens ?? 0);
                      return total > 0 ? (
                        <span className="text-[11px] font-medium bg-violet-50 text-violet-500 rounded-md px-1.5 py-0.5">
                          {total.toLocaleString("tr-TR")} token
                        </span>
                      ) : null;
                    })()}
                  </div>
                  {call.subjectInfo && (call.subjectInfo.name || call.subjectInfo.tcNo || call.subjectInfo.icraOffice || call.subjectInfo.fileNo) && (
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                      {call.subjectInfo.name && <span className="text-xs text-gray-600"><span className="text-gray-400">Borçlu:</span> {call.subjectInfo.name}</span>}
                      {call.subjectInfo.tcNo && <span className="text-xs text-gray-600"><span className="text-gray-400">TC:</span> {call.subjectInfo.tcNo}</span>}
                      {call.subjectInfo.icraOffice && <span className="text-xs text-gray-600"><span className="text-gray-400">İcra:</span> {call.subjectInfo.icraOffice}</span>}
                      {call.subjectInfo.fileNo && <span className="text-xs text-gray-600"><span className="text-gray-400">Dosya:</span> {call.subjectInfo.fileNo}</span>}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={handleDelete} disabled={deleting} title="Kaydı sil" className="p-2 rounded-xl bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
                <button onClick={copyDriveLink} title="Drive linkini kopyala" className="p-2 rounded-xl bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </button>
                <a href={`https://drive.google.com/file/d/${call.driveFileId}/view`} target="_blank" rel="noopener noreferrer" title="Drive'da dinle" className="p-2 rounded-xl bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
                  <Volume2 className="w-4 h-4" />
                </a>
                <button onClick={toggleSave} disabled={saving} title={call.saved ? "Kaydı kaldır" : "Kaydet"} className={`p-2 rounded-xl transition-colors ${call.saved ? "bg-[#0071E3] text-white" : "bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600"}`}>
                  <Bookmark className="w-4 h-4" fill={call.saved ? "currentColor" : "none"} />
                </button>
              </div>
            </div>
          </div>

          {/* Summary */}
          {call.summary && (
            <div className="bg-white rounded-2xl border border-gray-100 px-4 sm:px-6 py-5 mb-4 min-w-0">
              <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Görüşme Özeti</h2>
              <p className="text-sm text-gray-700 leading-relaxed">{call.summary}</p>
            </div>
          )}

          {/* Compliance */}
          {call.compliance && (
            <div className="bg-white rounded-2xl border border-gray-100 px-4 sm:px-6 py-5 mb-4 min-w-0">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wider">Yönerge Uygunluğu</h2>
                {call.compliance.notEvaluable ? (
                  <span className="text-sm font-semibold px-3 py-1 rounded-full bg-gray-100 text-gray-400">Değerlendirilemez</span>
                ) : (
                  <span className={`text-sm font-bold px-3 py-1 rounded-full ${call.compliance.score >= 80 ? "bg-green-50 text-green-600" : call.compliance.score >= 60 ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-500"}`}>
                    {call.compliance.score}/100
                  </span>
                )}
              </div>

              <p className="text-sm text-gray-700 leading-relaxed mb-4 break-words">{call.compliance.summary}</p>

              {(call.compliance.warnings?.length ?? 0) > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-medium text-blue-500 mb-2">Notlar</p>
                  <div className="flex flex-col gap-1.5">
                    {call.compliance.warnings!.map((w, i) => (
                      <div key={i} className="flex items-start gap-2 bg-gradient-to-br from-blue-50 to-white border border-blue-100/60 rounded-xl px-4 py-2.5">
                        <Info className="w-3.5 h-3.5 text-blue-400 mt-0.5 shrink-0" />
                        <p className="text-xs text-blue-700 break-words">{w}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {call.compliance.positives.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-medium text-green-600 mb-2">Uygun Davranışlar</p>
                  <div className="flex flex-col gap-1.5">
                    {call.compliance.positives.map((p, i) => (
                      <div key={i} className="flex items-start gap-2 bg-gradient-to-br from-green-50 to-white border border-green-100/60 rounded-xl px-4 py-2.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
                        <p className="text-xs text-green-700 break-words">{p}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tespit Edilen Sorunlar */}
              {violations.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-red-500">Tespit Edilen Sorunlar</p>
                    <button
                      type="button"
                      onClick={() => { setMultiSelectMode((v) => !v); setSelectedViolations(new Set()); }}
                      className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-lg border transition-colors ${multiSelectMode ? "border-orange-300 bg-orange-50 text-orange-600" : "border-gray-200 text-gray-400 hover:text-gray-600 hover:bg-gray-50"}`}
                    >
                      {multiSelectMode ? <X className="w-3 h-3" /> : <CheckSquare className="w-3 h-3" />}
                      {multiSelectMode ? "İptal" : "Çoklu Seç ve Bildir"}
                    </button>
                  </div>

                  {multiSelectMode && selectedViolations.size > 0 && (
                    <button
                      type="button"
                      onClick={addMultiViolationsToPending}
                      className="mb-2 inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-colors"
                    >
                      <Flag className="w-3.5 h-3.5" />
                      {selectedViolations.size} sorunu bildir
                    </button>
                  )}

                  <div className="flex flex-col gap-2">
                    {violations.map((v, i) => (
                      <div
                        key={i}
                        role={multiSelectMode ? "button" : undefined}
                        tabIndex={multiSelectMode ? 0 : undefined}
                        onClick={multiSelectMode ? () => toggleViolationSelect(i) : undefined}
                        onKeyDown={multiSelectMode ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleViolationSelect(i); } } : undefined}
                        className={`rounded-xl px-4 py-3 relative ${
                          multiSelectMode ? "cursor-pointer select-none" : ""
                        } ${
                          multiSelectMode && selectedViolations.has(i) ? "ring-2 ring-orange-400" : ""
                        } ${v.critical ? "bg-gradient-to-br from-red-100 to-red-50 border border-red-200" : "bg-gradient-to-br from-red-50 to-white border border-red-100/60"}`}
                      >
                        <div className="flex items-start gap-2">
                          {multiSelectMode && (
                            <div className="shrink-0 mt-0.5 text-orange-500 pointer-events-none">
                              {selectedViolations.has(i)
                                ? <CheckSquare className="w-4 h-4" />
                                : <Square className="w-4 h-4 text-gray-300" />}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-1">
                              {v.critical ? <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" /> : <XCircle className="w-3.5 h-3.5 text-gray-400 shrink-0" />}
                              <p className={`text-xs font-medium ${v.critical ? "text-red-600" : "text-gray-600"}`}>
                                {v.critical && "KRİTİK · "}{v.rule}
                              </p>
                            </div>
                            <p className="text-xs text-gray-500 leading-relaxed break-words">{v.detail}</p>
                          </div>
                        </div>
                        {!multiSelectMode && (
                          <div className="flex justify-end mt-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                addViolationToPending({ rule: v.rule, detail: v.detail, critical: v.critical });
                              }}
                              className="inline-flex items-center gap-1 text-[10px] font-medium text-orange-500 hover:text-orange-700 border border-orange-200 hover:border-orange-400 bg-white px-2 py-1 rounded-lg transition-colors"
                            >
                              <Flag className="w-3 h-3" />
                              Analizi Bildir
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Transcript */}
          <div className="bg-white rounded-2xl border border-gray-100 px-4 sm:px-6 py-5 min-w-0">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wider">Transkript</h2>
              {transcriptLines && (
                <div className="flex items-center gap-4 text-xs text-gray-400">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#0071E3] inline-block" />Asistan</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-gray-300 inline-block" />Borçlu</span>
                </div>
              )}
            </div>
            <div className="sm:overflow-y-auto sm:max-h-[90vh] pr-1 min-w-0">
              {transcriptLines ? (
                <div className="flex flex-col gap-4">
                  {transcriptLines.map((line, i) => <ChatBubble key={i} line={line} index={i} />)}
                </div>
              ) : (
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap break-words">{call.transcript}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

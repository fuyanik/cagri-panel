"use client";

import { useState, useEffect } from "react";
import { MessageSquareText, Loader2, CheckCircle } from "lucide-react";

interface RestructureStatus {
  total: number;
  fixed: number;
  remaining: number;
  isRunning: boolean;
}

export default function RestructureButton() {
  const [status, setStatus] = useState<RestructureStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);

  async function fetchStatus() {
    try {
      const res = await fetch("/api/restructure");
      if (res.ok) setStatus(await res.json());
    } catch {}
  }

  useEffect(() => {
    fetchStatus();
  }, []);

  // Çalışırken her 5 saniyede güncelle
  useEffect(() => {
    if (!started) return;
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [started]);

  async function handleStart() {
    setLoading(true);
    try {
      const res = await fetch("/api/restructure", { method: "POST" });
      const data = await res.json();
      if (res.ok || res.status === 409) {
        setStarted(true);
        fetchStatus();
      } else {
        console.error(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (!status) return null;
  if (status.remaining === 0 && status.total > 0) return null; // hepsi düzeltilmiş

  return (
    <div className="bg-amber-50 border border-amber-100 rounded-2xl px-6 py-5 mb-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-medium text-amber-800 mb-1">Transkript Formatı</h2>
          <p className="text-xs text-amber-600">
            {status.fixed}/{status.total} kayıt sohbet formatına dönüştürüldü.
            {status.remaining > 0 && ` ${status.remaining} kayıt henüz düz metin.`}
          </p>
        </div>

        {status.remaining > 0 && (
          <button
            onClick={handleStart}
            disabled={loading || status.isRunning}
            className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white font-medium px-4 py-2 rounded-xl transition-colors text-xs shrink-0"
          >
            {loading || status.isRunning ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                İşleniyor...
              </>
            ) : (
              <>
                <MessageSquareText className="w-3.5 h-3.5" />
                Sohbet Formatına Dönüştür
              </>
            )}
          </button>
        )}

        {status.remaining === 0 && (
          <span className="inline-flex items-center gap-1 text-xs text-green-600">
            <CheckCircle className="w-3.5 h-3.5" />
            Tümü dönüştürüldü
          </span>
        )}
      </div>

      {(started || status.isRunning) && status.remaining > 0 && (
        <div className="mt-3">
          <div className="h-1.5 bg-amber-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-400 rounded-full transition-all duration-500"
              style={{ width: `${(status.fixed / status.total) * 100}%` }}
            />
          </div>
          <p className="text-[10px] text-amber-500 mt-1">
            Her kayıt ~1.5sn sürer. {status.remaining} kalan ≈ {Math.ceil((status.remaining * 1.5) / 60)} dk
          </p>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { ShieldCheck, Loader2 } from "lucide-react";
import { useCalls } from "@/providers/CallsProvider";

const COUNT_OPTIONS = [
  { label: "10", value: 10 },
  { label: "20", value: 20 },
  { label: "30", value: 30 },
  { label: "50", value: 50 },
  { label: "100", value: 100 },
  { label: "200", value: 200 },
  { label: "Tümü", value: -1 },
];

// 30 saniye ≈ 65 kelime (130 kelime/dk)
function isLongEnough(transcript: string): boolean {
  return transcript.trim().split(/\s+/).length >= 65;
}

export default function ComplianceChecker() {
  const { calls, loading } = useCalls();
  const [selectedCount, setSelectedCount] = useState(10);
  const [running, setRunning] = useState(false);
  const [started, setStarted] = useState(false);

  // Anlık stats — calls bellekten geliyor, sıfır ek istek
  const completedCalls = calls.filter((c) => c.status === "completed");
  const longEnough = completedCalls.filter((c) => c.transcript && isLongEnough(c.transcript));
  const checked = longEnough.filter((c) => c.compliance);
  const unchecked = longEnough.length - checked.length;
  const percent = longEnough.length > 0 ? Math.round((checked.length / longEnough.length) * 100) : 0;

  async function handleStart() {
    setRunning(true);
    setStarted(true);
    try {
      await fetch("/api/compliance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: selectedCount }),
      });
      // onSnapshot zaten yeni compliance verilerini çekecek
      setTimeout(() => setRunning(false), 3000);
    } catch {
      setRunning(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 px-5 py-5 mb-6">
      {/* Üst satır */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-4 mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-4 h-4 text-[#0071E3] shrink-0" />
            <h2 className="text-sm font-medium text-gray-700">Yönerge Uygunluğu</h2>
          </div>
          <p className="text-xs text-gray-400">
            {loading ? (
              "Yükleniyor..."
            ) : (
              <>
                {checked.length}/{longEnough.length} çağrı kontrol edildi
                {unchecked > 0 && ` · ${unchecked} bekliyor`}
                {" · 30sn+ olan çağrılar"}
              </>
            )}
          </p>
        </div>

        {/* Sayı seçici + buton */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 shrink-0">
          {/* Sayı seçici — mobilde wrap */}
          <div className="flex flex-wrap items-center gap-1 bg-gray-50 rounded-xl p-1">
            {COUNT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSelectedCount(opt.value)}
                className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
                  selectedCount === opt.value
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            onClick={handleStart}
            disabled={running || unchecked === 0 || loading}
            className="inline-flex items-center gap-1.5 bg-[#0071E3] hover:bg-[#0077ED] disabled:bg-gray-200 disabled:text-gray-400 text-white text-xs font-medium px-4 py-2 rounded-xl transition-colors whitespace-nowrap"
          >
            {running ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" />Analiz ediliyor...</>
            ) : (
              <><ShieldCheck className="w-3.5 h-3.5" />Uygunluğu Test Et</>
            )}
          </button>
        </div>
      </div>

      {/* Progress bar */}
      {(loading || longEnough.length > 0) && (
        <div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            {loading ? (
              <div className="h-full bg-gray-200 rounded-full animate-pulse w-1/3" />
            ) : (
              <div
                className="h-full bg-[#0071E3] rounded-full transition-all duration-500"
                style={{ width: `${percent}%` }}
              />
            )}
          </div>
          <p className="text-[10px] text-gray-400 mt-1">
            {loading ? "Veriler yükleniyor..." : `${percent}% tamamlandı`}
          </p>
        </div>
      )}
    </div>
  );
}

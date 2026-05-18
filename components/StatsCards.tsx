"use client";

import type { CallRecord } from "@/lib/types";

interface StatsCardsProps {
  calls: CallRecord[];
  wavTotal?: number | null; // Drive'dan gelen toplam WAV sayısı
  wavLoading?: boolean;
}

export default function StatsCards({ calls, wavTotal, wavLoading }: StatsCardsProps) {
  const processed = calls.length;
  const completedCalls = calls.filter((c) => c.status === "completed");
  const completed = completedCalls.length;
  const errors = calls.filter((c) => c.status === "error").length;
  const processing = calls.filter(
    (c) => c.status === "pending" || c.status === "processing"
  ).length;

  // Toplam: Drive'dan gelen sayı varsa onu kullan, yoksa işlenenleri göster
  const totalValue = wavTotal ?? processed;
  const totalLabel = wavTotal != null ? "Toplam Çağrı" : "Toplam Çağrı";

  // Yönerge analizi yapılanlar vs yapılmayanlar (kısa çağrı / IVR)
  const analyzed = completedCalls.filter((c) => c.compliance && !c.compliance.notEvaluable).length;
  const notAnalyzed = completedCalls.filter((c) => c.compliance?.notEvaluable).length;

  const stats = [
    {
      label: totalLabel,
      value: wavLoading ? null : totalValue,
      color: "text-gray-900",
      bg: "bg-white",
    },
    {
      label: "Tamamlanan",
      value: completed,
      color: "text-green-600",
      bg: "bg-white",
    },
    {
      label: "Analiz Edildi",
      value: analyzed,
      color: "text-[#0071E3]",
      bg: "bg-white",
    },
    {
      label: "Analiz Dışı",
      value: notAnalyzed,
      color: "text-gray-400",
      bg: "bg-white",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className={`${stat.bg} rounded-2xl px-4 sm:px-6 py-4 sm:py-5 border border-gray-100`}
        >
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">
            {stat.label}
          </p>
          {stat.value === null ? (
            <div className="h-8 w-16 bg-gray-100 rounded-lg animate-pulse mt-1" />
          ) : (
            <p className={`text-3xl font-semibold ${stat.color}`}>{stat.value}</p>
          )}
        </div>
      ))}
    </div>
  );
}

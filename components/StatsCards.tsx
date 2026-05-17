"use client";

import type { CallRecord } from "@/lib/types";

interface StatsCardsProps {
  calls: CallRecord[];
}

export default function StatsCards({ calls }: StatsCardsProps) {
  const total = calls.length;
  const completed = calls.filter((c) => c.status === "completed").length;
  const errors = calls.filter((c) => c.status === "error").length;
  const processing = calls.filter(
    (c) => c.status === "pending" || c.status === "processing"
  ).length;

  const stats = [
    {
      label: "Toplam Çağrı",
      value: total,
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
      label: "İşleniyor",
      value: processing,
      color: "text-blue-600",
      bg: "bg-white",
    },
    {
      label: "Hata",
      value: errors,
      color: "text-red-500",
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
          <p className={`text-3xl font-semibold ${stat.color}`}>{stat.value}</p>
        </div>
      ))}
    </div>
  );
}

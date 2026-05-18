"use client";

import { useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useFolders } from "@/providers/FoldersProvider";

export default function DailyChart() {
  const { folders, getFolderDetail, folderDetailLoading, loadFolderDetail } = useFolders();

  // Tüm klasörlerin detaylarını yükle (cache varsa tekrar atma)
  useEffect(() => {
    folders.forEach((f) => loadFolderDetail(f.name));
  }, [folders, loadFolderDetail]);

  const chartData = [...folders]
    .sort((a, b) => a.name.localeCompare(b.name)) // Kronolojik sıra
    .map((folder) => {
      const detail = getFolderDetail(folder.name);
      const loading = folderDetailLoading(folder.name);
      return {
        name: `${parseInt(folder.name.slice(6, 8))} ${folder.dayName.slice(0, 3)}`,
        total: detail?.wavCount ?? null,
        loading,
      };
    });

  const hasData = chartData.some((d) => d.total !== null);
  const isLoading = chartData.some((d) => d.loading && d.total === null);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 px-6 py-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-medium text-gray-700">Günlük Çağrı Hacmi</h2>
          <p className="text-xs text-gray-400 mt-0.5">Drive'dan gelen toplam ses dosyası sayısı</p>
        </div>
        {isLoading && (
          <span className="text-xs text-gray-400 animate-pulse">Yükleniyor...</span>
        )}
      </div>

      {!hasData && isLoading ? (
        <div className="h-40 flex items-center justify-center">
          <div className="flex gap-1">
            {[1,2,3].map((i) => (
              <div key={i} className="w-2 h-2 rounded-full bg-gray-200 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                background: "white",
                border: "1px solid #f0f0f0",
                borderRadius: "12px",
                fontSize: "12px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              }}
              formatter={(value) => [value, "Çağrı"]}
            />
            <Line
              type="monotone"
              dataKey="total"
              stroke="#0071E3"
              strokeWidth={2}
              dot={{ fill: "#0071E3", r: 4 }}
              activeDot={{ r: 6 }}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

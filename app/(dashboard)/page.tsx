"use client";

import { useRouter } from "next/navigation";
import { CheckCircle2, AlertCircle, Clock, ChevronRight, Folder } from "lucide-react";
import DailyChart from "@/components/DailyChart";
import { useFolders } from "@/providers/FoldersProvider";

export default function Dashboard() {
  const router = useRouter();
  const { folders, loading, error } = useFolders();

  return (
    <div className="px-6 py-8 max-w-4xl">
      {/* Başlık */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Dashboard</h1>
        <p className="text-sm text-gray-400 mt-1">Günlük çağrı klasörleri ve analiz durumu</p>
      </div>

      {/* Line Chart */}
      <DailyChart />

      {/* Klasör Listesi */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <h2 className="text-sm font-medium text-gray-700">Çağrı Klasörleri</h2>
        </div>

        {loading ? (
          <div className="py-16 text-center text-sm text-gray-300">Yükleniyor...</div>
        ) : error ? (
          <div className="py-16 text-center text-sm text-red-400">{error}</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {folders.map((folder, i) => {
              const isEven = i % 2 === 0;
              const isProcessed = folder.stats.completed > 0;
              return (
                <button
                  key={folder.id}
                  onClick={() => router.push(`/folders/${folder.name}`)}
                  className={`w-full flex items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-blue-50 cursor-pointer ${isEven ? "bg-white" : "bg-gray-50/60"}`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isProcessed ? "bg-blue-50" : "bg-gray-100"}`}>
                    <Folder className={`w-5 h-5 ${isProcessed ? "text-[#0071E3]" : "text-gray-400"}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900">{folder.dayName}</p>
                      <span className="text-xs text-gray-400">{folder.date}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      {folder.stats.completed > 0 && (
                        <span className="flex items-center gap-1 text-[11px] text-green-600">
                          <CheckCircle2 className="w-3 h-3" />
                          {folder.stats.completed} tamamlandı
                        </span>
                      )}
                      {folder.stats.errors > 0 && (
                        <span className="flex items-center gap-1 text-[11px] text-red-500">
                          <AlertCircle className="w-3 h-3" />
                          {folder.stats.errors} hata
                        </span>
                      )}
                      {folder.stats.pending > 0 && (
                        <span className="flex items-center gap-1 text-[11px] text-blue-500">
                          <Clock className="w-3 h-3" />
                          {folder.stats.pending} bekliyor
                        </span>
                      )}
                      {folder.stats.total === 0 && (
                        <span className="text-[11px] text-gray-400">Henüz işlenmedi</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-mono text-gray-300">{folder.name}</span>
                    <ChevronRight className="w-4 h-4 text-gray-300" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

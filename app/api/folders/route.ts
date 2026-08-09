import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

function formatFolderDate(yyyymmdd: string): { date: string; dayName: string } {
  const year = parseInt(yyyymmdd.slice(0, 4));
  const month = parseInt(yyyymmdd.slice(4, 6)) - 1;
  const day = parseInt(yyyymmdd.slice(6, 8));
  const d = new Date(year, month, day);
  const date = d.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
  const dayRaw = d.toLocaleDateString("tr-TR", { weekday: "long" });
  const dayName = dayRaw.charAt(0).toUpperCase() + dayRaw.slice(1);
  return { date, dayName };
}

export async function GET() {
  try {
    // Not: Önceden "bugünden geriye son 60 gün" ile filtreleniyordu. Bu, veri
    // 60 günden eskiyse (örn. işlenen çağrılar geçmişte kaldıysa) klasörlerin
    // hiç görünmemesine sebep oluyordu. Artık Firestore'da fiilen var olan
    // tüm folderDate'ler üzerinden hesaplanıyor — yaş sınırı yok.
    // select() ile sadece gerekli alanları çekip transcript gibi büyük
    // alanları taşımadan hafif tutuyoruz.
    const snap = await adminDb.collection("calls").select("folderDate", "status").get();

    const statsMap: Record<string, { total: number; completed: number; errors: number; pending: number }> = {};
    for (const doc of snap.docs) {
      const data = doc.data();
      const fd = data.folderDate as string | undefined;
      if (!fd) continue;
      if (!statsMap[fd]) statsMap[fd] = { total: 0, completed: 0, errors: 0, pending: 0 };
      statsMap[fd].total++;
      if (data.status === "completed") statsMap[fd].completed++;
      else if (data.status === "error") statsMap[fd].errors++;
      else statsMap[fd].pending++;
    }

    const folders = Object.keys(statsMap)
      .sort((a, b) => b.localeCompare(a)) // En yeni üstte
      .map((name) => {
        const { date, dayName } = formatFolderDate(name);
        return { id: name, name, date, dayName, stats: statsMap[name] };
      });

    return NextResponse.json({ folders });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

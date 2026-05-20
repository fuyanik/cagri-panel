import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

// Son 60 günün YYYYMMDD listesini üret (bugün dahil)
function generateRecentDates(days = 60): Array<{ name: string; date: string; dayName: string }> {
  const result = [];
  const d = new Date();
  for (let i = 0; i < days; i++) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const name = `${yyyy}${mm}${dd}`;
    const date = d.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
    const dayRaw = d.toLocaleDateString("tr-TR", { weekday: "long" });
    const dayName = dayRaw.charAt(0).toUpperCase() + dayRaw.slice(1);
    result.push({ name, date, dayName });
    d.setDate(d.getDate() - 1);
  }
  return result;
}

export async function GET() {
  try {
    const dates = generateRecentDates(60);

    // Firestore'da en az 1 kaydı olan klasörleri bul
    const allCallsSnap = await adminDb
      .collection("calls")
      .where("folderDate", "in", dates.slice(0, 30).map((d) => d.name))
      .get();

    // folderDate → istatistik map'i
    const statsMap: Record<string, { total: number; completed: number; errors: number; pending: number }> = {};
    for (const doc of allCallsSnap.docs) {
      const data = doc.data();
      const fd = data.folderDate as string;
      if (!statsMap[fd]) statsMap[fd] = { total: 0, completed: 0, errors: 0, pending: 0 };
      statsMap[fd].total++;
      if (data.status === "completed") statsMap[fd].completed++;
      else if (data.status === "error") statsMap[fd].errors++;
      else statsMap[fd].pending++;
    }

    // 30 günlük ikinci batch (Firestore'da "in" max 30 item)
    if (dates.length > 30) {
      const secondSnap = await adminDb
        .collection("calls")
        .where("folderDate", "in", dates.slice(30, 60).map((d) => d.name))
        .get();
      for (const doc of secondSnap.docs) {
        const data = doc.data();
        const fd = data.folderDate as string;
        if (!statsMap[fd]) statsMap[fd] = { total: 0, completed: 0, errors: 0, pending: 0 };
        statsMap[fd].total++;
        if (data.status === "completed") statsMap[fd].completed++;
        else if (data.status === "error") statsMap[fd].errors++;
        else statsMap[fd].pending++;
      }
    }

    // Sadece Firestore'da kaydı olan günleri döndür
    const folders = dates
      .filter((d) => statsMap[d.name])
      .map((d) => ({
        id: d.name,
        name: d.name,
        date: d.date,
        dayName: d.dayName,
        stats: statsMap[d.name],
      }));

    return NextResponse.json({ folders });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

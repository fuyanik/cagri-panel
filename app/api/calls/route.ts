import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET() {
  try {
    const snapshot = await adminDb
      .collection("calls")
      .orderBy("createdAt", "desc")
      .limit(500)
      .get();

    const calls = snapshot.docs.map((doc) => {
      const d = doc.data();
      // compliance.checkedAt Firestore Timestamp olarak gelir, serialize et
      const compliance = d.compliance
        ? {
            ...d.compliance,
            checkedAt: d.compliance.checkedAt?.toDate?.()?.toISOString() ?? null,
          }
        : undefined;

      return {
        id: doc.id,
        ...d,
        createdAt: d.createdAt?.toDate?.()?.toISOString() ?? null,
        processedAt: d.processedAt?.toDate?.()?.toISOString() ?? null,
        compliance,
      };
    });

    return NextResponse.json({ calls });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("Calls API hatası:", errorMsg);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

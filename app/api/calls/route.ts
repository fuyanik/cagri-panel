import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET() {
  try {
    const snapshot = await adminDb
      .collection("calls")
      .orderBy("createdAt", "desc")
      .limit(500)
      .get();

    const calls = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() ?? null,
      processedAt: doc.data().processedAt?.toDate?.()?.toISOString() ?? null,
    }));

    return NextResponse.json({ calls });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("Calls API hatası:", errorMsg);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

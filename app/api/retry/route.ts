import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

// Tek bir çağrıyı veya tüm hatalıları pending'e al
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const callId = body.callId as string | undefined;

    if (callId) {
      // Tek kayıt
      const doc = await adminDb.collection("calls").doc(callId).get();
      if (!doc.exists) {
        return NextResponse.json({ error: "Kayıt bulunamadı" }, { status: 404 });
      }
      await doc.ref.update({
        status: "pending",
        errorMessage: null,
        processedAt: null,
      });
      return NextResponse.json({ reset: 1 });
    }

    // Tüm hatalılar
    const snapshot = await adminDb
      .collection("calls")
      .where("status", "==", "error")
      .get();

    if (snapshot.empty) {
      return NextResponse.json({ reset: 0, message: "Hatalı kayıt yok" });
    }

    const batch = adminDb.batch();
    snapshot.docs.forEach((doc) => {
      batch.update(doc.ref, {
        status: "pending",
        errorMessage: null,
        processedAt: null,
      });
    });
    await batch.commit();

    return NextResponse.json({ reset: snapshot.size });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

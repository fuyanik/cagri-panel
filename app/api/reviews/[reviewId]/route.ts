import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import admin from "firebase-admin";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ reviewId: string }> }
) {
  try {
    const { reviewId } = await params;
    const body = await request.json();
    const comment = typeof body.comment === "string" ? body.comment.trim() : "";

    if (!comment) {
      return NextResponse.json({ error: "comment zorunlu" }, { status: 400 });
    }

    const ref = adminDb.collection("callReviews").doc(reviewId);
    const doc = await ref.get();
    if (!doc.exists) {
      return NextResponse.json({ error: "Yorum bulunamadı" }, { status: 404 });
    }

    await ref.update({
      comment,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ reviewId: string }> }
) {
  try {
    const { reviewId } = await params;
    const ref = adminDb.collection("callReviews").doc(reviewId);
    const doc = await ref.get();
    if (!doc.exists) {
      return NextResponse.json({ error: "Yorum bulunamadı" }, { status: 404 });
    }

    await ref.delete();
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

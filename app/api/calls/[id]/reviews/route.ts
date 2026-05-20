import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import admin from "firebase-admin";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const snap = await adminDb
      .collection("callReviews")
      .where("callId", "==", id)
      .get();

    const reviews = snap.docs
      .map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
        };
      })
      .sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return ta - tb;
      });

    return NextResponse.json(reviews);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const { type, comment, violations } = body as {
      type: "general" | "violation";
      comment: string;
      violations?: { rule: string; detail: string; critical: boolean }[];
    };

    if (!type || !comment?.trim()) {
      return NextResponse.json({ error: "type ve comment zorunlu" }, { status: 400 });
    }

    const base = {
      callId: id,
      type,
      comment: comment.trim(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (type === "violation" && violations?.length) {
      const batch = adminDb.batch();
      const ids: string[] = [];
      for (const v of violations) {
        const ref = adminDb.collection("callReviews").doc();
        batch.set(ref, {
          ...base,
          violationRule: v.rule,
          violationDetail: v.detail,
          violationCritical: v.critical,
        });
        ids.push(ref.id);
      }
      await batch.commit();
      return NextResponse.json({ ids });
    }

    const ref = await adminDb.collection("callReviews").add(base);
    return NextResponse.json({ id: ref.id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { collection, query, orderBy, limit, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase-client";
import type { CallRecord } from "@/lib/types";

// Not: "calls" koleksiyonu büyüdükçe (günlük yüzlerce kayıt) tüm geçmişi tek
// seferde çekmek yerine en yeni N kaydı gösteriyoruz. Bu sınırın altında
// kalan (daha eski) kayıtlar bu listede yer almaz — örn. çok eski bir günün
// klasör detay sayfası eksik görünebilir. "Kaydedilenler" bu sınırdan
// bağımsız çalışsın diye aşağıda ayrı, küçük bir sorgu ile besleniyor.
const RECENT_CALLS_LIMIT = 5000;

interface CallsContextValue {
  calls: CallRecord[];
  loading: boolean;
  error: string | null;
  savedCalls: CallRecord[];
  savedLoading: boolean;
  savedError: string | null;
}

const CallsContext = createContext<CallsContextValue>({
  calls: [],
  loading: true,
  error: null,
  savedCalls: [],
  savedLoading: true,
  savedError: null,
});

function mapDoc(doc: { id: string; data: () => Record<string, unknown> }): CallRecord {
  const d = doc.data() as Record<string, unknown> & {
    createdAt?: { toDate?: () => Date };
    processedAt?: { toDate?: () => Date };
  };
  return {
    id: doc.id,
    ...d,
    createdAt: d.createdAt?.toDate?.() ?? new Date(),
    processedAt: d.processedAt?.toDate?.() ?? undefined,
  } as CallRecord;
}

export function CallsProvider({ children }: { children: ReactNode }) {
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [savedCalls, setSavedCalls] = useState<CallRecord[]>([]);
  const [savedLoading, setSavedLoading] = useState(true);
  const [savedError, setSavedError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, "calls"),
      orderBy("createdAt", "desc"),
      limit(RECENT_CALLS_LIMIT)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setCalls(snapshot.docs.map(mapDoc));
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("Firestore onSnapshot hatası:", err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // "Kaydedilenler" — koleksiyonun toplam büyüklüğünden bağımsız olarak
  // saved=true olan çağrıların HEPSİ. Kayıt sayısı az olduğu için (bookmark)
  // ayrı ve hafif bir sorgu ile her zaman tam liste garanti edilir.
  useEffect(() => {
    const q = query(collection(db, "calls"), where("saved", "==", true));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setSavedCalls(snapshot.docs.map(mapDoc));
        setSavedLoading(false);
        setSavedError(null);
      },
      (err) => {
        console.error("Firestore saved-calls onSnapshot hatası:", err);
        setSavedError(err.message);
        setSavedLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return (
    <CallsContext.Provider value={{ calls, loading, error, savedCalls, savedLoading, savedError }}>
      {children}
    </CallsContext.Provider>
  );
}

export function useCalls() {
  return useContext(CallsContext);
}

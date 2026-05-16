"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase-client";
import type { CallRecord } from "@/lib/types";

interface CallsContextValue {
  calls: CallRecord[];
  loading: boolean;
  error: string | null;
}

const CallsContext = createContext<CallsContextValue>({
  calls: [],
  loading: true,
  error: null,
});

export function CallsProvider({ children }: { children: ReactNode }) {
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, "calls"),
      orderBy("createdAt", "desc"),
      limit(1000)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => {
          const d = doc.data();
          return {
            id: doc.id,
            ...d,
            createdAt: d.createdAt?.toDate?.() ?? new Date(),
            processedAt: d.processedAt?.toDate?.() ?? undefined,
          } as CallRecord;
        });
        setCalls(data);
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

  return (
    <CallsContext.Provider value={{ calls, loading, error }}>
      {children}
    </CallsContext.Provider>
  );
}

export function useCalls() {
  return useContext(CallsContext);
}

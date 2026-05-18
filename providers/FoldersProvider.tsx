"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";

interface FolderStats {
  total: number;
  completed: number;
  errors: number;
  pending: number;
}

export interface DailyFolder {
  id: string;
  name: string;
  date: string;
  dayName: string;
  stats: FolderStats;
}

export interface FolderDetail {
  wavCount: number;
  folderId: string;
  completed: number;
  errors: number;
  pending: number;
  total: number;
}

interface FoldersContextValue {
  folders: DailyFolder[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
  // Per-folder Drive stats cache
  getFolderDetail: (name: string) => FolderDetail | null;
  folderDetailLoading: (name: string) => boolean;
  loadFolderDetail: (name: string) => Promise<void>;
}

const FoldersContext = createContext<FoldersContextValue>({
  folders: [],
  loading: true,
  error: null,
  refresh: () => {},
  getFolderDetail: () => null,
  folderDetailLoading: () => false,
  loadFolderDetail: async () => {},
});

export function FoldersProvider({ children }: { children: ReactNode }) {
  const [folders, setFolders] = useState<DailyFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Cache: folderName → FolderDetail
  const [detailCache, setDetailCache] = useState<Record<string, FolderDetail>>({});
  const [detailLoading, setDetailLoading] = useState<Record<string, boolean>>({});

  async function fetchFolders() {
    try {
      const res = await fetch("/api/folders");
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setFolders(data.folders);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bağlantı hatası");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchFolders(); }, []);

  const loadFolderDetail = useCallback(async (name: string) => {
    // Zaten cache'teyse veya yükleniyorsa tekrar istek atma
    if (detailCache[name] || detailLoading[name]) return;

    setDetailLoading((prev) => ({ ...prev, [name]: true }));
    try {
      const res = await fetch(`/api/folders/${name}`);
      const data = await res.json();
      if (res.ok) {
        setDetailCache((prev) => ({ ...prev, [name]: data as FolderDetail }));
      }
    } catch {}
    finally {
      setDetailLoading((prev) => ({ ...prev, [name]: false }));
    }
  }, [detailCache, detailLoading]);

  return (
    <FoldersContext.Provider value={{
      folders, loading, error,
      refresh: fetchFolders,
      getFolderDetail: (name) => detailCache[name] ?? null,
      folderDetailLoading: (name) => detailLoading[name] ?? false,
      loadFolderDetail,
    }}>
      {children}
    </FoldersContext.Provider>
  );
}

export function useFolders() {
  return useContext(FoldersContext);
}

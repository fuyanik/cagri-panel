"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Bookmark, LogOut, User, Folder, LayoutDashboard, ChevronDown } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { useFolders } from "@/providers/FoldersProvider";
import { signOut, sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase-client";
import Image from "next/image";

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { folders } = useFolders();
  const [resetSent, setResetSent] = useState(false);

  async function handlePasswordReset() {
    if (!user?.email) return;
    try {
      await sendPasswordResetEmail(auth, user.email);
      setResetSent(true);
      setTimeout(() => setResetSent(false), 4000);
    } catch {}
  }

  function isActive(path: string) {
    return pathname === path || pathname.startsWith(path + "/");
  }

  return (
    <aside className="w-64 shrink-0 hidden lg:flex flex-col h-screen sticky top-0 bg-white border-r border-gray-100">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-gray-50">
        <div className="flex items-center gap-3">
          {/* Logo: public/logo.png varsa göster, yoksa metin */}
          <div className="w-14 h-14 rounded-xl bg-[#1B3A6B] flex items-center justify-center shrink-0 overflow-hidden">
            <Image
              src="https://www.acarhd.com/themes/default/assets/img/logo.png"
              alt="Acar"
              width={56}
              height={56}
              className="object-contain"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          </div>
          <div>
            <p className="text-sm font-bold text-[#1B3A6B] leading-tight">ACAR</p>
            <p className="text-[10px] text-gray-400 leading-tight">Hukuk & Danışmanlık</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-3 mb-2">Genel</p>

        <Link
          href="/"
          className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors mb-1 ${
            pathname === "/" ? "bg-[#0071E3] text-white" : "text-gray-600 hover:bg-gray-50"
          }`}
        >
          <LayoutDashboard className="w-4 h-4 shrink-0" />
          Dashboard
        </Link>

        <Link
          href="/saved"
          className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors mb-3 ${
            isActive("/saved") ? "bg-[#0071E3] text-white" : "text-gray-600 hover:bg-gray-50"
          }`}
        >
          <Bookmark className="w-4 h-4 shrink-0" />
          Kaydedilenler
        </Link>

        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-3 mb-2">Günlük Klasörler</p>

        {folders.map((folder) => {
          const active = isActive(`/folders/${folder.name}`);
          return (
            <Link
              key={folder.id}
              href={`/folders/${folder.name}`}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-colors mb-0.5 ${
                active ? "bg-blue-50 text-[#0071E3] font-medium" : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              <Folder className="w-4 h-4 shrink-0" />
              <span className="truncate flex-1">{folder.dayName}</span>
              <span className="text-[10px] text-gray-400 shrink-0">{folder.name.slice(6, 8)}/{folder.name.slice(4, 6)}</span>
            </Link>
          );
        })}
      </nav>

      {/* Kullanıcı */}
      <div className="px-4 py-4 border-t border-gray-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#0071E3] flex items-center justify-center shrink-0">
            <User className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-gray-700 truncate">{user?.email}</p>
            <button onClick={handlePasswordReset} className="text-[10px] text-[#0071E3] hover:underline">
              {resetSent ? "✓ Link gönderildi" : "Şifre değiştir"}
            </button>
          </div>
          <button onClick={() => signOut(auth)} title="Çıkış" className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors shrink-0">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

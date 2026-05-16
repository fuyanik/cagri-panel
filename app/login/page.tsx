"use client";

import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase-client";
import { Eye, EyeOff, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // AuthGuard yönlendirecek
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found") {
        setError("E-posta veya şifre hatalı.");
      } else if (code === "auth/too-many-requests") {
        setError("Çok fazla deneme yapıldı. Lütfen bekleyin.");
      } else {
        setError("Giriş yapılamadı. Tekrar deneyin.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo / başlık */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
            Çağrı Analiz Paneli
          </h1>
          <p className="text-sm text-gray-400 mt-1">Devam etmek için giriş yapın</p>
        </div>

        {/* Form kartı */}
        <div className="bg-white rounded-2xl border border-gray-100 px-8 py-8">
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">
                E-posta
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="ornek@mail.com"
                className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-100 rounded-xl outline-none focus:border-[#0071E3] focus:bg-white transition-colors"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">
                Şifre
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 pr-10 text-sm bg-gray-50 border border-gray-100 rounded-xl outline-none focus:border-[#0071E3] focus:bg-white transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-xs text-red-500 bg-red-50 px-3.5 py-2.5 rounded-xl">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0071E3] hover:bg-[#0077ED] disabled:bg-gray-200 disabled:text-gray-400 text-white font-medium py-2.5 rounded-xl transition-colors text-sm mt-1"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Giriş yapılıyor...
                </span>
              ) : (
                "Giriş Yap"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

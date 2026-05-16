import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { CallsProvider } from "@/providers/CallsProvider";
import { AuthProvider } from "@/providers/AuthProvider";
import { AuthGuard } from "@/components/AuthGuard";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Çağrı Analiz Paneli",
  description: "Çağrı merkezi konuşma analizi",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body className={inter.className}>
        <AuthProvider>
          <AuthGuard>
            <CallsProvider>{children}</CallsProvider>
          </AuthGuard>
        </AuthProvider>
      </body>
    </html>
  );
}

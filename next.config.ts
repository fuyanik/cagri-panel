import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["firebase-admin", "googleapis", "groq-sdk", "assemblyai"],
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["firebase-admin", "googleapis", "assemblyai", "@deepgram/sdk"],
};

export default nextConfig;

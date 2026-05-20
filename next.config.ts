import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["firebase-admin", "googleapis", "assemblyai", "@deepgram/sdk"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.acarhd.com",
      },
    ],
  },
};

export default nextConfig;

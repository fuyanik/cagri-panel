import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["firebase-admin", "googleapis"],
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

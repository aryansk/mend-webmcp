import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/repositories/**/*": ["./demo-repo/**/*"],
    "/api/fixes/**/*": ["./demo-repo/**/*"],
  },
  reactStrictMode: true,
};

export default nextConfig;

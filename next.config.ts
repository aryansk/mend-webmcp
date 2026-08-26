import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/repositories/**/*": ["./demo-repo/**/*"],
  },
  reactStrictMode: true,
};

export default nextConfig;

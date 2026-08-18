import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  poweredByHeader: false,
  reactStrictMode: true,
  typescript: {
    tsconfigPath: "tsconfig.build.json",
  },
};

export default nextConfig;

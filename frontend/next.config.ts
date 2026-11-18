import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // ESLint isn't set up in this project; TypeScript still type-checks every build.
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;

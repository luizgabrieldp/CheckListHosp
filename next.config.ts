import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Enable modern features
  experimental: {
    // serverActions is enabled by default in Next 15
  },
};

export default nextConfig;

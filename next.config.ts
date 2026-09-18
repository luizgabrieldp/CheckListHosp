import type { NextConfig } from "next";

const isGitHubPages =
  process.env.GITHUB_ACTIONS === "true" ||
  process.env.NEXT_PUBLIC_IS_GH_PAGES === "true";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "export",
  basePath: isGitHubPages ? "/CheckListHosp" : "",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;

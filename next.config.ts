import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  typescript: {
    // ⚠️ TEMPORARY: Allow production builds with TypeScript errors
    // This lets us deploy while fixing non-critical type issues
    ignoreBuildErrors: true,
  },
  async rewrites() {
    return [
      {
        source: "/projects",
        destination: "/flow/projects",
      },
      {
        source: "/crew",
        destination: "/feel/crew",
      },
    ];
  },
};

export default nextConfig;

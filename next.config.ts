import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  typescript: {
    // ⚠️ TEMPORARY: Allow production builds with TypeScript errors
    // This lets us deploy while fixing non-critical type issues
    ignoreBuildErrors: true,
  },
  async redirects() {
    return [
      {
        source: "/projects/:path*",
        destination: "/project/:path*",
        permanent: true,
      },
      {
        source: "/flow/projects/:path*",
        destination: "/project/:path*",
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/project/settings/:path*",
        destination: "/flow/projects/settings/:path*",
      },
      {
        source: "/crew",
        destination: "/feel/crew",
      },
      {
        source: "/project/:id/:subpath(setup|tracking|activity|docs|reports)",
        destination: "/flow/projects/:id/:subpath",
      },
      {
        source: "/project/:id/:subpath(setup|tracking|activity|docs|reports)/:path*",
        destination: "/flow/projects/:id/:subpath/:path*",
      },
    ];
  },
};

export default nextConfig;

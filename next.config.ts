import type { NextConfig } from 'next';
const nextConfig: NextConfig = {
  reactCompiler: true,
  typescript: { ignoreBuildErrors: true },
  async redirects() {
    const legacyOrigin = 'https://from-adidaya-git-backend-adiday-b1d39d-adidaya-studios-projects.vercel.app';
    return [
      { source: '/legacy', destination: `${legacyOrigin}/dashboard`, permanent: false },
      { source: '/legacy/finance/:path*', destination: `${legacyOrigin}/flow/finance/:path*`, permanent: false },
      { source: '/legacy/projects/:path*', destination: `${legacyOrigin}/project/:path*`, permanent: false },
    ];
  },
  async rewrites() {
    return { beforeFiles: [
      { source: '/', destination: '/forma-index.html' },
      { source: '/:path((?!api(?:/|$)|_next(?:/|$)|.*\\.).*)', destination: '/forma-index.html' },
    ] };
  },
  async headers() {
    return [{ source: '/forma-index.html', headers: [{ key: 'Cache-Control', value: 'no-cache' }] }, { source: '/sw.js', headers: [{ key: 'Cache-Control', value: 'no-cache' }] }];
  },
};
export default nextConfig;

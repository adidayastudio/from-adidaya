import type { NextConfig } from 'next';
const nextConfig: NextConfig = {
  reactCompiler: true,
  typescript: { ignoreBuildErrors: true },
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

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow Pyodide to load from CDN
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'credentialless',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
        ],
      },
    ];
  },
  // Ensure static export works
  output: 'standalone',
};

export default nextConfig;

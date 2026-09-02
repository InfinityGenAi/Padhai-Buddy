import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: __dirname,
  // Changed from 'export' to enable server-side API routes
  // (e.g. /api/chat, /api/progress, /api/sessions, /admin/login)
  // dynamic = "force-static" can be added to specific routes that need static export
  trailingSlash: true,
  images: {
    contentDispositionType: "inline",
    localPatterns: [
      {
        pathname: "/brand/**",
        search: "",
      },
    ],
    remotePatterns: [],
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: "/brand/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "default-src 'none'; style-src 'unsafe-inline'",
          },
        ],
      },
      {
        source: "/manifest.json",
        headers: [
          {
            key: "Content-Type",
            value: "application/manifest+json",
          },
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;

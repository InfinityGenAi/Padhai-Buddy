import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: __dirname,
  output: 'export',
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
    const isDev = process.env.NODE_ENV === "development";
    const groqApiOrigin = "https://api.groq.com";
    const firebaseProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "infinity-gen-ai";
    const firebaseAuthDomain = `${firebaseProjectId}.firebaseapp.com`;

    const cspDirectives = [
      "default-src 'self'",
      `script-src 'self'${isDev ? " 'unsafe-eval'" : ""} 'unsafe-inline' https://apis.google.com https://www.gstatic.com https://apis.google.com`,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      "img-src 'self' data: blob: https://firebasestorage.googleapis.com https://lh3.googleusercontent.com https://www.gstatic.com",
      `connect-src 'self' https://${firebaseAuthDomain} https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://firestore.googleapis.com https://www.googleapis.com ${groqApiOrigin} wss://${firebaseProjectId}.firebaseio.com`,
      `frame-src 'self' https://accounts.google.com https://${firebaseAuthDomain}`,
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      ...(!isDev ? ["upgrade-insecure-requests"] : []),
    ];

    const cspValue = cspDirectives.join("; ");

    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: cspValue },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
          ...(!isDev ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" }] : []),
        ],
      },
      {
        source: "/manifest.json",
        headers: [
          { key: "Content-Type", value: "application/manifest+json" },
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

export default nextConfig;
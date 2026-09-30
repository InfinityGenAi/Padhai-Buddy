import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

const isCapacitorBuild = process.env.CAPACITOR_BUILD === 'true';

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: __dirname,
  // Enable static export for Capacitor builds (CAPACITOR_BUILD=true)
  // For production server builds, API routes are dynamic
  output: isCapacitorBuild ? 'export' : undefined,
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
    // Determine CSP based on environment
    const isDev = process.env.NODE_ENV === "development";
    const useEmulators = process.env.NEXT_PUBLIC_USE_EMULATORS === "true";
    const groqApiOrigin = "https://api.groq.com";
    const firebaseProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "infinity-gen-ai";
    const firebaseAuthDomain = `${firebaseProjectId}.firebaseapp.com`;

    // CSP directives - kept as restrictive as possible while supporting Firebase Auth, Google Sign-in, Groq AI, and Next.js
    const cspDirectives = [
      "default-src 'self'",
      // Scripts: Next.js needs 'self' and 'unsafe-eval' for dev (HMR), 'unsafe-inline' for inline scripts
      `script-src 'self'${isDev ? " 'unsafe-eval'" : ""} 'unsafe-inline' https://apis.google.com https://www.gstatic.com https://apis.google.com`,
      // Styles: Framer Motion and inline styles need 'unsafe-inline'
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      // Fonts: Google Fonts (if used) + self
      "font-src 'self' data: https://fonts.gstatic.com",
      // Images: self, data URIs, blob: (for local previews), Firebase Storage, Google profile images
      "img-src 'self' data: blob: https://firebasestorage.googleapis.com https://lh3.googleusercontent.com https://www.gstatic.com",
      // Connect: Firebase Auth/Google Sign-in, Firestore, Groq AI, Next.js HMR
      // In emulator mode, also allow local Firebase emulator endpoints
      useEmulators
        ? `connect-src 'self' http://localhost:9099 http://127.0.0.1:9099 http://localhost:8080 http://127.0.0.1:8080 https://${firebaseAuthDomain} https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://firestore.googleapis.com https://www.googleapis.com ${groqApiOrigin} wss://${firebaseProjectId}.firebaseio.com`
        : `connect-src 'self' https://${firebaseAuthDomain} https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://firestore.googleapis.com https://www.googleapis.com ${groqApiOrigin} wss://${firebaseProjectId}.firebaseio.com`,
      // Frames: Google Sign-in popup + Firebase Auth domain for popup redirect
      // In emulator mode, also allow local Firebase Auth emulator
      useEmulators
        ? `frame-src 'self' http://localhost:9099 http://127.0.0.1:9099 https://accounts.google.com https://${firebaseAuthDomain}`
        : `frame-src 'self' https://accounts.google.com https://${firebaseAuthDomain}`,
      // Object: none
      "object-src 'none'",
      // Base URI: self
      "base-uri 'self'",
      // Form action: self
      "form-action 'self'",
      // Frame ancestors: deny
      "frame-ancestors 'none'",
      // Upgrade insecure requests in production (not in emulator mode)
      ...(!isDev && !useEmulators ? ["upgrade-insecure-requests"] : []),
    ];

    const cspValue = cspDirectives.join("; ");

    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: cspValue,
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
          // HSTS only in production (HTTPS), not in emulator mode
          ...(!isDev && !useEmulators ? [{
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          }] : []),
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
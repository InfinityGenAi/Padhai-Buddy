import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Padhai Buddy — Your AI Study Buddy",
  description: "Your AI study buddy for every doubt, every subject, every board. Get instant step-by-step explanations for Class 5–12 CBSE, ICSE & State Board students.",
  keywords: ["AI tutor", "study buddy", "CBSE", "ICSE", "doubt solver", "India students"],
  applicationName: "Padhai Buddy",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/brand/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/brand/favicon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/brand/favicon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
  },
  openGraph: {
    title: "Padhai Buddy — Your AI Study Buddy",
    description: "Your AI study buddy for every doubt, every subject, every board.",
  },
};

export const viewport: Viewport = {
  themeColor: "#0D9488",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning className="scroll-smooth h-full" data-scroll-behavior="smooth">
      <body
        className={`${inter.variable} min-h-screen h-full m-0 bg-background text-foreground antialiased`}
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

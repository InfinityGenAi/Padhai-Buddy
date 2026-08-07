import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Padhai Buddy — Your AI Study Buddy",
  description: "Your AI study buddy for every doubt, every subject, every board. Get instant step-by-step explanations for Class 5–12 CBSE, ICSE & State Board students.",
  keywords: ["AI tutor", "study buddy", "CBSE", "ICSE", "doubt solver", "India students"],
  openGraph: {
    title: "Padhai Buddy — Your AI Study Buddy",
    description: "Your AI study buddy for every doubt, every subject, every board.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="scroll-smooth h-full">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen h-full m-0 bg-background text-foreground antialiased`}
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

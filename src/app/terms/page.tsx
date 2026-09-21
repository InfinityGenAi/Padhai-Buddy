"use client";

import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import BrandLogo from "@/components/BrandLogo";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useRouter } from "next/navigation";

const aiFeatures = [
  "AI-generated content (explanations, quizzes, flashcards, summaries) is provided for educational assistance only.",
  "We do not guarantee the accuracy, completeness, or reliability of AI-generated content. Always verify with official curriculum materials.",
  "AI responses may contain errors. Use critical thinking and cross-reference with textbooks.",
  "You retain ownership of content you create (notes, flashcards, plans). AI-generated content is provided under a limited license for your personal study use.",
  "Do not rely on AI features for high-stakes decisions (exams, medical, legal, financial)."
];

const ipItems = [
  "The App, its design, code, and original content are owned by Padhai Buddy and protected by copyright.",
  "You may not copy, modify, distribute, or create derivative works of the App without permission.",
  "Your user-generated content (notes, flashcards, plans) remains yours. You grant us a license to store, display, and process it to provide the service.",
  "Third-party content (curriculum references, AI provider outputs) belongs to their respective owners."
];

const acceptableUse = [
  "Use the App for any illegal or unauthorized purpose.",
  "Attempt to reverse engineer, decompile, or extract source code.",
  "Scrape, crawl, or bulk-download content from the App.",
  "Interfere with the App's security, rate limits, or other users' access.",
  "Use AI features to generate harmful, illegal, or inappropriate content.",
  "Share your account credentials with others.",
  "Impersonate another user or entity."
];

const accountItems = [
  "You must provide accurate information (name, email, class, board) during registration.",
  "You are responsible for maintaining the confidentiality of your password.",
  "You may sign up using email/password or Google OAuth.",
  "One person may not create multiple accounts to circumvent limits.",
  "We reserve the right to suspend or terminate accounts that violate these Terms."
];

const terminationItems = [
  "You may delete your account at any time from Settings → Danger Zone → Delete Account.",
  "We may suspend or terminate your access for violations of these Terms, with or without notice.",
  "Upon termination, your right to use the App ceases immediately. Data deletion follows our Privacy Policy."
];

export default function TermsPage() {
  const { preferences } = useAuth();
  const router = useRouter();
  const reducedMotion = false;
  const animationsEnabled = preferences?.animationsEnabled ?? true;

  const handleBack = () => router.back();

  return (
    <motion.div
      initial={animationsEnabled ? { opacity: 0, y: 20 } : false}
      animate={animationsEnabled ? { opacity: 1, y: 0 } : false}
      transition={animationsEnabled ? { duration: 0.6, ease: "easeOut" } : undefined}
      className="min-h-screen bg-background"
    >
      <header className="border-b border-border/50 bg-white/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={handleBack}
            className="p-2 rounded-lg hover:bg-foreground/5 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <BrandLogo size={28} />
          <h1 className="text-xl font-bold text-foreground">Terms of Service</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <article className="prose prose-sm max-w-none space-y-8 text-foreground">
          <section>
            <h2 className="text-xl font-bold">Agreement to Terms</h2>
            <p>
              By accessing or using Padhai Buddy ("the App", "we", "our", "us"), you agree to be bound by these Terms of Service ("Terms"). If you disagree with any part of these Terms, you may not use the App.
            </p>
            <p className="text-sm text-foreground/60">
              Last updated: {new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold">Eligibility</h2>
            <p>
              The App is intended for students in Classes 5–12 following CBSE, ICSE, or State Board curricula in India. By using the App, you represent that you meet this criterion or have parental/guardian consent if you are under 18.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold">Account Registration</h2>
            <ul className="list-disc list-inside space-y-2">
              {accountItems.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold">Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc list-inside space-y-2">
              {acceptableUse.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold">AI Features & Generated Content</h2>
            <ul className="list-disc list-inside space-y-2">
              {aiFeatures.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold">Intellectual Property</h2>
            <ul className="list-disc list-inside space-y-2">
              {ipItems.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold">Disclaimer of Warranties</h2>
            <p>
              THE APP IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, OR ACCURACY OF AI-GENERATED CONTENT. WE DO NOT WARRANT THAT THE APP WILL BE UNINTERRUPTED, ERROR-FREE, OR FREE OF HARMFUL COMPONENTS.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold">Limitation of Liability</h2>
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, PADHAI BUDDY SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF DATA, STUDY PROGRESS, OR ACADEMIC PERFORMANCE, ARISING FROM YOUR USE OF THE APP. OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID FOR THE SERVICE (IF ANY) OR INR 1,000, WHICHEVER IS GREATER.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold">Data & Privacy</h2>
            <p>
              Your use of the App is also governed by our <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>, which explains how we collect, use, and protect your information.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold">Termination</h2>
            <ul className="list-disc list-inside space-y-2">
              {terminationItems.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold">Changes to Terms</h2>
            <p>
              We may modify these Terms at any time. Changes will be posted in the App with an updated "Last updated" date. Continued use after changes constitutes acceptance. Material changes will be communicated via in-app notification.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold">Governing Law</h2>
            <p>
              These Terms are governed by the laws of India. Disputes shall be resolved in the courts of the relevant jurisdiction in India.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold">Contact</h2>
            <p>
              For questions about these Terms, please use the in-app feedback option or contact us through the app's support channels.
            </p>
          </section>

          <div className="mt-12 pt-8 border-t border-border">
            <Link href="/" className="text-primary hover:underline">
              ← Back to Home
            </Link>
          </div>
        </article>
      </main>

      <footer className="border-t border-border/50 bg-white/80 backdrop-blur-xl">
        <div className="max-w-3xl mx-auto px-4 py-6 text-center text-sm text-foreground/50">
          © {new Date().getFullYear()} Padhai Buddy. Made for Indian students.
        </div>
      </footer>
    </motion.div>
  );
}
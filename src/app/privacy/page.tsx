"use client";

import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import BrandLogo from "@/components/BrandLogo";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function PrivacyPage() {
  const { preferences } = useAuth();
  const router = useRouter();
  const reducedMotion = false; // useReducedMotion not needed for static page
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
          <h1 className="text-xl font-bold text-foreground">Privacy Policy</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <article className="prose prose-sm max-w-none space-y-8 text-foreground">
          <section>
            <h2 className="text-xl font-bold">Introduction</h2>
            <p>
              Padhai Buddy ("we", "our", "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our study application.
            </p>
            <p className="text-sm text-foreground/60">
              Last updated: {new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold">Information We Collect</h2>
            <h3 className="text-lg font-semibold mt-4">Account Information</h3>
            <ul className="list-disc list-inside space-y-2">
              <li>Email address (for authentication and account recovery)</li>
              <li>Display name (chosen by you)</li>
              <li>Profile photo URL (optional, provided by you or Google OAuth)</li>
              <li>Class and education board (CBSE, ICSE, State Board)</li>
            </ul>

            <h3 className="text-lg font-semibold mt-4">Study Data</h3>
            <ul className="list-disc list-inside space-y-2">
              <li>Questions you ask the AI Tutor and responses received</li>
              <li>Photos uploaded for Photo Doubt solving</li>
              <li>Quiz attempts, scores, and answers</li>
              <li>Flashcard decks, cards, and review progress</li>
              <li>Notes you create, edit, and organize</li>
              <li>Study plans, tasks, and completion status</li>
              <li>Timer sessions (mode, duration, completion)</li>
              <li>Saved AI explanations and practice questions</li>
            </ul>

            <h3 className="text-lg font-semibold mt-4">Usage & Preferences</h3>
            <ul className="list-disc list-inside space-y-2">
              <li>App settings (animations, sound, notifications, language, response style)</li>
              <li>Study streak and activity timestamps</li>
              <li>Device information for session management (browser, OS, device type)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold">How We Use Your Information</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>Provide and improve the study experience (AI explanations, quiz generation, flashcard creation)</li>
              <li>Personalize content to your class and board</li>
              <li>Track your learning progress and streaks</li>
              <li>Sync data across your devices via Firebase</li>
              <li>Send in-app notifications (study reminders, feature updates)</li>
              <li>Analyze usage patterns to improve the app (aggregated, anonymized)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold">AI Interactions & Third-Party Services</h2>
            <p>
              When you use AI features (AI Tutor, Photo Doubt, quiz generation, flashcard creation, summarization), your questions and relevant context (class, board, study history) are sent to our AI provider (Groq) to generate responses.
            </p>
            <p>
              We do not use your data to train AI models. Your conversations are processed solely to provide you with answers.
            </p>
            <p>
              Google OAuth is used for authentication. We receive your email, name, and profile photo from Google. We do not access your Google account beyond this.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold">Data Storage & Security</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>All data is stored in Google Firebase (Firestore, Auth, Storage) on servers in Google Cloud infrastructure.</li>
              <li>Firestore security rules enforce per-user data isolation — you can only access your own data.</li>
              <li>Authentication uses Firebase Auth with email/password and Google OAuth.</li>
              <li>Admin access is restricted via custom claims and server-side verification.</li>
              <li>AI provider API keys are stored server-side only, never exposed to the client.</li>
              <li>Rate limiting protects against abuse.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold">Data Retention & Deletion</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>Your data is retained as long as your account exists.</li>
              <li>You can delete individual items (notes, flashcards, chats, history) from within the app.</li>
              <li>You can delete your entire account from Settings → Danger Zone → Delete Account. This permanently removes all associated data from Firebase.</li>
              <li>Deleted data is removed from active databases. Backups may retain data for up to 30 days per Firebase retention policies.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold">Your Rights</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>Access: View all your data within the app (dashboard, history, settings).</li>
              <li>Rectification: Edit your profile, notes, flashcards, and plans at any time.</li>
              <li>Erasure: Delete individual items or your entire account.</li>
              <li>Portability: Your data is accessible via the app interface.</li>
              <li>Restriction: You can disable notifications and AI features in Settings.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold">Children's Privacy</h2>
            <p>
              Padhai Buddy is designed for students (Class 5–12). We do not knowingly collect personal information from children under 13 without parental consent. If you are a parent and believe your child has provided personal information without consent, please contact us.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold">Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. Changes will be posted in the app with the updated "Last updated" date. Continued use of the app after changes constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold">Contact</h2>
            <p>
              For questions about this Privacy Policy or your data, please use the in-app feedback option or contact us through the app's support channels.
            </p>
          </section>
        </article>

        <div className="mt-12 pt-8 border-t border-border">
          <Link href="/" className="text-primary hover:underline">
            ← Back to Home
          </Link>
        </div>
      </main>

      <footer className="border-t border-border/50 bg-white/80 backdrop-blur-xl">
        <div className="max-w-3xl mx-auto px-4 py-6 text-center text-sm text-foreground/50">
          © {new Date().getFullYear()} Padhai Buddy. Made for Indian students.
        </div>
      </footer>
    </motion.div>
  );
}
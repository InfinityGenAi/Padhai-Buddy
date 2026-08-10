# AGENTS.md — Padhai Buddy

## Commands

### Development
- `npm run dev` — Start the Next.js dev server
- `npm run build` — Build for production
- `npm run lint` — Run ESLint and Next.js lint checks
- `npx tsc --noEmit` — Run TypeScript type checking

### Notes
- TypeScript must pass with no errors
- ESLint must pass with no errors or warnings
- The project uses Tailwind CSS v3 (not v4) to avoid native binary issues on Windows
- Tailwind CSS v3 uses `@tailwind base; @tailwind components; @tailwind utilities;` in `globals.css`
- Builds use Turbopack by default (verified working on Windows)

## Environment Variables
Copy `.env.local.example` to `.env.local` and fill in:
- Firebase client config (NEXT_PUBLIC_FIREBASE_*)
- Firebase Admin service account (FIREBASE_ADMIN_*)
- Groq API key (GROQ_API_KEY)

## Firebase
- Firestore security rules: `firestore.rules`
- Apply rules: `firebase deploy --only firestore:rules`
- Firestore indexes: `firestore.indexes.json`

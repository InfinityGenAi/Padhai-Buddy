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

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

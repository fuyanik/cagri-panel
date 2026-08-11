<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

`cagri-paneli` is a single Next.js 16 (App Router, Turbopack) call-center QC dashboard. Package manager is npm. Commands live in `package.json`: `npm run dev` (port 3000), `npm run build`, `npm start`. There are no lint or test scripts and no ESLint/test config in the repo.

Required env vars (nothing is committed; `.env*` is gitignored — put local values in `.env.local`):
- Firebase client (all six needed just to render ANY page): `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`, `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID`.
- Server / pipeline: `GOOGLE_SERVICE_ACCOUNT_JSON` (or `GOOGLE_APPLICATION_CREDENTIALS` file path) for firebase-admin + Drive, `GEMINI_API_KEY`, `GOOGLE_DRIVE_PARENT_FOLDER_ID`, `GOOGLE_DRIVE_FOLDER_ID`.

Non-obvious gotcha: `lib/firebase-client.ts` calls `getAuth(app)` at module load, so if the `NEXT_PUBLIC_FIREBASE_*` vars are missing/invalid, EVERY route (including `/login`) throws `auth/invalid-api-key` and returns HTTP 500. The whole UI is gated behind Firebase Auth (`AuthGuard` redirects to `/login`), so a real Firebase project + a test account are required to see anything render. There is no local datastore or emulator wired up — all state lives in live Firebase Firestore.

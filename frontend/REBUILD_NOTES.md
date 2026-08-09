# DubVerse frontend rebuild — mirrors Transcripto AI's structure

This replaces DubVerse's old 2-page (Home/Editor) plain-CSS frontend with
the same shape Transcripto AI uses: Tailwind CSS, Pinia stores, and a full
multi-page site. Backend is untouched — this is frontend-only.

## What's new

**Stack**
- Tailwind CSS (`tailwind.config.js`, `postcss.config.js`, `src/assets/main.css`)
- Pinia (`src/stores/theme.js`, `src/stores/auth.js`, `src/stores/video.js`)
- Dark/light theme toggle, persisted to `localStorage`

**Pages** (`src/router/index.js`)
| Route | Page | Notes |
|---|---|---|
| `/` | Home | Hero, how-it-works, why-us, use cases, languages, CTA |
| `/about` | About | Mission, tech stack, audience, CTA |
| `/login` | Login | **UI shell** — see below |
| `/register` | Register | **UI shell** — see below |
| `/dashboard` | Dashboard | Video library (guest id, no login required) |
| `/upload` | Upload | Drag/drop upload, wired to the real API |
| `/video/:videoId` | Video | Player + Generate/Translate/AI Dub + caption editor |

**Shared chrome:** `Navbar.vue`, `AppFooter.vue`, `ParticleCanvas.vue` (background),
`LoadingSpinner.vue` — same structure as Transcripto, DubVerse's orange/pink
branding instead of indigo/cyan.

## Auth is a UI shell — read this before wiring buttons

DubVerse's backend has **no auth routes**. Every video is scoped to a guest
id (`X-Guest-Id` header, see `src/api.js` / `backend/utils/ownership.js`),
same as before this rebuild. `src/stores/auth.js` mirrors Transcripto's
shape (`user`, `loading`, `error`, `login()`, `register()`, `logout()`) so
Login/Register/Navbar/Dashboard are already written against the right
interface — but `login()`/`register()` currently just set a friendly error
message instead of calling a real endpoint. `auth.user` is always `null`.

To wire up real auth later:
1. Add `POST /api/v1/auth/register`, `POST /api/v1/auth/login`,
   `POST /api/v1/auth/logout` (+ session/cookie or JWT handling) to the backend.
2. Fill in the three `TODO` blocks in `src/stores/auth.js`.
3. Everything else (Navbar's user menu, Dashboard's greeting, gated nav
   links) already reacts to `auth.user` correctly — no other changes needed.

Until then, Login/Register show an amber notice pointing people at
`/upload`, which works today without an account.

## What DubVerse doesn't have (vs. Transcripto)

- No SRT/TXT export, no "burn captions into video" step — DubVerse's output
  is a **dubbed video** (AI Dub), not a burned-caption video. The Video page
  reflects that: Generate → Translate → AI Dub, no Download menu.
- Video `status` only has three values (`uploaded` → `transcribed` →
  `dubbed`), not five — Dashboard's status tabs and badges match that.
- Upload is synchronous (blocks on the Cloudinary upload), not
  background-with-polling — so the Upload page shows a progress bar and
  navigates only once the video record actually exists, no "uploading…"
  state on the video page itself.

## Running it

```bash
cd frontend
npm install
npm run dev
```

Same backend proxy setup as before (`vite.config.js` → `http://localhost:5000`).
Verified with a clean `npm install && npm run build` — no errors.

# Next.js Stack Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans (native) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Vite + Express runtime with Next.js App Router while preserving existing travel features and secret-only authentication.

**Architecture:** Next.js serves the React UI and server-side route handlers. Existing feature logic moves into `app/api/*/route.js`; shared DB and provider helpers remain server-only. Browser camera, upload, geolocation, speech, and navigation remain client behavior in the page component.

**Tech Stack:** Next.js, React, Tailwind CSS, PostgreSQL/Supabase, JWT, Axios.

**Spec:** Approved in chat: Next.js App Router; `APP_SECRET=guardian8` in `.env`; long static `JWT_SECRET`; every login receives a different JWT using random `jti`; secret-only auth; Google Places server-side; scanner camera preserved.

## Global Constraints

- Do not print or commit `.env` values.
- `APP_SECRET` is cleartext `guardian8` in local `.env` only.
- `JWT_SECRET` remains long and dynamic-looking; never expose it to client code.
- Login JWT includes random 32-byte `jti`, `iat`, `exp`, and `role: owner`; expiry remains 7 days.
- Keep existing DB schema and feature response shapes unless Next.js route handling requires a transport-only change.
- Keep Google Places API key server-side.
- Do not add abstractions without a concrete caller.

## Review Focus

- Missing `APP_SECRET` must fail clearly at server startup; auth route owns this check.
- Two successful logins must produce different JWT strings; auth test owns this assertion.
- Camera/upload UI must still execute in browser; page must remain a client component.
- API errors and Google Places fallback must preserve existing JSON responses; route migration tests own endpoint smoke checks.
- Production static serving must not remain coupled to `dist`; Next.js build/start owns this behavior.

### Task 1: Next.js foundation and environment

**Files:**
- Modify: `package.json`, `package-lock.json`
- Create: `next.config.mjs`, `app/layout.jsx`, `app/globals.css`
- Modify: `tailwind.config.js`
- Remove after migration: `vite.config.js`, `index.html`

**Interfaces:**
- Produces Next.js `dev`, `build`, `start` scripts.
- Produces App Router root layout importing global styles.

- [ ] Add Next.js and required runtime packages using npm; remove Vite-only dependencies and scripts.
- [ ] Configure Tailwind content for `app/**/*.{js,jsx,ts,tsx}` and existing source during transition.
- [ ] Create root layout with existing document metadata and global CSS import.
- [ ] Run `npm install` and `npm run build`; expected result is a Next.js build with no Vite config dependency.

### Task 2: Secret-only auth route

**Files:**
- Create: `app/api/auth/login/route.js`
- Create: `app/api/auth/me/route.js`
- Create: `server/auth.js` or equivalent server-only helper
- Remove: `server/routes/auth.js`
- Modify: `.env.example`; update local `.env` manually without printing its value

**Interfaces:**
- `POST /api/auth/login` consumes `{ secret }`, returns `{ success, token, user: { role: 'owner' } }`.
- `GET /api/auth/me` consumes `Authorization: Bearer <token>`, returns `{ user: { role: 'owner' } }`.
- Auth helper exports token verification middleware-equivalent for protected routes.

- [ ] Write a small runnable auth check proving wrong secret returns 401 and two valid logins produce different tokens.
- [ ] Implement `APP_SECRET` validation and JWT signing with `crypto.randomBytes(32).toString('hex')` as `jti`.
- [ ] Verify auth check passes with `APP_SECRET=guardian8` and long `JWT_SECRET`.
- [ ] Ensure no username, DB lookup, hardcoded bypass, or secret value enters client bundle.

### Task 3: API route migration

**Files:**
- Create: `app/api/health/route.js`
- Create: `app/api/places/nearby/route.js`
- Create: `app/api/scanner/history/route.js`
- Create: `app/api/valas/rates/route.js`
- Create: `app/api/valas/history/route.js`
- Modify/create: server-only helpers under `server/`
- Remove after parity: `server/index.js`, `server/routes/places.js`, `server/routes/scanner.js`, `server/routes/valas.js`

**Interfaces:**
- Preserve existing paths and JSON contracts: `/api/health`, `/api/places/nearby`, `/api/scanner/history`, `/api/valas/rates`, `/api/valas/history`.
- Preserve Google Places fallback and distance sorting.
- Preserve DB queries and input defaults.

- [ ] Move each endpoint one route at a time, preserving GET/POST behavior and status codes.
- [ ] Add auth verification to history write/read endpoints if current app contract requires protected access.
- [ ] Run endpoint smoke checks against a running Next.js server; `/api/health` must return `status: ok`.

### Task 4: Move UI into App Router

**Files:**
- Create: `app/page.jsx`
- Modify: `src/App.jsx` only if extraction is incremental; otherwise remove `src/`

**Interfaces:**
- `app/page.jsx` remains a client component because it uses camera, geolocation, speech, localStorage, and React state.
- Existing axios calls continue using relative `/api/...` URLs.

- [ ] Copy existing UI behavior into `app/page.jsx` with `"use client"` and no server-only imports.
- [ ] Keep secret-only login field and `secret` payload.
- [ ] Remove old Vite entry path after page renders through Next.js.
- [ ] Run `npm run build`; expected result is successful Next.js compilation.

### Task 5: Runtime cleanup and verification

**Files:**
- Modify: `package.json`, `.env.example`, `.gitignore`, deployment workflow as needed
- Remove: obsolete Vite/Express files and `dist/` artifacts from working tree if generated

- [ ] Start Next.js with `npm run dev` or `npm start` and verify `/`, `/api/health`, `/api/auth/login`.
- [ ] Verify bundle/page contains no username form and no secret/JWT values.
- [ ] Verify `npm run build` exits 0.
- [ ] Verify `git diff --check` exits 0.
- [ ] Report any environment-dependent DB or Google API checks separately; do not fabricate results.

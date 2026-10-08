# Personal App Flows Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete responsive shell, currency CRUD, scanner camera preview, AI conversation, and GPS/category spot journeys for the personal app.

**Architecture:** Keep Next.js App Router, existing client page, PostgreSQL/Supabase access through `server/db.js`, and server-only provider helpers. Add small server route handlers and tested client helpers; keep global storage without `user_id`. Existing AI/provider secrets remain server-only.

**Tech Stack:** Next.js 14 App Router, React, Axios, PostgreSQL/Supabase, OpenAI-compatible HTTP API, Tailwind CSS, Node test runner.

**Spec:** `docs/superpowers/specs/2026-10-07-personal-app-flows-design.md`

## Global Constraints

- Use one global personal-app storage; do not add `user_id` columns.
- Keep API keys server-only: `OPENAI_BASE_URL`, `OPENAI_API_KEY`, `OPENAI_MODEL`.
- Do not print, hardcode, or commit secrets.
- Run `npm run build` only with dev server stopped; never share `.next` between concurrent dev/build processes.
- Keep empty states honest; no fallback spots before GPS action.
- Validate all route input and normalize provider output before persistence/rendering.
- Preserve existing scanner, currency, auth, and places response contracts unless this plan explicitly changes them.
- No new dependency unless current packages cannot satisfy requirement.

## Review Focus

- Dev server/build overlap must not corrupt `.next`; final verification runs them sequentially.
- Browser denies GPS, camera, or microphone permissions; UI must show actionable error without crashing.
- 9router returns SSE, fenced JSON, malformed JSON, or empty translation; route must fail safely and never save fabricated output.
- Empty global history and missing nullable prices; UI must not render `NaN`, stale fallback rows, or dead controls.
- Category names from old curated data (`kopi`, `eat`, `thrift`, `attraction`) must normalize to new UI categories (`coffee`, `food`, `shopping`, `gadget`) consistently.

---

### Task 1: Currency history CRUD API

**Files:**
- Modify: `app/api/valas/history/route.js`
- Create: `app/api/valas/history/[id]/route.js`
- Create: `app/api/valas/history/route.test.js`
- Modify: `src/valas.js` only if shared validation/helper is useful

**Interfaces:**
- `PATCH /api/valas/history/:id` consumes `{ from_currency, to_currency, from_amount, to_amount, exchange_rate, note }` and returns `{ success: true, item }`.
- `DELETE /api/valas/history/:id` returns `{ success: true }`.
- `GET /api/valas/history` remains newest-first.

- [ ] Write failing tests for valid update, invalid ID, invalid numeric payload, delete success, delete missing row, and empty note persistence.
- [ ] Run `node --test app/api/valas/history/route.test.js`; observe route/module or method failures.
- [ ] Implement route handlers with parameterized SQL, positive integer ID validation, supported currency validation, finite non-negative numeric fields, and `note ?? ''`.
- [ ] Return 404 when update/delete affects no row; return safe 400/422/500 errors without raw DB details.
- [ ] Run focused tests; expected all CRUD cases pass.

### Task 2: Currency UI and responsive shell

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/valas.js`
- Modify: `app/globals.css` if required
- Create: `src/currencyHistory.test.mjs` only if a pure UI helper is extracted

**Interfaces:**
- Number display uses `formatAmount` with `Intl.NumberFormat('en-US')`.
- No center swap button or `ArrowUpDown` import in currency panel.
- History rows expose edit and delete actions using Task 1 endpoints.

- [ ] Write a failing pure helper/UI check for comma grouping and edit/delete request payload shape.
- [ ] Run focused check and observe current dot grouping/swap/dead-history behavior.
- [ ] Change `formatAmount` to `Intl.NumberFormat('en-US')`; remove currency swap control and dead handlers.
- [ ] Add inline edit state or small edit form per row; save through PATCH; cancel restores display.
- [ ] Add delete confirmation and DELETE call; refresh history after mutation.
- [ ] Add `min-h-[100dvh]`, flexible content sizing, responsive grid reflow, and no horizontal overflow.
- [ ] Run focused tests and `npm run build` with dev server stopped.

### Task 3: Scanner camera preview regression

**Files:**
- Modify: `src/scannerCamera.js`
- Modify: `src/App.jsx`
- Modify: `src/scannerCamera.test.mjs` or create a focused test file

**Interfaces:**
- `startCamera({ getUserMedia, video, facingMode, setStream, setActive }) -> Promise<MediaStream>` assigns `video.srcObject` before active state.
- `stopCamera({ stream, video, setStream, setActive })` stops every track and clears source.

- [ ] Write failing helper test asserting successful start assigns stream to `video.srcObject`, sets stream, and activates camera; failure stops partial tracks.
- [ ] Run test and observe missing/incorrect preview behavior.
- [ ] Implement minimal lifecycle helper and wire `startCamera`, replacement, close, unmount, logout, and permission errors.
- [ ] Preserve capture/upload and `/api/scanner/analyze` behavior.
- [ ] Run camera tests and build; manually verify browser camera preview or record permission/device blocker separately.

### Task 4: AI translation and conversation persistence API

**Files:**
- Create: `server/ai/translate.js`
- Create: `server/ai/translate.test.js`
- Create: `app/api/chat/translate/route.js`
- Create: `app/api/chat/translate/route.test.js`
- Create: `app/api/chat/history/route.js`
- Create: `app/api/chat/history/route.test.js`
- Create: `docs/superpowers/sql/2026-10-07-conversations.sql`

**Interfaces:**
- `translateText({ text, sourceLanguage, targetLanguage }) -> Promise<string>`.
- `POST /api/chat/translate` consumes `{ text, source_language, target_language }`, returns `{ success: true, translation, source_language, target_language }`.
- `GET /api/chat/history` returns `{ history: Conversation[] }` newest-first.
- `POST /api/chat/history` consumes `{ source_text, source_language, translated_text, target_language }`.
- `DELETE /api/chat/history/:id` deletes one row; use a dynamic route if UI needs per-row deletion.
- Conversation rows have `id`, source/target text and languages, `created_at`; no `user_id`.

- [ ] Write failing normalizer/provider tests for JSON, SSE chunks, fenced JSON, empty translation, provider HTTP failure, and missing env.
- [ ] Run tests and observe missing helper/route failures.
- [ ] Implement server-only 9router request using existing SSE parser pattern; never expose key or raw provider body.
- [ ] Write failing route tests for validation, provider failure with no insert, successful translation, and history CRUD.
- [ ] Add idempotent SQL migration and parameterized history queries.
- [ ] Implement translation/history routes with safe error responses and empty-string rejection for source/translation.
- [ ] Run focused tests; live 9router smoke remains optional and env-only.

### Task 5: Conversation UI and microphone toggle

**Files:**
- Modify: `src/App.jsx`
- Create: `src/chat.js`
- Create: `src/chat.test.mjs`

**Interfaces:**
- `toggleRecognition({ recognition, isListening, setListening })` starts on false and stops on true.
- `translateMessage(text, sourceLanguage)` calls `/api/chat/translate`; typed Indonesian renders left, typed Japanese renders right.
- Save action posts conversation to `/api/chat/history` and refreshes history.

- [ ] Write failing tests for persistent mic toggle, language-side selection, empty input rejection, and conversation payload.
- [ ] Run focused tests and observe current `onend`/single-click behavior.
- [ ] Keep recognition instance in ref; set `onend` state based on actual stop/error rather than immediately stopping after start.
- [ ] Add typed-input translate action and AI loading/error states; do not save failed translation.
- [ ] Render chat bubbles with source language alignment and saved-history section with delete action/confirmation.
- [ ] Load global conversation history when chat tab opens.
- [ ] Run focused tests and build.

### Task 6: GPS spot discovery and category normalization

**Files:**
- Modify: `app/api/places/nearby/route.js`
- Modify: `server/curated-spots.js`
- Create: `app/api/places/nearby/route.test.js`
- Modify: `src/App.jsx`
- Create: `src/spots.js`
- Create: `src/spots.test.mjs`

**Interfaces:**
- `GET /api/places/nearby?lat=<number>&lng=<number>&category=<all|coffee|food|shopping|gadget>` returns `{ location, category, count, places }`.
- Missing coordinates return 400; no implicit Shibuya fallback.
- `normalizeCategory` maps legacy values `kopi→coffee`, `eat→food`, `thrift→shopping`, `attraction→gadget`.

- [ ] Write failing route/helper tests for missing coordinates, each category, empty provider result, distance sorting, and no initial fallback.
- [ ] Run tests and observe current default coordinates/category mismatch.
- [ ] Normalize curated/provider categories and filter after normalization; preserve distance sorting.
- [ ] Make provider failure return safe empty result or explicitly labeled local results only after valid GPS coordinates; never return spots before GPS.
- [ ] Update UI initial list to `[]`; GPS click requests location, sends coordinates, and displays permission/provider errors.
- [ ] Add category selector; changing category reloads only after location exists.
- [ ] Run focused tests and build.

### Task 7: Integrated runtime verification

**Files:**
- Modify: `package.json` only if a test script is needed
- Modify: docs only if runtime setup needs documentation

- [ ] Run all focused tests with `.env` loaded but without printing values.
- [ ] Stop dev server, move stale `.next` if needed, run `npm run build`, and run `git diff --check`.
- [ ] Start dev server on port 3000 only after build completes.
- [ ] Verify `/`, `/api/health`, auth login, valas history CRUD, scanner validation, translation validation, chat history, and places missing-coordinate response.
- [ ] Verify mobile and desktop layouts: flexible height, comma formatting, no swap button, CRUD journey, camera preview, mic toggle, chat alignment, GPS empty-to-results journey, and category filters.
- [ ] Report real-device permission limitations separately; do not fabricate camera/GPS/mic results.

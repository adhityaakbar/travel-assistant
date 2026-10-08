# Valas and AI Scanner Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans (native) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve currency conversion UX and replace simulated scanner results with a server-side OpenAI-compatible 9router vision workflow that returns clearly labeled estimated prices plus Tokopedia/Shopee links.

**Architecture:** Keep Next.js App Router and existing client page. Currency UI uses one selected source currency, IDR conversion, backend-fetched rates, and horizontal currency chips. Scanner sends captured/uploaded image to a server route; the route calls a configurable OpenAI-compatible `/chat/completions` endpoint, validates normalized JSON, derives marketplace search links when AI does not return valid URLs, stores the result, and returns the saved history item.

**Tech Stack:** Next.js App Router, React client component, Axios, PostgreSQL/Supabase, OpenAI-compatible HTTP API via Axios, Tailwind CSS, Lucide React.

**Spec:** Approved requirements in chat: AI-only price estimation for now; 9router supplies OpenAI-compatible engine; AI must include Tokopedia or Shopee link; UI must show ecommerce icon; scanner history persists in backend; currency and scanner changes listed below.

## Global Constraints

- Do not print, commit, or expose `.env` values.
- Use only server-side env names: `OPENAI_BASE_URL`, `OPENAI_API_KEY`, `OPENAI_MODEL`.
- Never send `OPENAI_API_KEY` to browser code or include it in client bundle.
- Treat AI prices as estimates; UI must visibly label them `Estimasi AI`, not verified marketplace prices.
- AI response is untrusted input: validate JSON, numeric fields, URL protocol/host, and fallback values before saving/rendering.
- Do not claim live ecommerce price lookup; no ecommerce API exists in this phase.
- Preserve camera permissions behavior: closing camera stops every `MediaStreamTrack`; capture/upload sends data to backend.
- Keep existing DB history endpoints and UI history sourced from backend responses.
- Keep existing exchange swap button; remove incremental controls only.
- No random/mock scanner product data remains.
- Use one focused test or runnable check for each non-trivial backend behavior.

## Review Focus

- Missing or malformed 9router env must produce a clear server error without leaking API key; AI route test owns this.
- AI returns markdown, incomplete JSON, negative prices, or invalid marketplace URLs; normalization test owns fallback behavior.
- AI request times out or returns non-2xx; route returns actionable error and does not write fake history.
- Base64 image is oversized or has unsupported media type; route rejects it before provider call.
- User closes camera while stream exists; client test/manual check proves every track is stopped.
- Currency API omits one of ten currencies; UI keeps zero/empty-safe values and does not crash.
- Empty backend history renders empty state, not invented rows.

### Task 1: Define provider configuration and normalized scanner contract

**Files:**
- Modify: `.env.example`
- Create: `server/ai/scanner.js`
- Create: `server/ai/scanner.test.js` or a repository-compatible runnable check

**Interfaces:**
- `analyzeProductImage({ imageDataUrl }) -> Promise<ScannerAnalysis>`.
- `ScannerAnalysis` fields:
  - `product_name: string`
  - `brand: string | null`
  - `model: string | null`
  - `price_jpy: number | null`
  - `lowest_price_idr: number | null`
  - `average_price_idr: number | null`
  - `currency: string`
  - `marketplace: 'tokopedia' | 'shopee' | 'both' | null`
  - `marketplace_url: string | null`
  - `tokopedia_url: string | null`
  - `shopee_url: string | null`
  - `confidence: number | null`
  - `estimate_note: string`

- [ ] Add `.env.example` entries with placeholders only:
  `OPENAI_BASE_URL=https://your-9router-endpoint/v1`, `OPENAI_API_KEY=`, `OPENAI_MODEL=`.
- [ ] Write failing normalization tests for valid JSON, fenced JSON, invalid URLs, missing prices, and negative prices.
- [ ] Run the check and confirm it fails because provider helper/normalizer is absent.
- [ ] Implement OpenAI-compatible POST to `${OPENAI_BASE_URL}/chat/completions` with `Authorization: Bearer ${OPENAI_API_KEY}` and `model: OPENAI_MODEL`.
- [ ] Send one vision message containing image `data:` URL and strict JSON instructions; do not hardcode provider-specific SDK behavior.
- [ ] Normalize model output by stripping optional markdown fences, parsing JSON, coercing only finite non-negative numbers, and rejecting malformed product names.
- [ ] Validate marketplace URLs with `https:` and hosts limited to `tokopedia.com`, `www.tokopedia.com`, `shopee.co.id`, or `www.shopee.co.id`.
- [ ] Derive missing links as search URLs from encoded product name; never invent a product detail ID.
- [ ] Run check and confirm it passes; provider errors must remain actionable and must not include the API key.

### Task 2: Scanner analyze and history backend

**Files:**
- Create: `app/api/scanner/analyze/route.js`
- Modify: `app/api/scanner/history/route.js`
- Modify: `server/db.js` only if schema access requires no new helper
- Create: `docs/superpowers/sql/2026-10-07-scanner-history.sql` only if existing table cannot store required fields

**Interfaces:**
- `POST /api/scanner/analyze` consumes `{ image_data_url: string }` and returns `{ success: true, item: ScannerAnalysis & { id, created_at } }`.
- `GET /api/scanner/history` returns `{ history: ScannerAnalysis[] }` ordered newest first.
- Existing `POST /api/scanner/history` is removed or made internal-only; client must use `/analyze` so saving cannot bypass AI normalization.

- [ ] Write failing route-level check for missing image, unsupported media type, oversized payload, provider failure, and successful analyze/save.
- [ ] Run check and confirm expected failures before route exists.
- [ ] Validate data URL prefix (`image/jpeg`, `image/png`, `image/webp`) and enforce a conservative server payload limit such as 8 MB decoded/base64 input.
- [ ] Call `analyzeProductImage`, then insert normalized fields and raw image data only if existing storage policy permits; prefer storing a thumbnail/data URL only when required by current UI.
- [ ] Extend `scan_history` schema with nullable fields for `brand`, `model`, `lowest_price_idr`, `average_price_idr`, `marketplace`, `marketplace_url`, `tokopedia_url`, `shopee_url`, `confidence`, and `estimate_note` if columns are absent. Keep migration idempotent.
- [ ] Return saved row with explicit `is_estimate: true`.
- [ ] Run route check and verify failed AI calls do not insert history rows.

### Task 3: Currency rate model and conversion behavior

**Files:**
- Modify: `app/api/valas/rates/route.js`
- Modify: `app/api/valas/history/route.js`
- Modify: `src/App.jsx`

**Interfaces:**
- Rates response includes ten selectable currencies against JPY: `JPY`, `USD`, `SGD`, `KRW`, `EUR`, `GBP`, `AUD`, `CNY`, `THB`, `MYR`; missing upstream rates use `0` and never `undefined`.
- Conversion history POST consumes `{ from_currency, to_currency, from_amount, to_amount, exchange_rate, note }`.

- [ ] Write a failing conversion check for initial amount `0`, selected currency rate, digit grouping, and note persistence.
- [ ] Run it and confirm current hardcoded initial amount/format behavior fails.
- [ ] Expand backend rate mapping and keep route dynamic; return `0` for absent values rather than stale invented defaults for newly added currencies.
- [ ] Initialize amount fields at `0`; format displayed values using `Intl.NumberFormat('id-ID')` while preserving editable numeric input state.
- [ ] Replace fixed JPY/IDR assumptions with selected source currency and IDR target conversion; preserve middle exchange/swap button.
- [ ] Add horizontally scrollable ten-currency selector; selecting a currency recalculates conversion above it.
- [ ] Add text note input and send it to backend; default only to empty string, not generated note text.
- [ ] Remove incremental controls and any dead handlers/imports.
- [ ] Make `LIVE` call backend rates endpoint, update timestamp, and recalculate current conversion with latest rate.
- [ ] Render conversion history only from backend; empty array stays empty state.
- [ ] Run conversion check and build.

### Task 4: Scanner camera lifecycle and scanner UI

**Files:**
- Modify: `src/App.jsx`
- Modify: `app/page.jsx` only if page wrapper changes

**Interfaces:**
- `stopCamera()` stops every track from current stream and clears `video.srcObject`.
- `processScan(imageDataUrl)` posts to `/api/scanner/analyze`, sets saved result, then refreshes `/api/scanner/history`.

- [ ] Write a failing client-oriented check or minimal manual harness for `stopCamera` clearing all tracks and video source.
- [ ] Run it and confirm current close behavior leaves stream/source active.
- [ ] Make close button call `stopCamera`; clean up on unmount and before starting a replacement stream.
- [ ] Replace simulated scan function with `processScan` upload to `/api/scanner/analyze`; show loading and actionable error states.
- [ ] Keep captured image preview, camera capture, and file upload behavior.
- [ ] Remove fake accuracy `99%` and random product data; show actual nullable confidence only when returned.
- [ ] Render `Estimasi AI` label beside price fields and show lowest price plus average Indonesia price.
- [ ] Add ecommerce result block with official-looking text icons/labels for Tokopedia and Shopee, each link opening a new tab; do not use decorative emoji as the only meaning. Use relevant Lucide/icon treatment already installed or accessible text labels.
- [ ] Show marketplace URL as an actionable link with safe `target`/`rel` attributes; hide missing links rather than rendering dead buttons.
- [ ] Refresh backend history after successful analyze and on scanner tab initialization.
- [ ] Run browser/manual flow: open camera → close → permission stream stops; upload image → backend request; backend result → saved history row.

### Task 5: Verification and deployment configuration

**Files:**
- Modify: `package.json` only if test script is needed
- Modify: `.gitignore` only if test/build artifacts appear
- Modify: deployment environment documentation as needed

- [ ] Set local `.env` manually with `OPENAI_BASE_URL`, `OPENAI_API_KEY`, and `OPENAI_MODEL`; never print values.
- [ ] Run provider normalization test without real credentials.
- [ ] Run route checks with provider mocked at HTTP boundary; verify no API key appears in output or bundle.
- [ ] Run `npm run build`.
- [ ] Start Next production server and verify `/api/health`, `/api/valas/rates`, and scanner validation error response.
- [ ] Verify `git diff --check`.
- [ ] Manually inspect mobile layout: currency chips horizontal scroll, note field, empty histories, scanner ecommerce links, loading/error states.
- [ ] Report real-provider verification separately if credentials/model are not configured; do not fabricate AI output or ecommerce links.

# Personal App Flows Design

## Status

Approved design direction: one global storage for personal app. No `user_id` column. API writes remain owner-authenticated where existing auth contract supports it.

## Goal

Make Travel Assistant usable across flexible browser sizes and complete four broken journeys: currency history CRUD, scanner camera preview, AI-assisted conversation, and GPS-driven spot discovery.

## Scope

### Shared shell

- Root app content uses `min-height: 100dvh`, not fixed viewport height.
- Main content grows with window and page content.
- Mobile layouts reflow instead of shrinking desktop rows.
- No page-level horizontal overflow.

### Currency

- Display numbers with `Intl.NumberFormat('en-US')`, producing comma grouping.
- Remove center swap control.
- Keep global `conversions` table as storage.
- Add `PATCH /api/valas/history/:id` and `DELETE /api/valas/history/:id`.
- Validate numeric fields, supported currency codes, and positive integer IDs at route boundary.
- UI exposes edit and delete per history row. Delete requires confirmation. Edit preserves empty note as empty string.
- History remains newest-first and empty state remains honest.

### Scanner

- Keep browser camera flow and existing AI analyze endpoint.
- On `getUserMedia` success, assign stream to `videoRef.current.srcObject` before activating preview.
- Store active stream in ref; stop every track on close, camera replacement, unmount, logout, and errors.
- Show actionable permission/device errors.
- Preserve capture/upload preview and server analysis response.

### Conversation

- Add server-only `POST /api/chat/translate` using `OPENAI_BASE_URL`, `OPENAI_API_KEY`, and `OPENAI_MODEL`.
- Provider request uses OpenAI-compatible `/chat/completions`; API key never reaches client.
- Request: `{ text, source_language, target_language }`.
- Response: `{ success: true, translation, source_language, target_language }`.
- Preserve typed input and speech recognition. Mic is a toggle: first press starts recognition; second press stops it.
- Render chat bubbles by source language: Indonesian left, Japanese right.
- Add global `conversations` storage and `GET/POST/DELETE /api/chat/history`.
- Save conversation explicitly from UI; load history on chat tab; delete history with confirmation.
- Provider failure shows actionable error and does not save fabricated translation.

### Spots

- Initial `spotsList` is empty.
- GPS action requests browser geolocation only after button press.
- On success, send latitude, longitude, and selected category to `/api/places/nearby`.
- Backend returns nearby curated/provider spots, filtered by category and sorted by distance.
- Categories: `all`, `coffee`, `food`, `shopping`, `gadget`; UI labels: `semua`, `kopi`, `makan`, `belanja`, `gadget`.
- Changing category after a location exists reloads results. Before location exists, show an instruction instead of fallback spots.
- Permission denial and provider failure show actionable states.

## Data flow

Browser UI → relative Next route → server validation/auth → DB/provider → normalized JSON → UI state.

Provider secrets stay in server modules. External AI output is untrusted and must be normalized before rendering or persistence. Global DB rows have no user ownership field because this is a personal app.

## Errors and empty states

- Validation errors: 400/415/422 with safe user-facing message.
- Provider errors: 502 with generic actionable message; no key or raw provider body.
- DB errors: 500 with generic message; log server-side only if needed.
- Empty histories explain how to create first item.
- Empty spots explain GPS action.
- Camera errors identify permission, unavailable device, or replacement failure.

## Testing

- Route tests for currency PATCH/DELETE validation and persistence.
- Route tests for translation request normalization, provider failure, and secret non-leakage.
- Route tests for conversation history CRUD.
- Client helper test for camera stream assignment/cleanup and mic toggle state.
- Spot route tests for category, coordinates, empty initial state, and provider fallback behavior.
- Existing scanner, valas, camera, and live 9router smoke tests remain green.
- Run build with dev server stopped, then start dev server for runtime verification at desktop and narrow viewport widths.

## Non-goals

- No multi-user tenancy or `user_id` migration.
- No ecommerce price API.
- No new dependency unless existing packages cannot satisfy requirement.
- No redesign of unrelated travel features.

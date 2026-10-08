# Regression Tests

## Safety rules

- Run commands from repository root: `/Users/adhitya/Downloads/dev/travelassistant`.
- Load `.env` into process environment without printing it. Never log `OPENAI_API_KEY`, auth secret, database URL, or provider responses.
- Stop every `next dev` process before `npm run build`. Never run `next build` while `next dev` shares `.next`; use sequential processes only.
- Keep real provider smoke optional and environment-only. Missing credentials means `SKIP`, not a fabricated pass.

## Deterministic automated suite

```bash
cd /Users/adhitya/Downloads/dev/travelassistant
set -a; source .env; set +a
npm run test
```

`npm run test` is `node --test`; Node discovers repository test files without shell glob expansion. This avoids shell-specific glob behavior and runs both `.test.js` and `.test.mjs` files. Live provider tests skip unless their required environment is present.

Focused checks:

```bash
node --test app/api/valas/history/route.test.js app/api/chat/translate/route.test.js app/api/chat/history/route.test.js app/api/places/nearby/route.test.js app/api/scanner/analyze/route.test.js app/api/scanner/history/route.test.js server/ai/translate.test.js server/ai/scanner.test.js src/valas.test.js src/scannerCamera.test.mjs src/chat.test.mjs src/spots.test.mjs
```

## Build and static gates

```bash
# Ensure no dev server is running first.
pkill -f 'next dev' || true
npm run build
git diff --check
```

Do not move, delete, or reuse `.next` while a dev server is running. Existing stale directories may be removed only after all Next processes stop.

## Live 9router smoke

Run only with `.env` loaded and required variables present. Do not print values or raw provider output.

```bash
set -a; source .env; set +a
if [ -n "${OPENAI_BASE_URL:-}" ] && [ -n "${OPENAI_API_KEY:-}" ] && [ -n "${OPENAI_MODEL:-}" ]; then
  node --test server/ai/translate.test.js server/ai/scanner.live.test.js
else
  echo 'SKIP live 9router smoke: required environment is unavailable'
fi
```

Record only `PASS`, `FAIL`, or `SKIP` and sanitized error class/message. Never paste credentials into reports.

## Runtime API scenarios

After build, start one server on port 3000. Stop it after checks.

```bash
set -a; source .env; set +a
PORT=3000 npm run start > /tmp/travelassistant-next.log 2>&1 &
SERVER_PID=$!
trap 'kill "$SERVER_PID" 2>/dev/null || true' EXIT
curl -fsS http://localhost:3000/ >/dev/null
curl -fsS http://localhost:3000/api/health
```

Verify these scenarios and record status code plus sanitized body shape:

1. `GET /` returns HTML containing app shell and requested labels/states.
2. `GET /api/health` returns `{ status: "ok" }`.
3. `POST /api/auth/login` with auth secret loaded from `.env` returns success; never print request or token.
4. `GET /api/auth/me` with returned token returns owner role; token stays in shell variable only.
5. `POST /api/auth/login` with a deliberately wrong non-secret value returns `401`.
6. `GET /api/valas/history` without auth returns `401`; authenticated read is attempted only when DB schema is available.
7. `POST /api/valas/history` invalid payload returns validation status; authenticated CRUD is attempted only when DB schema is available, then PATCH and DELETE are checked.
8. `POST /api/scanner/analyze` missing body or invalid image returns validation status; no provider call needed.
9. `POST /api/chat/translate` missing/empty fields returns validation status; provider call is optional and env-only.
10. `GET /api/chat/history` without auth returns `401`; authenticated read is attempted only when `conversations` schema is available.
11. `GET /api/places/nearby` without coordinates returns `400` and does not return fallback spots.
12. Valid coordinates plus each category (`all`, `coffee`, `food`, `shopping`, `gadget`) return normalized response or documented provider `502`.

## Desktop and mobile manual scenarios

Use browser viewport at desktop width and narrow mobile width. Record `PASS`, `FAIL`, or `SKIP` with reason.

- Shell grows beyond viewport height; no page-level horizontal overflow.
- Currency amounts use comma grouping; no center swap button.
- Currency history empty state appears; create, edit, empty-note save, delete-confirm, and delete flows refresh correctly when DB is available.
- Scanner shows camera-ready state, opens live preview, captures/uploads image, and displays validation/provider error without crash.
- Camera replacement, close, tab change, logout, and unmount stop stream tracks.
- Chat typed Indonesian appears left and translated Japanese right; saved history loads and delete confirmation works.
- Mic is a persistent toggle: first press starts, second press stops; error/end state restores actionable idle state.
- GPS starts only after `GPS Saya`; before permission/location there are no fallback spots; success shows results, empty results show category guidance, and category filters reload after location exists.
- Login failure stays on login screen; successful login reaches app shell.

## Permission limitations

Camera, geolocation, and microphone require a real browser/device permission prompt and hardware. Headless or permission-denied runs cannot prove successful camera preview, GPS coordinates, or speech capture. Mark those cases `SKIP` with the exact limitation; do not claim `PASS` from source inspection or mocked tests. Browser permission denial and unavailable-device error states remain automatable through validation/helper tests.

## Future-build regression rule

Before each build, run `npm run test`, then stop dev, run `npm run build`, then `git diff --check`. Start runtime server only after build. Re-run API and manual scenario lists after UI or route changes. Never overlap `next dev` and `next build` against one `.next` directory.

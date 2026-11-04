# EmergeNG frontend

React 18 + Vite + Tailwind + React Router + TanStack Query + Mapbox GL. Offline-first (IndexedDB outbox, service worker). Talks only to the EmergeNG FastAPI backend; the backend is the authority for every status, permission and decision.

## Honest status of this code
Written without the ability to run `npm install` or `vite build` (package registries were blocked in the authoring environment). **It has never been built or rendered in a browser.** What *has* been verified:
- every source file parses (`npm run check` → syntax + import resolution + reachability)
- pure logic unit tests pass (`npm test`: sync protocol, validators, permissions, map geometry)
- translation catalogues are complete for en/yo/ha/ig/pcm in the citizen scope with matching placeholders (`npm run i18n -- --lang yo`)

Expect to fix some dependency-version and runtime issues on first `npm install && npm run dev`. Dependency versions are caret ranges that were not resolved.

## Run
```
cp .env.example .env     # set VITE_API_BASE_URL and VITE_MAPBOX_PUBLIC_TOKEN (pk.… only)
npm install
npm run dev
```
Only public values belong in `VITE_*`. Never put secrets there. The NIPOST key stays on the backend.

## Deploy (Vercel)
`vercel.json` provides the SPA fallback, no-cache for `sw.js`, immutable caching for `/assets`, and security headers. Set the two env vars in the project settings.

## Backend changes required
1. **CORS** (`app/main.py`): if `VITE_SEND_SYNC_TOKEN=true`, add `X-Sync-Token` to `allow_headers`. Default is off.
2. Add the deployed frontend origin to the backend CORS allowed origins (Render env).

## Added in this revision (unbuilt, untested in a browser)
- **Emergency QR card** (`/app/emergency-card`, also offline): QR encodes only what the user ticks, built in `src/lib/qrPayload.js`. New dependency `qrcode` (run `npm install`).
- **Notification inbox** (`/app/notifications`): needs the backend patch (migration 0004 + `/users/me/notifications*` routes). Messages are server events only; nothing implies help is on the way.
- **Integrations control** (admin): kill switch, circuit reset, rate-limited test probe. Needs `integrations.manage`, recent re-auth, and the backend patch.
- **Contract check**: `npm run contract` compares literal API calls with `contract/backend-routes.json` (extracted from backend source by `scripts/extract_backend_routes.py`). It is static; it does not replace running against the real backend.
- **Backend CORS**: allow the `X-Sync-Token` request header.

## Backend patch
See `backend_patch/APPLY.md` in the backend deliverable. It fixes the Supabase pooler error (`DB_POOLER_TRANSACTION_MODE=true`) seen in your log.

## Admin sign-in, Google sign-in, map, home buttons (this revision, not built or run)
- **Admin sign-in:** `/admin/login` (separate page; `/admin/*` redirects there). Google sign-in is intentionally not offered for administrators.
- **Google sign-in** (citizen sign-in/sign-up): needs the backend patch and `GOOGLE_OAUTH_CLIENT_ID` on the backend; the button appears only when `/auth/config` returns `google_client_id`. Loads Google's script only then.
- **Map:** fixed markers/pins not appearing after the map loaded (effects did not re-run), removed a stale `axios` entry from `vite.config.js`, and the fallback now says when Mapbox rejected the token. Checklist if the map is still blank: `VITE_MAPBOX_PUBLIC_TOKEN` is set in `.env` (starts with `pk.`) and the dev server was restarted; the token's URL restrictions allow `http://localhost:5173` and your production URL; the browser supports WebGL2; open the console for a `[map] disabled:` line.
- **Home:** round emergency push-buttons (`.ebtn` in `src/index.css`; change `--ebtn-1/2/3` to recolour).

## Languages
English (default), Yorùbá, Hausa, Igbo, Naijá Pidgin. Citizen-facing screens and legal summaries are translated; staff screens (operations, partner, admin) intentionally fall back to English. Translations were machine-drafted and **must be reviewed by native speakers**. English legal text is authoritative and must be reviewed by counsel; contact emails in it are placeholders.

## Known gaps
- No QR emergency card (strings exist, feature does not)
- No citizen notification inbox (backend has no endpoint; preferences only)
- Integrations page is read-only by design
- Not tested against the live backend; request shapes were written from the backend source

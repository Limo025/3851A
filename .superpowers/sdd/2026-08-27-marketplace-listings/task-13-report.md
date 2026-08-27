# Task 13 verification report — Security regression and Definition of Done

**Executed:** 2026-08-28 (Australia/Sydney)  
**Worktree:** `E:\COMP3851A\3851A-main\3851A\.worktrees\marketplace-listings`  
**Branch:** `feature/marketplace-listings`  
**Verdict:** **BLOCKED** — every available offline automated gate passed, but the required live seller/buyer/security/authentication flows cannot be executed without a configured Firebase/MongoDB/Cloudinary environment and two test accounts. No code was changed and no commit was created.

## Automated verification

| Command | Result |
| --- | --- |
| `Marketplace-backend > npm test` | **PASS** — 60 passed, 0 failed, 0 skipped, exit 0 (1.706 s). Covers auth refresh, image-upload/cleanup adapter, creation, model, public browse/detail, ownership/mutation, validation, and multipart boundaries. |
| `Marketplace-frontend > npm test` | **PASS** — 40 passed, 0 failed, 0 skipped, exit 0 (0.336 s). Covers header navigation, protected return paths, image/form validation, creation/edit/delete helpers, formatting, pagination, session refresh, and API client behaviour. |
| `Marketplace-frontend > npm run lint` | **PASS** — ESLint exited 0 with no diagnostics. |
| `Marketplace-frontend > npm run build` | **PASS** — Vite transformed 57 modules and produced `dist/assets/main-07wPQdcw.css` and `dist/assets/main-wKkIk4_3.js`. |
| `git diff --check` | **PASS** — exit 0. |
| `git status --short` | **PASS** — no tracked/untracked changes reported (apart from non-fatal inability to read the user-global Git ignore file). |

### Known build warnings

The production build reports three unresolved-at-build-time font-path warnings for `corbel.ttf`, `fusev2.otf`, and `fuseV2bold.otf`. They are the same pre-existing warnings documented in the ledger; the build completed successfully and no listing-specific warning was emitted.

## Offline local smoke

`agent-browser` is not installed and the frontend has neither Playwright nor `@playwright/test`, so an interactive browser run was unavailable without downloading dependencies (not authorized).

I started Vite locally only on `127.0.0.1:5173`, then used local HTTP requests. Each returned HTTP 200, `text/html`, and a `#root` mount point:

- `/`
- `/marketplace`
- `/listings/507f1f77bcf86cd799439011`
- `/sell`
- `/my-listings`
- `/listings/507f1f77bcf86cd799439011/edit`

The exact local Vite process was then terminated and a follow-up request confirmed port 5173 was no longer reachable. This is a static SPA-serving/fallback check only; it does not establish rendered React state or API-backed behaviour.

## Security-contract evidence available offline

The fresh backend suite passed the following direct HTTP/router assertions with fakes, without external calls:

- Cross-seller `PUT` and `DELETE` return `403` before storage or database mutations.
- Protected create rejects unauthenticated requests with `401`; server-owned seller identity is used instead of client identity.
- Missing title, no image, non-positive price, malformed/nonexistent IDs, invalid query values, invalid retained images, and invalid image count return controlled errors.
- GIF/PDF content, MIME spoofing, over-5 MiB files, a sixth image, unexpected multipart fields, excessive fields/parts, and malformed multipart input are rejected in controlled `400` paths.
- Creation/update compensation and post-persistence deletion handling are covered with offline image-store fakes.
- Refresh rejects malformed input/upstream data without exposing the token or provider details; frontend sessions clear on refresh failure and authenticated 401 responses become `AuthenticationError`.

This provides strong automated regression coverage, but it is not a substitute for the Task 13 two-user real-token/API/Cloudinary check.

## Blocked live checks

The worktree has no `.env` or `credentials.json`. The ignored backend example contains placeholders only. No configured running backend, MongoDB database, Firebase credential/session, Cloudinary credentials, or Seller A/User B test accounts are available. Therefore I did **not** simulate or attempt network-backed flows.

The following gates remain unverified and are the reason for the BLOCKED verdict:

1. Seller A: login, create 1–5 real images, marketplace/detail/mine, edit (retain/remove/add), save, cancel delete, confirm delete.
2. Buyer: public browse, title search, category/condition/min/max filtering, all four sorts, pagination, detail gallery, loading/empty/error states in a browser at the required viewports.
3. Two-user direct API matrix: User B `PUT`/`DELETE` on User A listing must be `403`, then verify the MongoDB document and Cloudinary assets did not change; unauthenticated `POST` must be `401`.
4. Live validation matrix: missing title, price `0`, GIF/PDF, >5 MiB, >5 files, malformed ID, and nonexistent ObjectId.
5. Auth regression: new-user register/login, `/auth/me`, live `/auth/refresh`, in-session reload and listing creation, then browser-session close and seller-route redirect.

## Repository / secret review

- No workspace `.env` or `credentials.json` files were found outside dependency/build directories.
- No tracked `credentials.json` or generated build/test artifact paths were found. `Marketplace-backend/.env.example` is intentionally tracked and contains placeholders only.
- Build output is ignored by `Marketplace-frontend/.gitignore`; it did not appear in `git status`.
- The high-confidence source scan found one Firebase Web API key literal in `Marketplace-frontend/src/main.jsx`. `git blame` and `git show 0b2c270:Marketplace-frontend/src/main.jsx` establish that it predates this marketplace worktree's starting commit and is not a Task 1–12 change. Firebase web API keys are browser configuration rather than a private server credential, but the project's Firebase Console configuration should restrict it to approved referrers/APIs. This is a **pre-existing security warning**, not proof of a newly committed secret.
- `git remote -v` lists the existing `origin`; no fetch, push, pull, PR, or other remote operation was performed.

## Tooling/environment warnings

- Git emitted the non-fatal warning `unable to access C:\Users\User/.config/git/ignore: Permission denied` during status/diff/blame operations. The repository-specific checks still exited 0 and reported a clean worktree.
- A first attempt to clean up the local Vite process lacked permission to inspect the listening socket; the exact PID was then confirmed with approved local process inspection and terminated. No application files were changed.

## Handoff

All offline gates are green. Provision an isolated non-production Firebase/MongoDB/Cloudinary environment plus two disposable accounts to complete the five live checks above; then rerun the full automated gates after that run. No final verification-fix commit is appropriate from this pass.

## Final Important-finding fix wave (2026-08-28)

The final review's two Important findings were fixed in local commit `4773b36` (`fix: harden provider requests and nested shell assets`). The four deferred Minor findings were intentionally not changed.

### Regression evidence and implementation

- `Marketplace-frontend/test/shellAssets.test.js` first failed against the old `src/...` shell URLs because `/listings/abc/edit` resolved them beneath `/listings/abc/`. `Marketplace-frontend/index.html` now uses root-relative `/src/img/...` and `/src/icon/...` URLs for every local shell image; Vite build rewriting remains intact.
- `Marketplace-backend/test/imageStorage.test.js` first failed because Cloudinary requests had no signal/timeout. It now proves an in-flight upload receives an `AbortSignal`, aborts at an injected 1 ms timeout, returns a sanitized `PROVIDER_TIMEOUT`/504 error, and clears the timer on success.
- `Marketplace-backend/test/authRefreshRoute.test.js` first failed because Firebase refresh had no timeout mapping; it now covers both login and refresh signal aborts and controlled `{ error: "Authentication provider timed out" }` 504 responses.
- `Marketplace-backend/src/services/providerRequest.js` provides the small shared `fetchWithTimeout` helper: default timeout is 10,000 ms, every provider fetch receives a fresh `AbortController.signal`, and `finally` always clears the timer. `ProviderTimeoutError` exposes only a stable code/status/message and no provider response/token details.
- `Marketplace-backend/src/services/imageStorage.js` applies the helper to both Cloudinary upload and destroy calls. `Marketplace-backend/src/routes/auth.js` applies it to Firebase login and refresh. Listing create/update map Cloudinary timeout errors to a controlled 504 without exposing credentials or upstream details.

### Verification commands

| Command | Result |
| --- | --- |
| `Marketplace-backend > npm test` | PASS — 64 passed, 0 failed |
| `Marketplace-frontend > npm test` | PASS — 41 passed, 0 failed |
| `Marketplace-frontend > npm run lint` | PASS — exit 0, no diagnostics |
| `Marketplace-frontend > npm run build` | PASS — Vite build completed; only the three pre-existing font resolution warnings remain |
| `git diff --check` | PASS — exit 0 before commit |
| `git status --short` | PASS — clean after the fix commit/report update |

No live provider calls were made; Firebase/MongoDB/Cloudinary credentials and services remain unavailable in this offline worktree. No network, push, PR, or remote operation was performed.

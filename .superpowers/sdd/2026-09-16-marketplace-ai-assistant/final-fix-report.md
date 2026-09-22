# Marketplace AI assistant final fix wave

Base: `32c11841ef363d12e94b11fffd306e088e0ead1e`

Implemented all eight findings from the final review:

1. Removed Gemini REST `additionalProperties` keywords while retaining local exact-object validation.
2. Replaced router-state draft contents with a bounded in-memory handoff map and opaque ID; a reload cannot recover the draft.
3. Provider extraction now forwards only user-authored history. User sensitive content remains blocked, and refusal-to-valid follow-up behavior is covered.
4. Explicit buy/sell intent wins over prior mode and resets incompatible criteria or draft state.
5. Closing the assistant keeps the in-flight loading lock until the pending request settles, preventing a second request and stale overwrite.
6. Gemini response-body parsing runs inside the provider timeout race, including delayed-body coverage.
7. Assistant results render only HTTPS public thumbnails, and draft-ready responses show an escaped compact English summary.
8. Final search ordering is title relevance, then price, before the five-result limit (with deterministic ID tie-breaking).

Verification:

- Backend `npm test`: 170 passing.
- Frontend `npm test`: 65 passing.
- Focused frontend lint: `npx eslint src/assistant src/pages/CreateListing.jsx` passed.
- Frontend production build: `npm run build` passed; existing unresolved font assets remain build-time warnings.
- `git diff --check`: passed.

Live Gemini/manual acceptance was not run; no provider credentials or live service claim is made.

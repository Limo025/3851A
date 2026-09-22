# SDD ledger — plan: docs/superpowers/plans/2026-09-16-marketplace-ai-assistant.md

Baseline: backend 83/83 passing; frontend 49/49 passing.

Ruling: Work in the current checkout rather than create a worktree — the user explicitly approved this because required uncommitted application changes would not exist in a new worktree — cost if wrong: assistant commits may need manual conflict resolution against those uncommitted edits.

## Pre-flight interface and consistency scan

| Tasks | Producer / consumer or internal check | Finding |
|---|---|---|
| 1 | Contracts tests vs normalization and policy code | Consistent; state and field allowlists are explicit. |
| 2 | Search tests vs aggregation/projection code | Consistent after plan self-review; summary facet shape and result projection match. |
| 3 | Adapter tests vs provider interface | Consistent; provider remains injectable and structured-output only. |
| 4 | Workflow tests vs state transitions | Consistent; deterministic code owns database and draft decisions. |
| 5 | Route tests vs middleware and error mapping | Consistent; optional auth preserves public buying. |
| 6 | Frontend state tests vs API boundary | Consistent; no browser persistence. |
| 7 | Markup tests vs widget implementation | Consistent; all feature styling is namespaced in new files. |
| 8 | Draft tests vs handoff wiring | Consistent; only allowlisted form fields cross navigation state. |
| 9 | Privacy tests vs configuration/docs | Consistent; static boundary tests enforce the central constraints. |
| 1 → 4 | Normalized request/state consumed by workflow | Interface names and shapes match. |
| 1 → 5 | Normalization and response builders consumed by route | Interface names and error boundary match. |
| 2 → 4 | `summarize` and `findMatches` consumed by buy workflow | Query, criteria, summary, and match shapes match. |
| 3 → 4 | `extractTurn` and `writeListingCopy` consumed by workflow | Method names and structured return fields match. |
| 4 → 5 | `runAssistantTurn` consumed by route | Dependency signature matches route invocation. |
| 5 → 6 | `/api/assistant/chat` consumed by frontend API | Request and response shapes match. |
| 6 → 7 | Reducer and API consumed by `ChatWidget` | Imports and state fields match. |
| 7 ↔ 8 | `ChatWidget.jsx` adds review action in Task 8 | Shared file change is sequential and intentionally additive. |
| 6 → 8 | Workflow draft consumed by navigation helper | Draft keys match listing form fields. |
| 7 → 9 | Frontend integration boundary audited by static test | Only `main.jsx` is touched by Task 7. |
| 8 → 9 | Second approved frontend edit audited by static test | Only `CreateListing.jsx` is touched by Task 8. |
| 5 → 9 | Route/source privacy audited by static test | Assistant route tree has no `User` dependency. |

No pre-flight task conflict requires a plan ruling.

Task 1: fix round 1/5 (1 addressed, 1 open — conversation history guarded; raw credential and seller-field bypasses remained; commits b2c5ade..bf46cab)
Task 1: fix round 2/5 (0 addressed, 1 open — raw Authorization and MongoDB URI forms fixed; possessive seller-field phrasing remained; commits bf46cab..38541b7)
Task 1: fix round 3/5 (1 addressed, 0 open — straight/curly possessive seller private fields covered; commits 38541b7..489e48c)
Task 1: interface note — Task 4 must call `assertConversationSafe(request)` immediately before `model.extractTurn(request)` so normalized user history cannot reach Gemini.
Task 1: complete (commits df067ea..489e48c, review clean)
Task 2: fix round 1/5 (2 addressed, 0 open — valid inclusion projection and safe 1..5 query limit; commits 95c2414..791170b)
Task 2: complete (commits 489e48c..791170b, review clean)
Task 3: fix round 1/5 (1 addressed, 0 open — Gemini JSON Content-Type validated including charset/case; commits 36249c6..19871e1)
Task 3: complete (commits 791170b..19871e1, review clean)
Task 4: complete (commits 19871e1..78a8371, review clean)
Task 5: fix round 1/5 (2 addressed, 0 open — invalid model output uses generic 503; auth/authentication keys scrubbed recursively; commits 34404ea..504cab1)
Task 5: minor (deferred): fix report's auxiliary `rg` evidence used doubled escaping and did not prove its no-502 claim; production tests and diff do prove the behavior.
Task 5: complete (commits 78a8371..504cab1, review clean)
Task 6: complete (commits 504cab1..0831611, review clean)
Task 7: fix round 1/5 (1 addressed, 1 open — authentication redirect unlocks persistent widget; route test depended on unstaged refactor; commits 344a2d9..728cf95)
Task 7: fix round 2/5 (1 addressed, 0 blocking open — route test now supports clean explicit and configured baselines; commits 728cf95..194daed)
Task 7: minor (deferred): explicit-route preservation test checks complete signatures as a set but not declaration order; production route code was not changed by the feature.
Task 7: complete (commits 0831611..194daed, review approved with 1 deferred minor)
Task 8: Ruling: reviewer found clean-HEAD duplicate `/sell` routes, but the user-owned uncommitted route consolidation already defines a single authenticated `CreateListing` route and its test passes; do not stage or alter those user files because the approved assistant frontend surface is limited — cost if wrong: a clean checkout without the user's pending route commit would route assistant drafts to the obsolete `Sell` page.
Task 8: fix round 1/5 (1 addressed, 0 open — same-path `/sell` navigation remounts ListingForm with new draft; commits 5e0b526..5110213)
Task 8: complete (commits 194daed..5110213, review clean subject to ledgered route ruling)
Task 9: complete (commits 5110213..32c1184, review clean; live Gemini/manual acceptance not run because credentials/network were unavailable)

Final review: 5 Important findings — unsupported Gemini responseSchema keyword; router-state draft survives reload; refusal assistant history poisons later valid requests; buy mode blocks explicit sell transition; closing widget unlocks an in-flight request.
Final review: 3 Minor findings — response-body parsing lacks deadline; result thumbnail and draft summary missing; search ranks only by price rather than relevance then price.

Final fix wave: complete — all 8 final-review findings addressed from base `32c11841ef363d12e94b11fffd306e088e0ead1e`; backend 170/170 and frontend 65/65 tests pass, focused assistant lint and production build pass, and `git diff --check` is clean. Live Gemini/manual acceptance remains unrun because credentials/network were unavailable. See `final-fix-report.md`.

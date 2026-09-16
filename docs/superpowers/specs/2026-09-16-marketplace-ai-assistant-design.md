# Marketplace AI Assistant Design

## Summary

Add an English-only AI assistant to the marketplace as a floating chat widget. The assistant helps visitors discover public listings and helps authenticated users prepare a listing draft. It cannot read user records, retrieve account information, or publish a listing. Conversations and drafts are ephemeral and disappear when the page is reloaded or closed.

The initial model is Gemini 2.5 Flash-Lite. The integration will sit behind a provider interface so the model or provider can be changed through environment configuration without changing the assistant workflow.

## Goals

- Let any visitor describe an item they want to buy in natural language.
- Summarize matching inventory before asking for budget and acceptable condition.
- Recommend only real listings that satisfy the confirmed criteria.
- Let an authenticated user describe an item they want to sell and receive an editable listing draft.
- Enforce least-privilege access: the assistant may read only sanitized public listing fields and may not read the `User` collection.
- Keep all chat history and drafts out of persistent storage.
- Refuse requests for credentials, private account data, unrelated general knowledge, or operations outside buying and preparing a listing draft.

## Non-goals

- The assistant will not publish, edit, or delete listings.
- The assistant will not read or modify users, authentication records, messages, watchlists, or settings.
- The first version will not accept images in chat or infer listing details from images.
- The first version will not retain conversations across reloads, tabs, devices, or sign-ins.
- The assistant will not search the public web or answer questions unrelated to this marketplace.
- The assistant will not negotiate with sellers or send messages on a user's behalf.

## User Experience

### Entry point

A floating assistant button appears on every page. On desktop it opens a side panel anchored to the button. On narrow screens it opens a full-screen panel. All assistant UI and responses are in English, regardless of the language of the user's input. Prices are displayed in AUD.

The widget keeps its messages, current workflow state, and any draft in React memory only. It must not use local storage, session storage, cookies, or a database for conversation persistence.

### Buying flow

1. The user describes an item, for example, "I need a PS5."
2. The backend extracts a normalized search phrase and searches public listings by title and description.
3. One MongoDB aggregation returns a summary containing the total match count, minimum and maximum price, and counts grouped by condition.
4. The assistant presents that summary without recommending individual listings yet.
5. The assistant asks for the maximum budget and acceptable condition values, one concise question at a time. It may skip a question when the user already supplied that criterion.
6. Once the required criteria are known, the backend searches again with those filters and returns no more than five matching listings.
7. The widget renders each result as a compact card with listing ID, title, price, condition, first public image, and a link to the existing listing-detail page.
8. Results are ordered by relevance, then price. The assistant must never invent results. If there are no matches, it may suggest relaxing budget or condition based on the initial inventory summary.

The assistant treats the initial inventory scan and the final filtered search as separate database operations because the second operation depends on answers that were not available during the first.

### Selling flow

1. The user says they want to sell an item.
2. Selling assistance requires authentication. An anonymous user is directed to the existing login flow before the assistant continues the selling workflow.
3. The assistant collects the item name, factual features, condition, category, and asking price. Values already supplied by the user are not asked for again.
4. Gemini produces an English title and description using only the facts supplied by the user. It may improve wording, but it must not invent included accessories, defects, provenance, warranties, or condition claims.
5. The backend validates the generated draft with the same listing constants and field-validation rules used by the standard listing form.
6. The assistant shows a draft summary and a **Review listing** action.
7. The action navigates to `/sell` with the draft in React Router navigation state. `CreateListing` uses the state to prefill `ListingForm`.
8. The user uploads at least one image, reviews or edits every field, and explicitly selects **Create listing**. Only the existing authenticated listing endpoint can persist the listing.

Reloading the page intentionally discards the draft. The assistant endpoint does not create a `Listing` document.

### Refusals

Requests for passwords, email addresses, Firebase identifiers, private account details, user data, or changes to an account are refused before any database query is run. General questions outside marketplace buying and selling are also refused. A standard response is:

> I can only help you find items or prepare a marketplace listing. I can't access passwords or account information.

Brief greetings and clarification of the assistant's supported capabilities are allowed.

## Architecture

### Frontend

- `ChatWidget` owns ephemeral conversation and workflow state.
- Focused presentation components render messages, inventory summaries, listing result cards, errors, and the review-draft action.
- A small assistant API client sends a bounded conversation window and the current workflow state to `POST /api/assistant/chat`.
- The widget is mounted outside the route-specific page components so it remains available throughout normal navigation.
- `CreateListing` accepts a validated draft from router state and passes it as `initialValues` to `ListingForm`.

Frontend integration follows an additive-first constraint so later work on the existing UI is unlikely to conflict with the assistant. All assistant logic, markup, styling, API calls, and tests live in new assistant-specific files. Existing shared CSS, page structure, navigation, route configuration, and listing components are not refactored or restyled.

Only two existing frontend files may receive minimal wiring changes:

- `main.jsx`: one import and one mounted assistant component inside the existing router.
- `CreateListing.jsx`: read an optional validated draft from router navigation state and pass it to the existing `ListingForm`.

These wiring changes must remain small and isolated. If implementation discovers that another existing frontend file must change, work stops for explicit approval rather than broadening the frontend edit surface. Backend files may be extended as required by this design.

### Backend

The assistant is split into small modules with explicit responsibilities:

- `assistantPolicy` classifies allowed marketplace intents and immediately rejects sensitive or out-of-scope requests.
- `assistantWorkflow` is a deterministic state machine for the buy and sell flows. It decides which information is missing and whether an inventory operation is allowed. Gemini does not choose or execute database tools.
- `listingSearchService` is the only assistant module that can read MongoDB. It imports `Listing` only, never `User`, and returns sanitized plain objects.
- `listingDraftService` assembles and validates draft fields using the existing listing rules.
- `geminiClient` handles provider requests, timeouts, response schemas, and error normalization. Its interface is provider-neutral.
- `assistant` route validates request sizes, applies rate limits, invokes policy and workflow modules, and returns a structured response for the widget.

This hybrid design uses Gemini for language understanding, field extraction, English copywriting, and concise response wording. Application code owns authorization, state transitions, database access, filtering, and validation.

## API Contract

`POST /api/assistant/chat` accepts a bounded payload similar to:

```json
{
  "message": "I need a PS5",
  "history": [],
  "state": {
    "mode": null,
    "stage": null,
    "criteria": {},
    "draft": {}
  }
}
```

Authentication is optional for buying and required when the workflow enters selling mode. The route uses the existing Firebase token verification mechanism when an authorization header is present. Authentication metadata is used only for authorization and is never inserted into the Gemini prompt.

The response is a discriminated structure rather than unparsed model text:

```json
{
  "message": "I found 8 matching listings...",
  "state": {
    "mode": "buy",
    "stage": "awaiting_budget",
    "criteria": { "query": "PS5" },
    "draft": {}
  },
  "inventorySummary": {
    "total": 8,
    "minPrice": 420,
    "maxPrice": 750,
    "byCondition": { "New": 1, "Like New": 4, "Good": 3, "Fair": 0 }
  },
  "listings": []
}
```

Optional response sections are omitted when they do not apply. The server validates model-produced structured data before returning it. Client-supplied state is untrusted and is normalized against known modes, stages, categories, conditions, price ranges, and field-length limits on every request.

## Data Access and Privacy

Gemini receives no database connection string and no callable database tool. The model sees only the minimum sanitized data required to word a response.

The inventory service uses an allowlist projection. Summary operations expose only aggregate counts and prices. Final results expose only:

- `_id`
- `title`
- `description` when needed for relevance
- `price`
- `category`
- `condition`
- the first public image URL

The service does not populate `seller`, query `User`, or return a seller reference to Gemini or the assistant client. Listing descriptions are wrapped as untrusted data and cannot alter policy or workflow decisions.

No conversation, assistant state, model response, or draft is written to MongoDB. Production logging must exclude message bodies, prompts, model outputs, authorization headers, and drafts. Operational logs may contain request IDs, timing, status codes, selected intent, and non-sensitive error categories.

The Gemini API key is stored only in the backend environment as `GEMINI_API_KEY`. The model identifier is configurable, defaulting to `gemini-2.5-flash-lite`. Paid-tier Gemini usage is recommended for production privacy; deployment documentation must state this requirement.

## Search Behavior

The existing listing query supports title search only. The assistant search service will use a dedicated, escaped search across listing title and description so normal item wording can match either field. User-provided text is never interpolated into an executable MongoDB expression.

The initial aggregation applies the normalized item phrase and returns inventory statistics in one database round trip. The filtered search applies the confirmed maximum budget and one or more allowed condition values, projects only allowlisted fields, and limits the result count to five.

All prices and counts come from MongoDB. Gemini may explain them but may not calculate or substitute inventory values from memory.

## Model Interaction

Gemini requests use low temperature, disabled thinking where supported, a strict structured-output schema, a short timeout, and conservative input/output token limits. The backend sends only the recent bounded conversation needed for extraction. It does not send the entire application state or user object.

Model output is advisory until it passes schema and domain validation. Unknown intent values, invalid conditions or categories, non-finite prices, excessive field lengths, and malformed JSON are rejected. The workflow returns a safe retry message instead of attempting a database operation with invalid values.

The provider interface supports dependency injection for tests and a future OpenRouter/Qwen implementation. Changing providers is explicitly outside the first implementation, but the workflow must not import a Gemini-specific SDK type.

## Security Controls

- Apply a request rate limit per IP to the assistant route.
- Limit message length, history item count, per-message history length, and total serialized request size.
- Accept only known state keys and enum values; discard unknown properties.
- Use allowlist database projections and never populate seller data.
- Escape all search strings and cap search phrase length.
- Render assistant text as React text, never raw HTML.
- Treat listing content and user messages as untrusted data, not system instructions.
- Keep authorization decisions in backend code rather than model prompts.
- Require existing authentication and existing listing validation for final publication.
- Configure provider timeouts and cap model/tool rounds; the hybrid workflow normally requires one model request per user turn and no autonomous tool loop.

## Failure Handling

- Gemini timeout or unavailable: return an English retry message without exposing provider details.
- Gemini quota exceeded: return a temporarily unavailable message and an appropriate non-success status.
- Invalid structured model output: do not search or create a draft; ask the user to retry.
- Database failure: return a search-specific error and do not let Gemini invent an answer.
- No initial matches: state that no matching listings exist and invite a different search phrase.
- No filtered matches: use the prior summary to suggest a broader budget or condition without claiming that a listing exists.
- Authentication expired during selling: use the existing login/return-path behavior and preserve no server-side draft.
- Invalid draft: identify the missing or invalid field and remain in the selling workflow.

## Testing Strategy

### Backend unit tests

- Policy accepts only supported marketplace intents and greetings.
- Password, account-data, unrelated-topic, and prompt-injection requests are refused without calling Gemini or MongoDB when deterministically identifiable.
- Workflow transitions through inventory summary, budget, condition, and results in the correct order.
- Already supplied criteria are not asked for again.
- Search aggregation and final result queries use escaped input, allowlist projections, and result limits.
- Search results never contain seller references or fields from `User`.
- Draft generation cannot write a listing and rejects invented or invalid values.
- Gemini timeout, quota errors, malformed JSON, and invalid schemas produce safe responses.
- Oversized messages, histories, and invalid client state are rejected.

### Backend route tests

- Buying works without authentication.
- Selling requires authentication.
- Authentication data is not passed to the model client.
- Rate limiting and normalized error responses behave as designed.
- A PS5 conversation summarizes inventory before requesting criteria and returns results only after budget and condition are known.

### Frontend tests

- The floating control opens and closes accessibly and becomes full-screen on mobile layouts.
- Messages remain in memory during normal navigation but are not persisted to browser storage.
- Loading, empty, refusal, timeout, and quota states render correctly.
- Listing cards link to the correct detail page and render only sanitized public data.
- **Review listing** passes the draft to `/sell` and prefills the existing form.
- Anonymous selling initiates the existing login/return-path flow.
- Reloading `/sell` without router state produces an empty form.
- The existing frontend layout, routes, listing behavior, and shared styles remain unchanged apart from the two documented wiring points.

## Acceptance Criteria

- A visitor asking for a PS5 sees the real count, price range, and condition distribution before the assistant asks for missing filters.
- After the visitor supplies budget and condition, the assistant shows no more than five real matching listings or clearly reports no matches.
- Requests for passwords, private account data, or unrelated subjects receive an English refusal and cause no user-data query.
- The assistant code has no dependency on the `User` model; optional authentication middleware is the only user-related boundary.
- An authenticated seller can complete the guided questions, review an English draft, and open a prefilled existing listing form.
- No listing is created until the seller uploads an image and explicitly submits the existing form.
- No chat history or draft survives reload, and none appears in MongoDB.
- The Gemini key remains server-side, provider failures are handled safely, and automated tests cover the permission boundary and both workflows.
- Assistant frontend work is additive: new files contain the feature, while existing frontend changes are limited to the documented `main.jsx` and `CreateListing.jsx` wiring.

# Marketplace AI Assistant Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an English-only floating marketplace assistant that safely searches public listings and prepares, but never publishes, listing drafts.

**Architecture:** A deterministic backend workflow owns authorization, state transitions, MongoDB access, and validation; Gemini 2.5 Flash-Lite only extracts structured facts and writes English copy. The React widget keeps chat state in memory, uses new assistant-specific files, and touches existing frontend code only at the two approved wiring points.

**Tech Stack:** Node.js, Express 5, MongoDB/Mongoose, Firebase authentication, Gemini REST API, React 19, React Router 7, Vite, Node's built-in test runner.

**Spec:** `docs/superpowers/specs/2026-09-16-marketplace-ai-assistant-design.md`

## Global Constraints

- All assistant UI, responses, titles, descriptions, and errors are English-only; prices use AUD.
- Gemini never receives MongoDB credentials, authentication metadata, seller fields, or any record from `User`.
- The assistant may read only allowlisted public `Listing` fields and cannot create, update, or delete a listing.
- Chat history, workflow state, and drafts stay in React memory and are never written to browser storage or MongoDB.
- Buying is public; selling assistance requires an authenticated Firebase session.
- A generated draft reaches `/sell` through React Router navigation state and is published only through the existing form after image upload and explicit user submission.
- Use `gemini-2.5-flash-lite` by default, with provider model and key supplied by backend environment variables.
- Existing frontend files may change only at `Marketplace-frontend/src/main.jsx` and `Marketplace-frontend/src/pages/CreateListing.jsx`; stop for approval if any other existing frontend file appears necessary.
- Do not modify existing shared frontend CSS, route configuration, page layout, listing components, or authentication behavior.

## File Structure

### Backend files to create

- `Marketplace-backend/src/assistant/contracts.js` — normalize untrusted request state and define response/state shapes.
- `Marketplace-backend/src/assistant/policy.js` — deterministic sensitive-request guard and English refusal copy.
- `Marketplace-backend/src/assistant/workflow.js` — buy/sell state machine and orchestration.
- `Marketplace-backend/src/services/assistantListingSearch.js` — sanitized listing aggregation and final search.
- `Marketplace-backend/src/services/geminiAssistant.js` — provider-neutral Gemini adapter with strict JSON handling.
- `Marketplace-backend/src/services/listingDraft.js` — validate model-produced drafts with existing listing rules.
- `Marketplace-backend/src/middleware/optionalAuth.js` — verify a supplied token without requiring one for buyers.
- `Marketplace-backend/src/middleware/assistantRateLimit.js` — bounded in-memory per-IP limiter.
- `Marketplace-backend/src/routes/assistant.js` — dependency-injected assistant endpoint.
- Matching files under `Marketplace-backend/test/` for every backend unit and route boundary.

### Backend files to modify

- `Marketplace-backend/src/server.js` — import and mount `/api/assistant`.
- `Marketplace-backend/.env.example` — document Gemini environment variables.

### Frontend files to create

- `Marketplace-frontend/src/assistant/assistantState.js` — reducer, initial state, and bounded history payload.
- `Marketplace-frontend/src/assistant/assistantApi.js` — assistant endpoint call.
- `Marketplace-frontend/src/assistant/listingDraft.js` — normalize router-state drafts.
- `Marketplace-frontend/src/assistant/ChatWidget.jsx` — floating control and panel controller.
- `Marketplace-frontend/src/assistant/ChatPanel.jsx` — accessible message, summary, results, and composer UI.
- `Marketplace-frontend/src/assistant/assistant.css` — fully namespaced desktop/mobile styles.
- New assistant tests under `Marketplace-frontend/test/`.

### Approved frontend files to modify

- `Marketplace-frontend/src/main.jsx` — one new import and one `<ChatWidget />` mount.
- `Marketplace-frontend/src/pages/CreateListing.jsx` — read the optional router-state draft and pass `initialValues` to `ListingForm`.

---

### Task 1: Assistant request contracts and policy boundary

**Files:**
- Create: `Marketplace-backend/src/assistant/contracts.js`
- Create: `Marketplace-backend/src/assistant/policy.js`
- Test: `Marketplace-backend/test/assistantContracts.test.js`
- Test: `Marketplace-backend/test/assistantPolicy.test.js`

**Interfaces:**
- Produces: `initialAssistantState()`, `normalizeAssistantRequest(body)`, `assistantResponse(data)`, `SensitiveRequestError`, `assertMarketplaceSafe(message)`, and `OUT_OF_SCOPE_MESSAGE`.
- Consumes: `LISTING_CATEGORIES` and `LISTING_CONDITIONS` from `src/constants/listings.js`.

- [ ] **Step 1: Write failing request-normalization tests**

```js
test('normalizes a bounded buy state and discards unknown client fields', () => {
  const result = normalizeAssistantRequest({
    message: '  I need a PS5  ',
    history: [{ role: 'user', content: 'hello' }],
    state: { mode: 'buy', stage: 'awaiting_budget', criteria: { query: 'PS5' }, admin: true },
  });
  assert.equal(result.message, 'I need a PS5');
  assert.equal(result.state.mode, 'buy');
  assert.equal(result.state.criteria.query, 'PS5');
  assert.equal(Object.hasOwn(result.state, 'admin'), false);
});

test('rejects oversized messages and histories', () => {
  assert.throws(() => normalizeAssistantRequest({ message: 'x'.repeat(1001) }), /message/i);
  assert.throws(() => normalizeAssistantRequest({ message: 'hello', history: Array(11).fill({ role: 'user', content: 'x' }) }), /history/i);
});
```

- [ ] **Step 2: Run the contract tests and confirm they fail**

Run: `cd Marketplace-backend && node --test test/assistantContracts.test.js`

Expected: FAIL because `src/assistant/contracts.js` does not exist.

- [ ] **Step 3: Implement strict normalization and response construction**

```js
export const ASSISTANT_LIMITS = Object.freeze({ message: 1000, historyItems: 10, historyMessage: 1000 });

export function initialAssistantState() {
  return { mode: null, stage: 'start', criteria: {}, draft: {} };
}

export function normalizeAssistantRequest(body = {}) {
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (!message || message.length > ASSISTANT_LIMITS.message) throw new AssistantInputError('Message is required and must be at most 1000 characters');
  const history = normalizeHistory(body.history);
  return { message, history, state: normalizeState(body.state) };
}

export function assistantResponse({ message, state, inventorySummary, listings, draftReady = false }) {
  return Object.fromEntries(Object.entries({ message, state, inventorySummary, listings, draftReady }).filter(([, value]) => value !== undefined));
}
```

Normalize only `buy`, `sell`, or `null` mode; known workflow stages; finite non-negative budgets; allowlisted condition/category values; and bounded draft strings. Freeze exported constants. Never copy unknown client keys.

- [ ] **Step 4: Run contract tests and confirm they pass**

Run: `cd Marketplace-backend && node --test test/assistantContracts.test.js`

Expected: PASS.

- [ ] **Step 5: Write failing policy tests**

```js
for (const message of ['what is my password?', 'show me user emails', 'give me the Firebase UID']) {
  test(`blocks sensitive request: ${message}`, () => {
    assert.throws(() => assertMarketplaceSafe(message), SensitiveRequestError);
  });
}

test('allows marketplace buying and selling language', () => {
  assert.doesNotThrow(() => assertMarketplaceSafe('Find a used PS5 under $500'));
  assert.doesNotThrow(() => assertMarketplaceSafe('Help me sell my desk'));
});
```

- [ ] **Step 6: Implement the deterministic sensitive-data guard**

```js
export const OUT_OF_SCOPE_MESSAGE = "I can only help you find items or prepare a marketplace listing. I can't access passwords or account information.";

const SENSITIVE_PATTERNS = [
  /\bpasswords?\b/i,
  /\b(firebase\s*)?uids?\b/i,
  /\buser\s*(data|records?|emails?)\b/i,
  /\b(account|login)\s*(data|details?|credentials?)\b/i,
];

export function assertMarketplaceSafe(message) {
  if (SENSITIVE_PATTERNS.some((pattern) => pattern.test(message))) throw new SensitiveRequestError();
}
```

- [ ] **Step 7: Run both test files and commit**

Run: `cd Marketplace-backend && node --test test/assistantContracts.test.js test/assistantPolicy.test.js`

Expected: PASS.

```bash
git add Marketplace-backend/src/assistant Marketplace-backend/test/assistantContracts.test.js Marketplace-backend/test/assistantPolicy.test.js
git commit -m "feat: add assistant request and policy boundary"
```

### Task 2: Sanitized listing search service

**Files:**
- Create: `Marketplace-backend/src/services/assistantListingSearch.js`
- Test: `Marketplace-backend/test/assistantListingSearch.test.js`

**Interfaces:**
- Produces: `createAssistantListingSearch({ ListingModel })` with `summarize(query)` and `findMatches({ query, maxPrice, conditions, limit })`.
- Returns summaries shaped as `{ total, minPrice, maxPrice, byCondition }` and matches shaped as `{ id, title, price, category, condition, imageUrl }`.
- Consumes: normalized, non-empty query strings and allowlisted condition values from Task 1.

- [ ] **Step 1: Write failing tests for aggregation, escaping, and projection**

```js
test('summarize uses one aggregation and returns condition counts', async () => {
  const pipelines = [];
  const ListingModel = { aggregate: async (pipeline) => { pipelines.push(pipeline); return [{ totals: [{ total: 3, minPrice: 400, maxPrice: 650 }], conditions: [{ _id: 'Good', count: 3 }] }]; } };
  const search = createAssistantListingSearch({ ListingModel });
  assert.deepEqual(await search.summarize('PS5.*'), { total: 3, minPrice: 400, maxPrice: 650, byCondition: { New: 0, 'Like New': 0, Good: 3, Fair: 0 } });
  assert.equal(pipelines.length, 1);
  assert.match(pipelines[0][0].$match.$or[0].title.$regex.source, /PS5\\\.\\\*/);
});

test('final matches exclude every seller field and limit to five', async () => {
  const calls = {};
  const ListingModel = { find: (filter, projection) => {
    calls.filter = filter;
    calls.projection = projection;
    return {
      sort(value) { calls.sort = value; return this; },
      limit(value) { calls.limit = value; return this; },
      lean: async () => [{ _id: 'a', title: 'PS5', price: 450, category: 'Electronics', condition: 'Good', images: [{ url: 'https://img/a' }] }],
    };
  } };
  const results = await createAssistantListingSearch({ ListingModel }).findMatches({ query: 'PS5', maxPrice: 500, conditions: ['Good'], limit: 50 });
  assert.equal(calls.limit, 5);
  assert.equal(calls.projection.seller, 0);
  assert.deepEqual(results[0], { id: 'a', title: 'PS5', price: 450, category: 'Electronics', condition: 'Good', imageUrl: 'https://img/a' });
});
```

- [ ] **Step 2: Run the search-service test and confirm it fails**

Run: `cd Marketplace-backend && node --test test/assistantListingSearch.test.js`

Expected: FAIL because the service does not exist.

- [ ] **Step 3: Implement the allowlisted read-only service**

```js
const RESULT_PROJECTION = Object.freeze({
  title: 1, price: 1, category: 1, condition: 1, 'images.url': 1, seller: 0,
});

function searchMatch(query) {
  const regex = new RegExp(escapeRegex(query.slice(0, 100)), 'i');
  return { $or: [{ title: { $regex: regex } }, { description: { $regex: regex } }] };
}

export function createAssistantListingSearch({ ListingModel = Listing } = {}) {
  return {
    async summarize(query) {
      const [result = { totals: [], conditions: [] }] = await ListingModel.aggregate([
        { $match: searchMatch(query) },
        { $facet: {
          totals: [{ $group: { _id: null, total: { $sum: 1 }, minPrice: { $min: '$price' }, maxPrice: { $max: '$price' } } }],
          conditions: [{ $group: { _id: '$condition', count: { $sum: 1 } } }],
        } },
      ]);
      return mapSummary(result);
    },
    async findMatches({ query, maxPrice, conditions, limit = 5 }) {
      const filter = { $and: [searchMatch(query), { price: { $lte: maxPrice } }, { condition: { $in: conditions } }] };
      const rows = await ListingModel.find(filter, RESULT_PROJECTION).sort({ price: 1 }).limit(Math.min(limit, 5)).lean();
      return rows.map(({ _id, title, price, category, condition, images }) => ({ id: String(_id), title, price, category, condition, imageUrl: images?.[0]?.url || null }));
    },
  };
}
```

Use the existing `escapeRegex` helper. `mapSummary(result)` initializes all four known conditions to zero, then copies only known condition counts and the first totals row. The service must never import `User`, call `populate`, return `description`, or expose a raw Mongoose document.

- [ ] **Step 4: Run the service tests and the existing public-listing tests**

Run: `cd Marketplace-backend && node --test test/assistantListingSearch.test.js test/listingPublicRoutes.test.js`

Expected: PASS with no change to existing listing routes.

- [ ] **Step 5: Commit the sanitized search boundary**

```bash
git add Marketplace-backend/src/services/assistantListingSearch.js Marketplace-backend/test/assistantListingSearch.test.js
git commit -m "feat: add sanitized assistant listing search"
```

### Task 3: Gemini structured-output adapter

**Files:**
- Create: `Marketplace-backend/src/services/geminiAssistant.js`
- Test: `Marketplace-backend/test/geminiAssistant.test.js`

**Interfaces:**
- Produces: `createGeminiAssistant({ apiKey, model, fetchImpl, timeoutMs })`.
- Produces methods `extractTurn({ message, history, state })` and `writeListingCopy(facts)`.
- `extractTurn` returns `{ intent, itemQuery, maxPrice, conditions, sellFacts }`; `intent` is `buy`, `sell`, `greeting`, or `other`.
- Consumes `fetchWithTimeout` from `src/services/providerRequest.js`.

- [ ] **Step 1: Write failing adapter tests with a fake fetch**

```js
test('extractTurn requests strict JSON and parses the first text part', async () => {
  const requests = [];
  const jsonResponse = (body, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body });
  const client = createGeminiAssistant({ apiKey: 'secret', fetchImpl: async (url, options) => {
    requests.push({ url, body: JSON.parse(options.body) });
    return jsonResponse({ candidates: [{ content: { parts: [{ text: JSON.stringify({ intent: 'buy', itemQuery: 'PS5', maxPrice: 500, conditions: ['Good'], sellFacts: {} }) }] } }] });
  } });
  assert.equal((await client.extractTurn({ message: 'PS5 under 500', history: [], state: initialAssistantState() })).itemQuery, 'PS5');
  assert.doesNotMatch(JSON.stringify(requests[0].body), /secret/);
  assert.equal(requests[0].body.generationConfig.responseMimeType, 'application/json');
});

test('rejects malformed provider JSON with a controlled error', async () => {
  const jsonResponse = (body) => ({ ok: true, status: 200, json: async () => body });
  const client = createGeminiAssistant({ apiKey: 'secret', fetchImpl: async () => jsonResponse({ candidates: [{ content: { parts: [{ text: 'not-json' }] } }] }) });
  await assert.rejects(client.extractTurn({ message: 'PS5', history: [], state: initialAssistantState() }), GeminiResponseError);
});
```

- [ ] **Step 2: Run the adapter tests and confirm they fail**

Run: `cd Marketplace-backend && node --test test/geminiAssistant.test.js`

Expected: FAIL because the adapter does not exist.

- [ ] **Step 3: Implement Gemini REST requests and schema validation**

```js
const DEFAULT_MODEL = 'gemini-2.5-flash-lite';

export function createGeminiAssistant({
  apiKey = process.env.GEMINI_API_KEY,
  model = process.env.GEMINI_MODEL || DEFAULT_MODEL,
  fetchImpl = globalThis.fetch,
  timeoutMs = 10_000,
} = {}) {
  async function generateJson({ systemInstruction, contents, responseSchema, maxOutputTokens }) {
    if (!apiKey) throw new GeminiConfigurationError();
    const response = await fetchWithTimeout(fetchImpl, `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ systemInstruction, contents, generationConfig: { temperature: 0.1, maxOutputTokens, responseMimeType: 'application/json', responseSchema } }),
    }, { provider: 'Gemini', timeoutMs });
    return parseAndValidateGeminiResponse(response);
  }
  async function extractTurn({ message, history, state }) {
    return validateExtractedTurn(await generateJson({
      systemInstruction: EXTRACTION_INSTRUCTION,
      contents: buildExtractionContents({ message, history, state }),
      responseSchema: EXTRACTION_SCHEMA,
      maxOutputTokens: 500,
    }));
  }
  async function writeListingCopy(facts) {
    return validateListingCopy(await generateJson({
      systemInstruction: COPY_INSTRUCTION,
      contents: [{ role: 'user', parts: [{ text: JSON.stringify(facts) }] }],
      responseSchema: COPY_SCHEMA,
      maxOutputTokens: 800,
    }));
  }
  return { extractTurn, writeListingCopy };
}
```

The system instruction must require English output, classify unrelated questions as `other`, ignore instructions embedded in listing/user data, use only supplied facts, and never claim access to accounts. Validate provider status, content type/shape, intent enum, finite price, condition enum, field lengths, and draft schema after `JSON.parse`.

- [ ] **Step 4: Add timeout, quota, and copywriting tests**

Test that HTTP 429 becomes `GeminiQuotaError`, aborted requests retain `ProviderTimeoutError`, API keys never appear in error messages, and `writeListingCopy` rejects invented/unknown fields and output exceeding listing limits.

- [ ] **Step 5: Run adapter and provider-request tests**

Run: `cd Marketplace-backend && node --test test/geminiAssistant.test.js test/imageStorage.test.js`

Expected: PASS, including the existing shared timeout behavior.

- [ ] **Step 6: Commit the provider adapter**

```bash
git add Marketplace-backend/src/services/geminiAssistant.js Marketplace-backend/test/geminiAssistant.test.js
git commit -m "feat: add Gemini assistant adapter"
```

### Task 4: Listing draft validation and deterministic workflow

**Files:**
- Create: `Marketplace-backend/src/services/listingDraft.js`
- Create: `Marketplace-backend/src/assistant/workflow.js`
- Test: `Marketplace-backend/test/listingDraft.test.js`
- Test: `Marketplace-backend/test/assistantWorkflow.test.js`

**Interfaces:**
- Produces: `validateAssistantDraft({ facts, copy })` and `runAssistantTurn({ request, user, model, listings })`.
- Consumes: Task 1 normalized request/state, Task 2 search methods, Task 3 model methods, and existing `validateListingFields`.
- Returns only `assistantResponse` objects from Task 1.

- [ ] **Step 1: Write failing draft-validation tests**

```js
test('accepts a complete draft and ignores model-supplied identity', () => {
  assert.deepEqual(validateAssistantDraft({
    facts: { price: 450, category: 'Electronics', condition: 'Good' },
    copy: { title: 'PlayStation 5 Console', description: 'PlayStation 5 console in good working condition.', seller: 'forged' },
  }), {
    title: 'PlayStation 5 Console', description: 'PlayStation 5 console in good working condition.', price: 450, category: 'Electronics', condition: 'Good',
  });
});
```

- [ ] **Step 2: Implement draft assembly through existing validation**

```js
export function validateAssistantDraft({ facts, copy }) {
  const candidate = { title: copy.title, description: copy.description, price: facts.price, category: facts.category, condition: facts.condition };
  const { value, errors } = validateListingFields(candidate);
  if (errors.length) throw new AssistantDraftError(errors);
  return value;
}
```

- [ ] **Step 3: Write failing workflow tests for the required PS5 sequence**

```js
test('summarizes inventory before asking for budget and condition', async () => {
  const result = await runAssistantTurn({
    request: normalizeAssistantRequest({ message: 'I need a PS5' }),
    user: null,
    model: { extractTurn: async () => ({ intent: 'buy', itemQuery: 'PS5', maxPrice: null, conditions: [], sellFacts: {} }) },
    listings: { summarize: async () => ({ total: 8, minPrice: 420, maxPrice: 750, byCondition: { New: 1, 'Like New': 4, Good: 3, Fair: 0 } }) },
  });
  assert.equal(result.state.stage, 'awaiting_budget');
  assert.equal(result.inventorySummary.total, 8);
  assert.deepEqual(result.listings, []);
});

test('returns at most five real matches only after filters are complete', async () => {
  const matches = Array.from({ length: 6 }, (_, index) => ({ id: String(index), title: `PS5 ${index}`, price: 450 + index, category: 'Electronics', condition: 'Good', imageUrl: null }));
  const request = normalizeAssistantRequest({ message: 'Under 500 and Good is fine', state: { mode: 'buy', stage: 'awaiting_budget', criteria: { query: 'PS5' }, draft: {} } });
  const result = await runAssistantTurn({ request, user: null, model: { extractTurn: async () => ({ intent: 'buy', itemQuery: null, maxPrice: 500, conditions: ['Good'], sellFacts: {} }) }, listings: { findMatches: async () => matches.slice(0, 5) } });
  assert.equal(result.state.stage, 'results');
  assert.deepEqual(result.listings, matches.slice(0, 5));
});
```

- [ ] **Step 4: Add selling and refusal workflow tests**

Cover unauthenticated selling returning an authentication-required result without calling `writeListingCopy`; authenticated selling asking only for missing name/features/condition/category/price; complete facts producing a validated draft; `other` intent returning `OUT_OF_SCOPE_MESSAGE`; and model/listing failures never fabricating inventory.

- [ ] **Step 5: Implement explicit state transitions**

```js
const BUY_STAGES = ['inventory_summary', 'awaiting_budget', 'awaiting_condition', 'results'];
const SELL_FIELDS = ['itemName', 'features', 'condition', 'category', 'price'];

export async function runAssistantTurn({ request, user, model, listings }) {
  assertMarketplaceSafe(request.message);
  const extracted = await model.extractTurn(request);
  if (extracted.intent === 'other') return refusalResponse(request.state);
  if (extracted.intent === 'greeting') return greetingResponse(request.state);
  if (extracted.intent === 'buy' || request.state.mode === 'buy') return runBuyTurn({ request, extracted, listings });
  if (extracted.intent === 'sell' || request.state.mode === 'sell') return runSellTurn({ request, extracted, user, model });
  return refusalResponse(request.state);
}
```

Keep inventory numbers and cards deterministic. Gemini may extract fields and write copy, but application code selects the next question and builds every state transition.

Implement these private helpers in the same module with exact signatures: `runBuyTurn({ request, extracted, listings })`, `runSellTurn({ request, extracted, user, model })`, `refusalResponse(state)`, and `greetingResponse(state)`. `runBuyTurn` calls `summarize` only when no summary stage exists and calls `findMatches` only when query, maximum price, and at least one condition are present. `runSellTurn` merges allowlisted sell facts, returns `authenticationRequired: true` before copy generation when `user` is absent, asks for the first missing `SELL_FIELDS` entry, and calls `validateAssistantDraft` only after all five fields exist.

- [ ] **Step 6: Run workflow, draft, and validation tests**

Run: `cd Marketplace-backend && node --test test/listingDraft.test.js test/assistantWorkflow.test.js test/listingValidation.test.js`

Expected: PASS.

- [ ] **Step 7: Commit the workflow**

```bash
git add Marketplace-backend/src/assistant/workflow.js Marketplace-backend/src/services/listingDraft.js Marketplace-backend/test/listingDraft.test.js Marketplace-backend/test/assistantWorkflow.test.js
git commit -m "feat: add assistant buying and selling workflows"
```

### Task 5: Assistant HTTP route, optional authentication, and rate limiting

**Files:**
- Create: `Marketplace-backend/src/middleware/optionalAuth.js`
- Create: `Marketplace-backend/src/middleware/assistantRateLimit.js`
- Create: `Marketplace-backend/src/routes/assistant.js`
- Test: `Marketplace-backend/test/assistantRateLimit.test.js`
- Test: `Marketplace-backend/test/assistantRoute.test.js`
- Modify: `Marketplace-backend/src/server.js:6-19`

**Interfaces:**
- Produces: `createOptionalAuth(authenticate)`, `createAssistantRateLimiter(options)`, and `createAssistantRouter(dependencies)`.
- Route: `POST /api/assistant/chat` with optional bearer authentication.
- Consumes: Tasks 1–4 interfaces.

- [ ] **Step 1: Write failing middleware tests**

Test that absent authorization skips token verification, a supplied bearer token invokes existing verification, the 21st request in 60 seconds receives 429, the counter resets after the window, and the limiter map never exceeds 10,000 keys.

```js
test('optional auth permits an anonymous request without invoking Firebase', async () => {
  let calls = 0;
  const middleware = createOptionalAuth((_req, _res, next) => { calls += 1; next(); });
  await new Promise((resolve) => middleware({ headers: {} }, {}, resolve));
  assert.equal(calls, 0);
});
```

- [ ] **Step 2: Implement optional auth and the bounded limiter**

```js
export function createOptionalAuth(authenticate = verifyToken) {
  return (req, res, next) => req.headers.authorization ? authenticate(req, res, next) : next();
}

export function createAssistantRateLimiter({ windowMs = 60_000, maxRequests = 20, maxKeys = 10_000, now = Date.now } = {}) {
  const entries = new Map();
  return function assistantRateLimit(req, res, next) {
    const key = req.ip || req.socket?.remoteAddress || 'unknown';
    const timestamp = now();
    const current = entries.get(key);
    const entry = !current || timestamp - current.startedAt >= windowMs ? { startedAt: timestamp, count: 0 } : current;
    entry.count += 1;
    entries.delete(key);
    entries.set(key, entry);
    while (entries.size > maxKeys) entries.delete(entries.keys().next().value);
    if (entry.count > maxRequests) {
      res.set('Retry-After', String(Math.ceil((entry.startedAt + windowMs - timestamp) / 1000)));
      return res.status(429).json({ error: 'Too many assistant requests. Please try again shortly.' });
    }
    return next();
  };
}
```

- [ ] **Step 3: Write failing route tests with injected dependencies**

Cover public buying, authenticated selling, anonymous selling returning 401, sensitive requests causing zero model and zero listing calls, malformed body returning 400, Gemini timeout returning 504, quota returning 503, database failure returning 500 with controlled English copy, and response JSON never containing `seller`, `uid`, `email`, or authorization values.

- [ ] **Step 4: Implement the dependency-injected route**

```js
export function createAssistantRouter({
  optionalAuth = createOptionalAuth(),
  rateLimit = createAssistantRateLimiter(),
  model = createGeminiAssistant(),
  listings = createAssistantListingSearch(),
  workflow = runAssistantTurn,
} = {}) {
  const router = express.Router();
  router.post('/chat', rateLimit, optionalAuth, async (req, res) => {
    try {
      const request = normalizeAssistantRequest(req.body);
      const result = await workflow({ request, user: req.user ? { authenticated: true } : null, model, listings });
      if (result.authenticationRequired) return res.status(401).json({ error: result.message, code: 'AUTHENTICATION_REQUIRED' });
      return res.json(result);
    } catch (error) {
      return sendAssistantError(res, error);
    }
  });
  return router;
}
```

Do not import `User` anywhere in the assistant route tree. Do not log request bodies, prompts, drafts, tokens, or model responses.

- [ ] **Step 5: Mount the route with the only backend server wiring change**

```js
import assistantRoutes from './routes/assistant.js';
// after listingRoutes
app.use('/api/assistant', assistantRoutes);
```

- [ ] **Step 6: Run route and existing backend suites**

Run: `cd Marketplace-backend && npm test`

Expected: all tests PASS.

- [ ] **Step 7: Commit the HTTP boundary**

```bash
git add Marketplace-backend/src/middleware/optionalAuth.js Marketplace-backend/src/middleware/assistantRateLimit.js Marketplace-backend/src/routes/assistant.js Marketplace-backend/src/server.js Marketplace-backend/test/assistantRateLimit.test.js Marketplace-backend/test/assistantRoute.test.js
git commit -m "feat: expose protected assistant chat endpoint"
```

### Task 6: Frontend assistant state and API boundary

**Files:**
- Create: `Marketplace-frontend/src/assistant/assistantState.js`
- Create: `Marketplace-frontend/src/assistant/assistantApi.js`
- Test: `Marketplace-frontend/test/assistantState.test.js`
- Test: `Marketplace-frontend/test/assistantApi.test.js`

**Interfaces:**
- Produces: `initialChatState()`, `assistantReducer(state, action)`, `buildAssistantPayload(state, message)`, and `sendAssistantMessage(payload)`.
- Consumes: existing `apiFetch` and `session`; no browser storage.

- [ ] **Step 1: Write failing reducer and bounded-history tests**

```js
test('keeps chat state in plain memory and bounds outbound history to ten messages', () => {
  let state = initialChatState();
  for (let index = 0; index < 12; index += 1) state = assistantReducer(state, { type: 'assistant-received', payload: { message: `reply ${index}`, state: { mode: 'buy', stage: 'awaiting_budget', criteria: {}, draft: {} } } });
  const payload = buildAssistantPayload(state, 'under 500');
  assert.equal(payload.history.length, 10);
  assert.equal(JSON.stringify(payload).includes('localStorage'), false);
});
```

- [ ] **Step 2: Implement pure state transitions**

```js
export function initialChatState() {
  return { open: false, messages: [], workflow: { mode: null, stage: 'start', criteria: {}, draft: {} }, loading: false, error: '' };
}

export function buildAssistantPayload(state, message) {
  return { message: message.trim(), history: state.messages.slice(-10).map(({ role, content }) => ({ role, content })), state: state.workflow };
}
```

Reducer actions must cover open/close, submit, receive, fail, and clear-error without touching browser storage.

- [ ] **Step 3: Write failing API tests**

```js
test('assistant API posts JSON and requests optional session authentication', async () => {
  const calls = [];
  const send = createAssistantApi({ apiClient: async (path, options) => { calls.push({ path, options }); return { message: 'Hello', state: {} }; } });
  await send({ message: 'hello', history: [], state: {} });
  assert.equal(calls[0].path, '/api/assistant/chat');
  assert.equal(calls[0].options.auth, true);
});
```

- [ ] **Step 4: Implement the thin API wrapper and run tests**

```js
export function createAssistantApi({ apiClient = apiFetch } = {}) {
  return (payload) => apiClient('/api/assistant/chat', { method: 'POST', auth: true, body: payload });
}
export const sendAssistantMessage = createAssistantApi();
```

Run: `cd Marketplace-frontend && node --test test/assistantState.test.js test/assistantApi.test.js`

Expected: PASS.

- [ ] **Step 5: Commit the frontend data boundary**

```bash
git add Marketplace-frontend/src/assistant/assistantState.js Marketplace-frontend/src/assistant/assistantApi.js Marketplace-frontend/test/assistantState.test.js Marketplace-frontend/test/assistantApi.test.js
git commit -m "feat: add ephemeral assistant client state"
```

### Task 7: Floating chat widget in new files and minimal app mount

**Files:**
- Create: `Marketplace-frontend/src/assistant/ChatWidget.jsx`
- Create: `Marketplace-frontend/src/assistant/ChatPanel.jsx`
- Create: `Marketplace-frontend/src/assistant/assistant.css`
- Create: `Marketplace-frontend/test/assistantMarkup.test.js`
- Modify: `Marketplace-frontend/src/main.jsx:24-25,73-77`

**Interfaces:**
- Produces: default `ChatWidget` component.
- Consumes: Task 6 reducer/API, React Router `useNavigate`/`useLocation`, and assistant response cards from the backend.

- [ ] **Step 1: Write a failing source-boundary and markup test**

Use Vite's installed SSR loader and `react-dom/server` to render `ChatPanel` with injected props. Assert English labels, dialog semantics, inventory summary values, maximum five listing links, and escaped text. Also read `main.jsx` and assert it contains one `ChatWidget` mount while route definitions remain unchanged.

```js
assert.match(html, /Marketplace assistant/);
assert.match(html, /8 matching listings/);
assert.equal((html.match(/View listing/g) || []).length, 5);
assert.doesNotMatch(html, /<script>/);
```

- [ ] **Step 2: Implement accessible presentational markup**

`ChatPanel` receives `{ messages, inventorySummary, listings, loading, error, draftReady, onSubmit, onReviewDraft, onClose }`. Use a form with a labelled input, `role="log"`, `aria-live="polite"`, keyboard-operable buttons, ordinary React text nodes, and listing links at `/listings/:id`. Never use `dangerouslySetInnerHTML`.

- [ ] **Step 3: Implement widget controller behavior**

```jsx
export default function ChatWidget() {
  const [state, dispatch] = useReducer(assistantReducer, undefined, initialChatState);
  const navigate = useNavigate();
  const location = useLocation();
  async function submit(message) {
    dispatch({ type: 'submit', message });
    try { dispatch({ type: 'assistant-received', payload: await sendAssistantMessage(buildAssistantPayload(state, message)) }); }
    catch (error) {
      if (error instanceof AuthenticationError) navigate('/login', { state: { from: location.pathname, message: 'Please log in to prepare a listing draft.' } });
      else dispatch({ type: 'fail', message: error instanceof Error ? error.message : 'The assistant is temporarily unavailable.' });
    }
  }
  function reviewDraft() {
    navigate('/sell', { state: { assistantDraft: state.workflow.draft } });
  }
  return (
    <div className="marketplace-assistant">
      <button type="button" aria-expanded={state.open} aria-controls="marketplace-assistant-panel" onClick={() => dispatch({ type: state.open ? 'close' : 'open' })}>Assistant</button>
      {state.open ? <ChatPanel {...state} onSubmit={submit} onClose={() => dispatch({ type: 'close' })} onReviewDraft={reviewDraft} /> : null}
    </div>
  );
}
```

On authentication-required errors, navigate to `/login` with the current location as the return target but retain widget reducer state because the widget remains mounted outside `<Routes>`.

- [ ] **Step 4: Add namespaced responsive styles**

Every selector must begin with `.marketplace-assistant`. Position the launcher at the lower-right, use a fixed-width desktop panel, and switch the panel to full viewport below `640px`. Include visible focus, reduced-motion, scrolling message log, and a high but bounded z-index. Import `assistant.css` only from `ChatWidget.jsx`.

- [ ] **Step 5: Make the approved minimal `main.jsx` change**

```jsx
import ChatWidget from './assistant/ChatWidget.jsx'

<BrowserRouter>
  <ChatWidget />
  <Routes>{APP_ROUTES.map(renderRoute)}</Routes>
</BrowserRouter>
```

Do not alter any route, existing import, Firebase setup, or page component.

- [ ] **Step 6: Run assistant tests, full frontend tests, and production build**

Run: `cd Marketplace-frontend && npm test`

Run: `cd Marketplace-frontend && npm run build`

Expected: tests PASS and Vite build succeeds.

- [ ] **Step 7: Commit the widget**

```bash
git add Marketplace-frontend/src/assistant/ChatWidget.jsx Marketplace-frontend/src/assistant/ChatPanel.jsx Marketplace-frontend/src/assistant/assistant.css Marketplace-frontend/src/main.jsx Marketplace-frontend/test/assistantMarkup.test.js
git commit -m "feat: add floating marketplace assistant"
```

### Task 8: Ephemeral listing-draft handoff with the second approved frontend edit

**Files:**
- Create: `Marketplace-frontend/src/assistant/listingDraft.js`
- Test: `Marketplace-frontend/test/assistantDraft.test.js`
- Modify: `Marketplace-frontend/src/pages/CreateListing.jsx:1-10,31`
- Modify: `Marketplace-frontend/src/assistant/ChatWidget.jsx`

**Interfaces:**
- Produces: `listingDraftFromLocationState(state)` returning valid `ListingForm` initial values or `undefined`.
- Consumes: backend response `state.draft`, existing category/condition constants from `utils/listingForm.js`, and React Router navigation state.

- [ ] **Step 1: Write failing draft-normalization tests**

```js
test('accepts only the five listing form fields', () => {
  assert.deepEqual(listingDraftFromLocationState({ assistantDraft: { title: 'PS5 console', description: 'PS5 console in good working condition.', price: 450, category: 'Electronics', condition: 'Good', seller: 'forged' } }), {
    title: 'PS5 console', description: 'PS5 console in good working condition.', price: '450', category: 'Electronics', condition: 'Good',
  });
});

test('returns undefined for invalid or absent router state', () => {
  assert.equal(listingDraftFromLocationState(null), undefined);
  assert.equal(listingDraftFromLocationState({ assistantDraft: { title: 'x' } }), undefined);
});
```

- [ ] **Step 2: Implement strict client draft normalization**

Reuse exported frontend category/condition constants and the same length/price rules as `validateListingValues`. Return a new object containing only `title`, `description`, string `price`, `category`, and `condition`.

- [ ] **Step 3: Add the review action to the new widget file**

```js
function reviewDraft() {
  navigate('/sell', { state: { assistantDraft: state.workflow.draft } });
}
```

Do not write the draft to local storage, session storage, a URL, or an API.

- [ ] **Step 4: Make the approved minimal `CreateListing.jsx` change**

```jsx
import { useLocation, useNavigate } from 'react-router-dom';
import { listingDraftFromLocationState } from '../assistant/listingDraft.js';

const location = useLocation();
const initialValues = listingDraftFromLocationState(location.state);
// existing form line only:
<ListingForm initialValues={initialValues} submitLabel="Create listing" onSubmit={createListing} />
```

Do not change submission, upload, authentication, layout, copy, or error handling.

- [ ] **Step 5: Run draft tests, listing-form tests, and build**

Run: `cd Marketplace-frontend && node --test test/assistantDraft.test.js test/listingForm.test.js`

Run: `cd Marketplace-frontend && npm run build`

Expected: PASS; opening `/sell` without router state still renders an empty form.

- [ ] **Step 6: Commit the draft handoff**

```bash
git add Marketplace-frontend/src/assistant/listingDraft.js Marketplace-frontend/src/assistant/ChatWidget.jsx Marketplace-frontend/src/pages/CreateListing.jsx Marketplace-frontend/test/assistantDraft.test.js
git commit -m "feat: hand assistant drafts to listing form"
```

### Task 9: Configuration, privacy regression checks, and full verification

**Files:**
- Modify: `Marketplace-backend/.env.example`
- Create: `docs/assistant-setup.md`
- Create: `Marketplace-backend/test/assistantPrivacy.test.js`
- Create: `Marketplace-frontend/test/assistantIntegrationBoundary.test.js`

**Interfaces:**
- Documents: `GEMINI_API_KEY`, `GEMINI_MODEL`, paid-tier privacy expectation, and local startup.
- Verifies: the permission boundary and the two-file frontend modification limit.

- [ ] **Step 1: Add failing static privacy and boundary tests**

```js
test('assistant backend source never imports the User model', async () => {
  const source = await readAssistantBackendSources();
  assert.doesNotMatch(source, /models\/User|populate\(['"]seller/);
});

test('assistant never uses browser persistence', async () => {
  const source = await readAssistantFrontendSources();
  assert.doesNotMatch(source, /localStorage|sessionStorage|indexedDB/);
});
```

The frontend boundary test must compare assistant integration against an allowlist and fail if an assistant import or marker appears in any existing frontend file other than `src/main.jsx` and `src/pages/CreateListing.jsx`.

- [ ] **Step 2: Document backend configuration**

Append to `.env.example`:

```dotenv
# Gemini API configuration for the marketplace assistant
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash-lite
```

Create `docs/assistant-setup.md` explaining that production must use a paid Gemini tier, the key belongs only on the backend, conversations are not persisted by this app, buying is public, selling drafts require login, and the model can be changed with `GEMINI_MODEL`.

- [ ] **Step 3: Run privacy and integration-boundary tests**

Run: `cd Marketplace-backend && node --test test/assistantPrivacy.test.js`

Run: `cd Marketplace-frontend && node --test test/assistantIntegrationBoundary.test.js`

Expected: PASS.

- [ ] **Step 4: Run complete automated verification**

Run: `cd Marketplace-backend && npm test`

Run: `cd Marketplace-frontend && npm test`

Run: `cd Marketplace-frontend && npm run lint`

Run: `cd Marketplace-frontend && npm run build`

Expected: all commands exit successfully with no new warnings attributable to assistant code.

- [ ] **Step 5: Perform focused manual acceptance checks**

Start both applications with valid environment values and verify these exact journeys:

1. Anonymous user asks for PS5, sees count/range/condition summary, supplies budget and condition, then sees no more than five real linked listings.
2. User asks for a password and receives the standard English refusal; backend logs contain no message text or user lookup.
3. User asks a non-marketplace question and receives the scope refusal.
4. Anonymous user starts selling and is sent through login without losing in-memory chat state during SPA navigation.
5. Authenticated user supplies all selling facts, reviews a draft, reaches a prefilled `/sell` form, uploads an image, and remains responsible for the final submit.
6. Reloading the page clears chat and draft; MongoDB contains no assistant conversation collection.
7. Simulated Gemini outage shows a controlled English retry message and no invented listing.
8. Desktop launcher/panel and mobile full-screen panel are keyboard accessible and do not disturb existing page layout.

- [ ] **Step 6: Review the diff for the frontend constraint**

Run: `git diff --name-only HEAD~9..HEAD -- Marketplace-frontend/src`

Expected existing frontend paths: only `Marketplace-frontend/src/main.jsx` and `Marketplace-frontend/src/pages/CreateListing.jsx`; every other listed frontend path is newly added under `src/assistant/`.

- [ ] **Step 7: Commit configuration and verification assets**

```bash
git add Marketplace-backend/.env.example Marketplace-backend/test/assistantPrivacy.test.js Marketplace-frontend/test/assistantIntegrationBoundary.test.js docs/assistant-setup.md
git commit -m "docs: add assistant setup and privacy checks"
```

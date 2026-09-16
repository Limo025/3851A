export const OUT_OF_SCOPE_MESSAGE = "I can only help you find items or prepare a marketplace listing. I can't access passwords or account information.";

const SENSITIVE_PATTERNS = [
  /\bpasswords?\b/i,
  /\b(firebase\s*)?uids?\b/i,
  /\buser\s*(data|records?|emails?)\b/i,
  /\b(account|login)\s*(data|details?|credentials?)\b/i,
  /\b(firebase\s*)?(?:id\s*)?tokens?\b/i,
  /\bauthorization\s*headers?\b/i,
  /\bauthorization\s*[:=]?\s*bearer\s+\S+/i,
  /\b(?:session|auth(?:entication)?)\s*(data|details?|metadata|headers?|tokens?|credentials?)\b/i,
  /\b(?:bearer|refresh)\s*tokens?\b/i,
  /\b(?:mongo(?:db)?|database|db)\s*(?:uri|connection\s*string|credentials?|passwords?|users?)\b/i,
  /\bmongodb(?:\+srv)?:\/\//i,
  /\bsellers?\s*(?:data|records?|names?|identity|emails?|phones?|addresses?|ids?|uids?|contacts?|details?)\b/i,
];

export class SensitiveRequestError extends Error {
  constructor() {
    super(OUT_OF_SCOPE_MESSAGE);
    this.name = 'SensitiveRequestError';
  }
}

export function assertMarketplaceSafe(message) {
  if (SENSITIVE_PATTERNS.some((pattern) => pattern.test(message))) {
    throw new SensitiveRequestError();
  }
}

export function assertConversationSafe({ message, history = [] } = {}) {
  assertMarketplaceSafe(message);
  for (const entry of history) {
    if (entry?.role === 'user') assertMarketplaceSafe(entry.content);
  }
}

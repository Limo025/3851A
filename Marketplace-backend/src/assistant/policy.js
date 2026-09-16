export const OUT_OF_SCOPE_MESSAGE = "I can only help you find items or prepare a marketplace listing. I can't access passwords or account information.";

const SENSITIVE_PATTERNS = [
  /\bpasswords?\b/i,
  /\b(firebase\s*)?uids?\b/i,
  /\buser\s*(data|records?|emails?)\b/i,
  /\b(account|login)\s*(data|details?|credentials?)\b/i,
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

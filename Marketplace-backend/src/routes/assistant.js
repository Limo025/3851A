import express from 'express';
import { AssistantInputError, normalizeAssistantRequest } from '../assistant/contracts.js';
import { SensitiveRequestError } from '../assistant/policy.js';
import { runAssistantTurn } from '../assistant/workflow.js';
import { createOptionalAuth } from '../middleware/optionalAuth.js';
import { createAssistantRateLimiter } from '../middleware/assistantRateLimit.js';
import { createAssistantListingSearch } from '../services/assistantListingSearch.js';
import { createGeminiAssistant } from '../services/geminiAssistant.js';

const PRIVATE_RESPONSE_KEY = /(seller|uid|e-?mail|authorization|token)/i;

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
      const result = await workflow({
        request,
        user: req.user ? { authenticated: true } : null,
        model,
        listings,
      });

      if (result.authenticationRequired) {
        return res.status(401).json({
          error: result.message,
          code: 'AUTHENTICATION_REQUIRED',
        });
      }

      return res.json(removePrivateFields(result));
    } catch (error) {
      return sendAssistantError(res, error);
    }
  });

  return router;
}

function sendAssistantError(res, error) {
  if (error instanceof AssistantInputError || error instanceof SensitiveRequestError) {
    return res.status(400).json({ error: error.message });
  }
  if (error?.code === 'PROVIDER_TIMEOUT') {
    return res.status(504).json({ error: 'The assistant model timed out. Please try again.' });
  }
  if (error?.code === 'GEMINI_QUOTA' || error?.code === 'GEMINI_CONFIGURATION') {
    return res.status(503).json({
      error: 'The assistant is temporarily unavailable. Please try again shortly.',
    });
  }
  if (error?.code === 'GEMINI_RESPONSE') {
    return res.status(502).json({ error: 'The assistant model returned an invalid response. Please try again.' });
  }
  return res.status(500).json({
    error: 'The assistant could not complete your request. Please try again.',
  });
}

function removePrivateFields(value) {
  if (Array.isArray(value)) return value.map(removePrivateFields);
  if (value === null || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !PRIVATE_RESPONSE_KEY.test(key))
      .map(([key, entry]) => [key, removePrivateFields(entry)]),
  );
}

export default createAssistantRouter();

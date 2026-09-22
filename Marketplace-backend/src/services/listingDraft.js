import { validateListingFields } from '../validation/listings.js';

export class AssistantDraftError extends Error {
  constructor(errors) {
    super(errors.join('; '));
    this.name = 'AssistantDraftError';
    this.errors = errors;
  }
}

export function validateAssistantDraft({ facts, copy }) {
  const candidate = {
    title: copy.title,
    description: copy.description,
    price: facts.price,
    category: facts.category,
    condition: facts.condition,
  };
  const { value, errors } = validateListingFields(candidate);
  if (errors.length) throw new AssistantDraftError(errors);
  return value;
}

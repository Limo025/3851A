const pendingDrafts = new Map();
const MAX_PENDING_DRAFTS = 20;

function createOpaqueId() {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `draft-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function storeListingDraft(draft) {
  const id = createOpaqueId();
  pendingDrafts.set(id, draft);
  while (pendingDrafts.size > MAX_PENDING_DRAFTS) {
    pendingDrafts.delete(pendingDrafts.keys().next().value);
  }
  return id;
}

export function consumeListingDraft(id) {
  if (typeof id !== 'string' || !id) return undefined;
  const draft = pendingDrafts.get(id);
  pendingDrafts.delete(id);
  return draft;
}

export function clearListingDrafts() {
  pendingDrafts.clear();
}

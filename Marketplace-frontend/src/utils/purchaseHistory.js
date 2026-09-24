import { apiFetch } from '../api/client.js';

export async function loadBuyerPurchaseHistory(request = apiFetch) {
  const conversations = await request('/api/chat?role=buyer', { auth: true });
  return Array.isArray(conversations)
    ? conversations.map((conversation) => conversation.listing).filter(Boolean)
    : [];
}

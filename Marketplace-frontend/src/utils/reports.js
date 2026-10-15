import { apiFetch } from '../api/client.js';

export const USER_REPORT_REASONS = Object.freeze(['Scam', 'Harassment', 'Spam', 'Inappropriate behaviour', 'Other']);
export const LISTING_REPORT_REASONS = Object.freeze(['Scam', 'Prohibited item', 'Misleading information', 'AI-generated image', 'Spam', 'Other']);

function reportBody(reason, description, reasons) {
  const value = typeof description === 'string' ? description.trim() : '';
  if (!reasons.includes(reason)) throw new Error('Select a valid report reason.');
  if (value.length < 10 || value.length > 1000) throw new Error('Description must be 10–1000 characters.');
  return { reason, description: value };
}

export async function submitUserReport({ conversationId, reason, description, request = apiFetch }) {
  return request('/api/reports/users', { method: 'POST', auth: true, body: { conversationId, ...reportBody(reason, description, USER_REPORT_REASONS) } });
}

export async function submitListingReport({ listingId, reason, description, request = apiFetch }) {
  return request(`/api/reports/listings/${encodeURIComponent(listingId)}`, { method: 'POST', auth: true, body: reportBody(reason, description, LISTING_REPORT_REASONS) });
}

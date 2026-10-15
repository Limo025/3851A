import { apiFetch } from '../api/client.js';

export async function loadTransactionHistory(role, page = 1, request = apiFetch) {
  if (!['buyer', 'seller'].includes(role)) throw new Error('Role must be buyer or seller.');
  if (!Number.isInteger(page) || page < 1) throw new Error('Page must be a positive integer.');
  const result = await request(`/api/chat/transaction-history?role=${role}&page=${page}`, { auth: true });
  return Array.isArray(result?.transactions)
    ? result
    : { transactions: [], page, pages: 1, total: 0 };
}

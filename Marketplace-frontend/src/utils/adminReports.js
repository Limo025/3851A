import { apiFetch } from '../api/client.js';

export function loadAdminReports({ status = 'pending', page = 1, request = apiFetch } = {}) {
  return request(`/api/admin/reports?status=${encodeURIComponent(status)}&page=${page}`, { auth: true });
}

export function reviewAdminReport({ id, status, request = apiFetch }) {
  return request(`/api/admin/reports/${encodeURIComponent(id)}`, { method: 'PATCH', auth: true, body: { status } });
}

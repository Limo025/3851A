import { apiFetch } from '../api/client.js';

export function createAssistantApi({ apiClient = apiFetch } = {}) {
  return (payload) => apiClient('/api/assistant/chat', {
    method: 'POST',
    auth: true,
    body: payload,
  });
}

export const sendAssistantMessage = createAssistantApi();

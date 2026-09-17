import assert from 'node:assert/strict';
import test from 'node:test';
import { createAssistantApi } from '../src/assistant/assistantApi.js';

test('assistant API posts JSON and requests optional session authentication', async () => {
  const calls = [];
  const send = createAssistantApi({
    apiClient: async (path, options) => {
      calls.push({ path, options });
      return { message: 'Hello', state: {} };
    },
  });

  const response = await send({ message: 'hello', history: [], state: {} });

  assert.deepEqual(response, { message: 'Hello', state: {} });
  assert.deepEqual(calls, [{
    path: '/api/assistant/chat',
    options: { method: 'POST', auth: true, body: { message: 'hello', history: [], state: {} } },
  }]);
});

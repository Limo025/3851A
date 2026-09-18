import assert from 'node:assert/strict';
import test from 'node:test';
import { assistantReducer, buildAssistantPayload, initialChatState } from '../src/assistant/assistantState.js';

test('starts with a closed, empty assistant conversation', () => {
  assert.deepEqual(initialChatState(), {
    open: false,
    messages: [],
    workflow: { mode: null, stage: 'start', criteria: {}, draft: {} },
    loading: false,
    error: '',
  });
});

test('opens, submits, receives, fails, clears errors, and closes a conversation in memory', () => {
  let state = initialChatState();
  state = assistantReducer(state, { type: 'open' });
  state = assistantReducer(state, { type: 'assistant-submitted', payload: { message: 'Need a bike' } });
  assert.deepEqual(state.messages, [{ role: 'user', content: 'Need a bike' }]);
  assert.equal(state.loading, true);

  state = assistantReducer(state, {
    type: 'assistant-received',
    payload: {
      message: 'What is your budget?',
      state: { mode: 'buy', stage: 'awaiting_budget', criteria: {}, draft: {} },
    },
  });
  assert.deepEqual(state.messages.at(-1), { role: 'assistant', content: 'What is your budget?' });
  assert.equal(state.loading, false);
  assert.equal(state.workflow.stage, 'awaiting_budget');

  state = assistantReducer(state, { type: 'assistant-failed', payload: { error: 'Service unavailable' } });
  assert.equal(state.error, 'Service unavailable');
  assert.equal(state.loading, false);
  state = assistantReducer(state, { type: 'clear-error' });
  state = assistantReducer({ ...state, loading: true }, { type: 'close' });
  state = assistantReducer(state, { type: 'close' });
  assert.equal(state.error, '');
  assert.equal(state.open, false);
  assert.equal(state.loading, true);
});

test('keeps chat state in plain memory and bounds outbound history to ten messages', () => {
  let state = initialChatState();
  for (let index = 0; index < 12; index += 1) {
    state = assistantReducer(state, {
      type: 'assistant-received',
      payload: { message: `reply ${index}`, state: { mode: 'buy', stage: 'awaiting_budget', criteria: {}, draft: {} } },
    });
  }
  const payload = buildAssistantPayload(state, 'under 500');
  assert.equal(payload.history.length, 10);
  assert.deepEqual(payload.history[0], { role: 'assistant', content: 'reply 2' });
  assert.equal(payload.message, 'under 500');
  assert.equal(JSON.stringify(payload).includes('localStorage'), false);
});

test('authentication required unlocks the assistant without clearing its in-memory conversation', () => {
  const workflow = {
    mode: 'sell',
    stage: 'authentication_required',
    criteria: {},
    draft: { itemName: 'Desk', price: 120 },
  };
  const submitted = {
    open: true,
    messages: [
      { role: 'assistant', content: 'Tell me about the item.' },
      { role: 'user', content: 'It is a desk.' },
    ],
    workflow,
    loading: true,
    error: '',
  };

  const state = assistantReducer(submitted, {
    type: 'authentication-required',
    payload: { error: 'Please log in to prepare a listing draft.' },
  });

  assert.equal(state.open, true);
  assert.equal(state.loading, false);
  assert.equal(state.error, 'Please log in to prepare a listing draft.');
  assert.equal(state.messages, submitted.messages);
  assert.equal(state.workflow, workflow);
});

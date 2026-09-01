import assert from 'node:assert/strict';
import test from 'node:test';
import { PasswordResetError, requestPasswordReset } from '../src/auth/passwordReset.js';

test('password reset trims a valid email before sending it to Firebase', async () => {
  const auth = { name: 'firebase-auth' };
  const calls = [];

  const result = await requestPasswordReset('  student@example.com  ', {
    auth,
    sendEmail: async (...args) => { calls.push(args); },
  });

  assert.equal(result, 'sent');
  assert.deepEqual(calls, [[auth, 'student@example.com']]);
});

test('password reset rejects an invalid email before contacting Firebase', async () => {
  let calls = 0;

  await assert.rejects(
    requestPasswordReset('not-an-email', {
      auth: {},
      sendEmail: async () => { calls += 1; },
    }),
    (error) => error instanceof PasswordResetError && error.kind === 'validation',
  );
  assert.equal(calls, 0);
});

test('password reset does not reveal when Firebase cannot find the account', async () => {
  const result = await requestPasswordReset('missing@example.com', {
    auth: {},
    sendEmail: async () => { throw { code: 'auth/user-not-found' }; },
  });

  assert.equal(result, 'sent');
});

test('password reset exposes provider failures as a safe request error', async () => {
  await assert.rejects(
    requestPasswordReset('student@example.com', {
      auth: {},
      sendEmail: async () => { throw new Error('network details'); },
    }),
    (error) => error instanceof PasswordResetError
      && error.kind === 'request'
      && !error.message.includes('network details'),
  );
});

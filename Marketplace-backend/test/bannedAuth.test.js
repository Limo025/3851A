import test from 'node:test';
import assert from 'node:assert/strict';
import { createVerifyToken } from '../src/middleware/auth.js';

test('an already-issued token cannot bypass a database ban', async () => {
  const statuses = [];
  let nextCalls = 0;
  const authenticate = createVerifyToken({
    verify: async () => ({ uid: 'buyer' }),
    UserModel: { findOne: async () => ({ _id: 'user-1', isBanned: true }) },
  });
  const res = { status(code) { statuses.push(code); return this; }, json(body) { return body; } };
  const result = await authenticate({ headers: { authorization: 'Bearer old-token' } }, res, () => { nextCalls += 1; });
  assert.equal(result.code, 'ACCOUNT_BANNED');
  assert.deepEqual(statuses, [403]);
  assert.equal(nextCalls, 0);
});

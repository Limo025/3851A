import test from 'node:test';
import assert from 'node:assert/strict';

import { getPasswordInputType } from '../src/auth/loginForm.js';

test('password stays masked until the user chooses to reveal it', () => {
  assert.equal(getPasswordInputType(false), 'password');
  assert.equal(getPasswordInputType(true), 'text');
});

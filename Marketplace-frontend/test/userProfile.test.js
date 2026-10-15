import assert from 'node:assert/strict';
import test from 'node:test';
import { getSellerProfileRequest } from '../src/utils/userProfile.js';

test('seller profile requests the public user endpoint for the selected page', () => {
  assert.equal(
    getSellerProfileRequest('seller-123', 3),
    '/api/users/seller-123?page=3',
  );
});

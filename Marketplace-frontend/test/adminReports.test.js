import assert from 'node:assert/strict';
import test from 'node:test';
import { loadAdminReports, reviewAdminReport } from '../src/utils/adminReports.js';

test('admin report helpers build list and review requests', async () => {
  const calls = [];
  const request = async (...args) => { calls.push(args); return {}; };
  await loadAdminReports({ status: 'pending', page: 2, request });
  await reviewAdminReport({ id: 'r1', status: 'resolved', request });
  assert.equal(calls[0][0], '/api/admin/reports?status=pending&page=2');
  assert.deepEqual(calls[1], ['/api/admin/reports/r1', { method: 'PATCH', auth: true, body: { status: 'resolved' } }]);
});

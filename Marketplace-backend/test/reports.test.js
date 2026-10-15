import assert from 'node:assert/strict';
import test from 'node:test';
import { once } from 'node:events';
import express from 'express';
import Report from '../src/models/Report.js';
import { LISTING_REPORT_REASONS, REPORT_DESCRIPTION_LIMITS, USER_REPORT_REASONS } from '../src/constants/reports.js';
import { createReportsRouter } from '../src/routes/reports.js';

const reporterId = '507f1f77bcf86cd799439011';
const targetId = '507f191e810c19729de860ea';
const conversationId = '507f1f77bcf86cd799439012';
const listingId = '507f1f77bcf86cd799439013';

async function withReports(router, run) {
  const server = express().use(express.json()).use(router).listen(0, '127.0.0.1');
  await once(server, 'listening');
  try { await run(`http://127.0.0.1:${server.address().port}`); }
  finally { await new Promise((resolve) => server.close(resolve)); }
}

test('report schema limits pending duplicates separately for users and listings', () => {
  const indexes = Report.schema.indexes();
  assert.ok(indexes.some(([fields, options]) => fields.reporter === 1 && fields.targetUser === 1 && options.unique && options.partialFilterExpression.status === 'pending'));
  assert.ok(indexes.some(([fields, options]) => fields.reporter === 1 && fields.targetListing === 1 && options.unique && options.partialFilterExpression.status === 'pending'));
});

test('report reasons and description boundaries are target-specific', () => {
  assert.ok(USER_REPORT_REASONS.includes('Harassment'));
  assert.equal(USER_REPORT_REASONS.includes('AI-generated image'), false);
  assert.ok(LISTING_REPORT_REASONS.includes('AI-generated image'));
  assert.deepEqual(REPORT_DESCRIPTION_LIMITS, { min: 10, max: 1000 });
});

test('user reports derive the other participant and map pending duplicates to conflict', async () => {
  const writes = [];
  let duplicate = false;
  const router = createReportsRouter({
    authenticate(req, res, next) { req.user = { uid: 'buyer' }; req.currentUser = { _id: reporterId }; next(); },
    ConversationModel: { findOne: async () => ({ _id: conversationId, buyer: 'buyer', seller: 'seller' }) },
    UserModel: { findOne: async ({ uid }) => ({ _id: targetId, uid, username: 'Seller' }) },
    ReportModel: { create: async (value) => { if (duplicate) throw Object.assign(new Error('duplicate'), { code: 11000 }); writes.push(value); return value; } },
  });
  await withReports(router, async (base) => {
    const send = () => fetch(`${base}/users`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ conversationId, targetUser: 'forged', reason: 'Spam', description: 'Repeated unwanted messages.' }) });
    assert.equal((await send()).status, 201);
    assert.equal(writes[0].targetUser, targetId);
    duplicate = true;
    assert.equal((await send()).status, 409);
    assert.equal((await fetch(`${base}/users`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ conversationId, reason: 'AI-generated image', description: 'This reason belongs elsewhere.' }) })).status, 400);
  });
});

test('listing reports reject owners and accept the AI-generated image reason', async () => {
  let owner = true;
  const writes = [];
  const router = createReportsRouter({
    authenticate(req, res, next) { req.user = { uid: 'buyer' }; req.currentUser = { _id: reporterId }; next(); },
    ListingModel: { findById: async () => ({ _id: listingId, seller: owner ? reporterId : targetId, title: 'Desk' }) },
    ReportModel: { create: async (value) => { writes.push(value); return value; } },
  });
  await withReports(router, async (base) => {
    const send = () => fetch(`${base}/listings/${listingId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason: 'AI-generated image', description: 'The product image appears generated.' }) });
    assert.equal((await send()).status, 400);
    owner = false;
    assert.equal((await send()).status, 201);
    assert.equal(writes[0].reason, 'AI-generated image');
  });
});

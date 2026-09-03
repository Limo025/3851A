import test from 'node:test';
import assert from 'node:assert/strict';

import { connectDB } from '../src/config/mongodb.js';

test('connectDB always selects the marketplace database', async () => {
  let connection;

  await connectDB({
    uri: 'mongodb://localhost/test',
    connect: async (uri, options) => {
      connection = { uri, options };
    },
    log: () => {},
  });

  assert.deepEqual(connection, {
    uri: 'mongodb://localhost/test',
    options: { dbName: 'marketplace' },
  });
});

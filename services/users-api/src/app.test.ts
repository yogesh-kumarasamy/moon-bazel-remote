import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { after, before, test } from 'node:test';
import { createApiClient } from '@mbr/api-client';
import { createLogger } from '@mbr/logger';
import { createUsersServer, seedUsers } from './app.js';

const server = createUsersServer(createLogger('users-api-test', () => {}));
let baseUrl = '';

before(async () => {
  await new Promise<void>((resolve) => server.listen(0, resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(() => new Promise<void>((resolve) => server.close(() => resolve())));

test('lists users through the shared api client', async () => {
  const client = createApiClient({ usersBaseUrl: baseUrl, ordersBaseUrl: 'unused' });
  assert.deepEqual(await client.listUsers(), seedUsers);
  assert.deepEqual(await client.getUser('u-2'), seedUsers[1]);
});

test('returns 404 for unknown users', async () => {
  const response = await fetch(`${baseUrl}/users/nope`);
  assert.equal(response.status, 404);
});

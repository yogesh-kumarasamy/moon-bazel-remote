import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { after, before, test } from 'node:test';
import { createLogger } from '@mbr/logger';
import { createOrdersServer, revenueByUser, seedOrders } from './app.js';

const server = createOrdersServer(createLogger('orders-api-test', () => {}));
let baseUrl = '';

before(async () => {
  await new Promise<void>((resolve) => server.listen(0, resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(() => new Promise<void>((resolve) => server.close(() => resolve())));

test('revenueByUser sums order totals per user', () => {
  assert.deepEqual(revenueByUser(seedOrders), { 'u-1': 3495, 'u-2': 4900 });
});

test('serves the revenue report', async () => {
  const response = await fetch(`${baseUrl}/reports/revenue-by-user`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { 'u-1': 3495, 'u-2': 4900 });
});

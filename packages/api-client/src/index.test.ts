import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createApiClient, describeOrder, type Order } from './index.js';

const order: Order = {
  id: 'o-1',
  userId: 'u-1',
  items: [
    { sku: 'moon-mug', priceCents: 1250, quantity: 2 },
    { sku: 'sticker', priceCents: 199, quantity: 1 },
  ],
};

test('describeOrder totals line items', () => {
  assert.equal(describeOrder(order), 'o-1: 2 item(s), $26.99');
});

test('client calls the configured base urls', async () => {
  const calls: string[] = [];
  const client = createApiClient({
    usersBaseUrl: 'http://users',
    ordersBaseUrl: 'http://orders',
    fetch: async (url) => {
      calls.push(url);
      return Response.json([]);
    },
  });

  await client.listUsers();
  await client.getUser('u 1');
  await client.listOrders();

  assert.deepEqual(calls, ['http://users/users', 'http://users/users/u%201', 'http://orders/orders']);
});

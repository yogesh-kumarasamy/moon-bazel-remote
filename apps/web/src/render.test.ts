import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderDashboard } from './render.ts';

test('renders one section per user with their orders', () => {
  const html = renderDashboard(
    [
      { id: 'u-1', name: 'Ada <Admin>', email: 'ada@example.com' },
      { id: 'u-2', name: 'Grace', email: 'grace@example.com' },
    ],
    [{ id: 'o-1', userId: 'u-1', items: [{ sku: 'mug', priceCents: 1000, quantity: 1 }] }],
  );

  assert.match(html, /<h2>Ada &#60;Admin&#62; <small>1 order<\/small><\/h2><ul><li>o-1: 1 item\(s\), \$10\.00<\/li><\/ul>/);
  assert.match(html, /<h2>Grace <small>0 orders<\/small><\/h2><p>No orders yet\.<\/p>/);
});

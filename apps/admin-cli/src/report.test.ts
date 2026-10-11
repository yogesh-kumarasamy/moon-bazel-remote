import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatReport } from './report.js';

test('formats per-user totals and a grand total', () => {
  const report = formatReport(
    [
      { id: 'u-1', name: 'Ada', email: 'ada@example.com' },
      { id: 'u-2', name: 'Grace', email: 'grace@example.com' },
    ],
    [
      { id: 'o-1', userId: 'u-1', items: [{ sku: 'mug', priceCents: 1250, quantity: 2 }] },
      { id: 'o-2', userId: 'u-2', items: [{ sku: 'hoodie', priceCents: 4900, quantity: 1 }] },
    ],
  );

  const lines = report.split('\n');
  assert.equal(lines.length, 4);
  assert.match(lines[0]!, /^Ada\s+1 orders\s+\$25\.00$/);
  assert.match(lines[3]!, /^Total\s+2 orders\s+\$74\.00$/);
});

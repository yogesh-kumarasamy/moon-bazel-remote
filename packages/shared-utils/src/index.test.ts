import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatCurrency, groupBy, slugify, sum, truncate } from './index.js';

test('truncate', () => {
  assert.equal(truncate('moonrepo', 20), 'moonrepo');
  assert.equal(truncate('moonrepo', 5), 'moon…');
});

test('slugify', () => {
  assert.equal(slugify('  Hello, Moon World! '), 'hello-moon-world');
});

test('formatCurrency', () => {
  assert.equal(formatCurrency(123456), '$1,234.56');
});

test('sum', () => {
  assert.equal(sum([1, 2, 3]), 6);
  assert.equal(sum([]), 0);
});

test('groupBy', () => {
  const groups = groupBy([1, 2, 3, 4], (n) => (n % 2 === 0 ? 'even' : 'odd'));
  assert.deepEqual(groups, { odd: [1, 3], even: [2, 4] });
});

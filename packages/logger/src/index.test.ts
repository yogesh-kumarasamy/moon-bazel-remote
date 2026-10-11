import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createLogger, type LogRecord } from './index.js';

test('writes structured records with a slugified logger name', () => {
  const records: LogRecord[] = [];
  const logger = createLogger('Orders API', (record) => records.push(record));

  logger.info('started', { port: 3000 });

  assert.equal(records.length, 1);
  assert.equal(records[0]?.logger, 'orders-api');
  assert.equal(records[0]?.level, 'info');
  assert.equal(records[0]?.port, 3000);
});

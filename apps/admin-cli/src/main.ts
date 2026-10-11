#!/usr/bin/env node
import { createApiClient } from '@mbr/api-client';
import { createLogger } from '@mbr/logger';
import { formatReport } from './report.js';

const logger = createLogger('admin-cli');
const client = createApiClient({
  usersBaseUrl: process.env.USERS_API_URL ?? 'http://localhost:3001',
  ordersBaseUrl: process.env.ORDERS_API_URL ?? 'http://localhost:3002',
});

try {
  const [users, orders] = await Promise.all([client.listUsers(), client.listOrders()]);
  console.log(formatReport(users, orders));
} catch (error) {
  logger.error('could not reach the APIs; start them with `moon run users-api:start orders-api:start`', {
    error: String(error),
  });
  process.exitCode = 1;
}

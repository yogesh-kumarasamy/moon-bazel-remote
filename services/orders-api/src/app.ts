import { createServer, type Server } from 'node:http';
import { orderTotalCents, type Order } from '@mbr/api-client';
import type { Logger } from '@mbr/logger';
import { groupBy, sum } from '@mbr/shared-utils';

export const seedOrders: Order[] = [
  { id: 'o-1', userId: 'u-1', items: [{ sku: 'moon-mug', priceCents: 1250, quantity: 2 }] },
  { id: 'o-2', userId: 'u-1', items: [{ sku: 'sticker', priceCents: 199, quantity: 5 }] },
  { id: 'o-3', userId: 'u-2', items: [{ sku: 'hoodie', priceCents: 4900, quantity: 1 }] },
];

export function revenueByUser(orders: readonly Order[]): Record<string, number> {
  const byUser = groupBy(orders, (order) => order.userId);
  return Object.fromEntries(
    Object.entries(byUser).map(([userId, userOrders]) => [userId, sum(userOrders.map(orderTotalCents))]),
  );
}

export function createOrdersServer(logger: Logger, orders: readonly Order[] = seedOrders): Server {
  return createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const send = (status: number, body: unknown) => {
      res.writeHead(status, { 'content-type': 'application/json', 'access-control-allow-origin': '*' });
      res.end(JSON.stringify(body));
    };

    logger.info('request', { method: req.method, path: url.pathname });

    if (req.method !== 'GET') return send(405, { error: 'method not allowed' });
    if (url.pathname === '/healthz') return send(200, { ok: true });
    if (url.pathname === '/orders') return send(200, orders);
    if (url.pathname === '/reports/revenue-by-user') return send(200, revenueByUser(orders));

    return send(404, { error: 'not found' });
  });
}

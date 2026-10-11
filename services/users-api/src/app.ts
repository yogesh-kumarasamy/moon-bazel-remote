import { createServer, type Server } from 'node:http';
import type { User } from '@mbr/api-client';
import type { Logger } from '@mbr/logger';

export const seedUsers: User[] = [
  { id: 'u-1', name: 'Ada Lovelace', email: 'ada@example.com' },
  { id: 'u-2', name: 'Grace Hopper', email: 'grace@example.com' },
];

export function createUsersServer(logger: Logger, users: readonly User[] = seedUsers): Server {
  return createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const send = (status: number, body: unknown) => {
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(body));
    };

    logger.info('request', { method: req.method, path: url.pathname });

    if (req.method !== 'GET') return send(405, { error: 'method not allowed' });
    if (url.pathname === '/healthz') return send(200, { ok: true });
    if (url.pathname === '/users') {
      const query = url.searchParams.get('q')?.trim().toLowerCase();
      return send(200, query ? users.filter((user) => user.name.toLowerCase().includes(query)) : users);
    }

    const match = /^\/users\/([^/]+)$/.exec(url.pathname);
    if (match) {
      const user = users.find((candidate) => candidate.id === decodeURIComponent(match[1]!));
      return user ? send(200, user) : send(404, { error: 'user not found' });
    }

    return send(404, { error: 'not found' });
  });
}

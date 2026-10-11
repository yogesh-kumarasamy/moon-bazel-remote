import { createApiClient } from '@mbr/api-client';
import { renderDashboard } from './render.ts';

const client = createApiClient({
  usersBaseUrl: 'http://localhost:3001',
  ordersBaseUrl: 'http://localhost:3002',
});

const root = document.querySelector<HTMLElement>('#app');

if (root) {
  Promise.all([client.listUsers(), client.listOrders()])
    .then(([users, orders]) => {
      root.innerHTML = renderDashboard(users, orders);
    })
    .catch((error: unknown) => {
      root.textContent = `Failed to load: ${String(error)}`;
    });
}

import { describeOrder, type Order, type User } from '@mbr/api-client';
import { groupBy } from '@mbr/shared-utils';

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

export function renderDashboard(users: readonly User[], orders: readonly Order[]): string {
  const ordersByUser = groupBy(orders, (order) => order.userId);

  const sections = users.map((user) => {
    const lines = (ordersByUser[user.id] ?? []).map((order) => `<li>${escapeHtml(describeOrder(order))}</li>`);
    const body = lines.length > 0 ? `<ul>${lines.join('')}</ul>` : '<p>No orders yet.</p>';
    return `<section><h2>${escapeHtml(user.name)}</h2>${body}</section>`;
  });

  return sections.join('');
}

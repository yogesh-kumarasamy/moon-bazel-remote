import { orderTotalCents, type Order, type User } from '@mbr/api-client';
import { formatCurrency, groupBy, sum } from '@mbr/shared-utils';

export function formatReport(users: readonly User[], orders: readonly Order[]): string {
  const ordersByUser = groupBy(orders, (order) => order.userId);
  const rows = users.map((user) => {
    const userOrders = ordersByUser[user.id] ?? [];
    const total = formatCurrency(sum(userOrders.map(orderTotalCents)));
    return `${user.name.padEnd(20)} ${String(userOrders.length).padStart(3)} orders ${total.padStart(12)}`;
  });
  const grandTotal = formatCurrency(sum(orders.map(orderTotalCents)));
  return [...rows, '-'.repeat(48), `${'Total'.padEnd(20)} ${String(orders.length).padStart(3)} orders ${grandTotal.padStart(12)}`].join('\n');
}

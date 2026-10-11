import { formatCurrency, sum } from '@mbr/shared-utils';

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Order {
  id: string;
  userId: string;
  items: { sku: string; priceCents: number; quantity: number }[];
}

export function orderTotalCents(order: Order): number {
  return sum(order.items.map((item) => item.priceCents * item.quantity));
}

export function describeOrder(order: Order): string {
  return `${order.id}: ${order.items.length} item(s), ${formatCurrency(orderTotalCents(order))}`;
}

export type Fetch = (input: string, init?: RequestInit) => Promise<Response>;

export interface ApiClientOptions {
  usersBaseUrl: string;
  ordersBaseUrl: string;
  fetch?: Fetch;
}

export function createApiClient({ usersBaseUrl, ordersBaseUrl, fetch: doFetch = fetch }: ApiClientOptions) {
  async function getJson<T>(url: string): Promise<T> {
    const response = await doFetch(url);
    if (!response.ok) {
      throw new Error(`GET ${url} failed with ${response.status}`);
    }
    return (await response.json()) as T;
  }

  return {
    listUsers: () => getJson<User[]>(`${usersBaseUrl}/users`),
    getUser: (id: string) => getJson<User>(`${usersBaseUrl}/users/${encodeURIComponent(id)}`),
    listOrders: () => getJson<Order[]>(`${ordersBaseUrl}/orders`),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;

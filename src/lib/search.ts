import { Order } from './types';
import { getLineSearchText, getLineMenuNo } from './orderLineUtils';
import { addressLabel } from './address';

// Helper function for robust string normalization
const norm = (s?: string | null): string =>
  (s || "").toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").trim();

// Helper function to get only digits from a string
const digits = (s?: string | null): string => (s || "").replace(/\D+/g, "");

export function matchOrder(order: Order, query: string): boolean {
  if (!query) return false;

  const nq = norm(query);
  const dq = digits(query);

  // Search against phone number
  if (dq && digits(order.phone).includes(dq)) {
    return true;
  }

  // Search against specific patterns like "dør 4", "etage 3", etc.
  if (
    (order.addressDoor && norm(`dør ${order.addressDoor}`).includes(nq)) ||
    (order.addressFloor && norm(`etage ${order.addressFloor}`).includes(nq)) ||
    (order.addressStaircase && norm(`opg ${order.addressStaircase}`).includes(nq))
  ) {
    return true;
  }

  // General search against multiple fields
  const searchableFields = [
    order.customerName,
    order.id,
    order.id.slice(0, 8),
    addressLabel(order), // Full formatted address
    order.address, // Legacy address field
    order.addressStreet,
    order.addressNumber,
    order.addressPostcode,
    order.addressCity,
    ...order.lines.map(line => getLineSearchText(line)),
    ...order.lines.map(line => getLineMenuNo(line)).filter(Boolean)
  ];

  return searchableFields.some(field => norm(field).includes(nq));
}

export function filterOrders(orders: Order[], query: string): Order[] {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return [];
  return orders.filter(order => matchOrder(order, trimmedQuery));
}

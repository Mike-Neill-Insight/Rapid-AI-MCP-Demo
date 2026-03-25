/**
 * Mock Order Data
 *
 * Orders link customers to products. This module provides both the static
 * mock data and functions to query/create orders. The create function
 * demonstrates how an MCP Tool can perform write operations (not just reads).
 *
 * Note: The orders array is mutable — create-order and approve-refund tools
 * modify it at runtime. This is intentional for the demo: it shows stateful
 * behavior within a session. In production you'd use a database.
 *
 * Includes one order with 'refund-pending' status to demonstrate the
 * approve-refund governance tool.
 */

import type { Order, OrderStatus, OrderItem } from '../types.js';

// ──────────────────────────────────────────────────────────────────────────────
// Mock Data — 10 orders across various statuses
// ──────────────────────────────────────────────────────────────────────────────

const orders: Order[] = [
  {
    id: 'ord-001',
    customerId: 'cust-001',
    status: 'delivered',
    items: [
      { productId: 'prod-003', productName: 'Cloud Hosting - Enterprise', quantity: 1, unitPrice: 499.99 },
      { productId: 'prod-005', productName: 'Security Audit - Advanced', quantity: 1, unitPrice: 1499.99 },
    ],
    total: 1999.98,
    createdAt: '2024-11-01T10:00:00Z',
    updatedAt: '2024-11-15T14:00:00Z',
  },
  {
    id: 'ord-002',
    customerId: 'cust-001',
    status: 'shipped',
    items: [
      { productId: 'prod-006', productName: 'Managed Backup - 1TB', quantity: 2, unitPrice: 49.99 },
    ],
    total: 99.98,
    createdAt: '2025-01-10T09:30:00Z',
    updatedAt: '2025-01-12T11:00:00Z',
  },
  {
    id: 'ord-003',
    customerId: 'cust-002',
    status: 'confirmed',
    items: [
      { productId: 'prod-002', productName: 'Cloud Hosting - Pro', quantity: 1, unitPrice: 99.99 },
    ],
    total: 99.99,
    createdAt: '2025-02-01T08:00:00Z',
    updatedAt: '2025-02-01T08:00:00Z',
  },
  {
    id: 'ord-004',
    customerId: 'cust-002',
    status: 'refund-pending',
    items: [
      { productId: 'prod-004', productName: 'Security Audit - Standard', quantity: 1, unitPrice: 299.99 },
    ],
    total: 299.99,
    createdAt: '2025-01-05T13:00:00Z',
    updatedAt: '2025-02-20T10:00:00Z',
  },
  {
    id: 'ord-005',
    customerId: 'cust-003',
    status: 'pending',
    items: [
      { productId: 'prod-001', productName: 'Cloud Hosting - Basic', quantity: 1, unitPrice: 29.99 },
      { productId: 'prod-006', productName: 'Managed Backup - 1TB', quantity: 1, unitPrice: 49.99 },
    ],
    total: 79.98,
    createdAt: '2025-03-01T15:00:00Z',
    updatedAt: '2025-03-01T15:00:00Z',
  },
  {
    id: 'ord-006',
    customerId: 'cust-003',
    status: 'cancelled',
    items: [
      { productId: 'prod-005', productName: 'Security Audit - Advanced', quantity: 1, unitPrice: 1499.99 },
    ],
    total: 1499.99,
    createdAt: '2024-12-15T09:00:00Z',
    updatedAt: '2024-12-16T10:00:00Z',
  },
  {
    id: 'ord-007',
    customerId: 'cust-004',
    status: 'delivered',
    items: [
      { productId: 'prod-002', productName: 'Cloud Hosting - Pro', quantity: 1, unitPrice: 99.99 },
      { productId: 'prod-007', productName: 'Managed Backup - 10TB', quantity: 1, unitPrice: 199.99 },
    ],
    total: 299.98,
    createdAt: '2024-10-20T11:00:00Z',
    updatedAt: '2024-11-05T16:00:00Z',
  },
  {
    id: 'ord-008',
    customerId: 'cust-004',
    status: 'shipped',
    items: [
      { productId: 'prod-004', productName: 'Security Audit - Standard', quantity: 2, unitPrice: 299.99 },
    ],
    total: 599.98,
    createdAt: '2025-02-15T14:00:00Z',
    updatedAt: '2025-02-18T09:00:00Z',
  },
  {
    id: 'ord-009',
    customerId: 'cust-005',
    status: 'confirmed',
    items: [
      { productId: 'prod-003', productName: 'Cloud Hosting - Enterprise', quantity: 1, unitPrice: 499.99 },
      { productId: 'prod-005', productName: 'Security Audit - Advanced', quantity: 1, unitPrice: 1499.99 },
      { productId: 'prod-007', productName: 'Managed Backup - 10TB', quantity: 1, unitPrice: 199.99 },
    ],
    total: 2199.97,
    createdAt: '2025-03-10T08:00:00Z',
    updatedAt: '2025-03-10T08:00:00Z',
  },
  {
    id: 'ord-010',
    customerId: 'cust-005',
    status: 'pending',
    items: [
      { productId: 'prod-008', productName: 'Disaster Recovery Plan', quantity: 1, unitPrice: 2999.99 },
    ],
    total: 2999.99,
    createdAt: '2025-03-20T10:00:00Z',
    updatedAt: '2025-03-20T10:00:00Z',
  },
];

// Track next order ID for the create-order tool
let nextOrderNum = 11;

// ──────────────────────────────────────────────────────────────────────────────
// Lookup / Search Functions
// ──────────────────────────────────────────────────────────────────────────────

export function getOrderById(id: string): Order | undefined {
  return orders.find((o) => o.id === id);
}

export function getOrdersByCustomerId(customerId: string): Order[] {
  return orders.filter((o) => o.customerId === customerId);
}

export function searchOrders(filters: {
  status?: OrderStatus;
  customerId?: string;
  minTotal?: number;
  maxTotal?: number;
}): Order[] {
  return orders.filter((o) => {
    if (filters.status && o.status !== filters.status) return false;
    if (filters.customerId && o.customerId !== filters.customerId) return false;
    if (filters.minTotal !== undefined && o.total < filters.minTotal) return false;
    if (filters.maxTotal !== undefined && o.total > filters.maxTotal) return false;
    return true;
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// Write Functions (used by MCP Tools)
// ──────────────────────────────────────────────────────────────────────────────

export function createOrder(customerId: string, items: OrderItem[]): Order {
  const total = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const now = new Date().toISOString();
  const order: Order = {
    id: `ord-${String(nextOrderNum++).padStart(3, '0')}`,
    customerId,
    status: 'pending',
    items,
    total: Math.round(total * 100) / 100,
    createdAt: now,
    updatedAt: now,
  };
  orders.push(order);
  return order;
}

export function approveRefund(orderId: string): Order | { error: string } {
  const order = orders.find((o) => o.id === orderId);
  if (!order) {
    return { error: `Order ${orderId} not found` };
  }
  if (order.status !== 'refund-pending') {
    return { error: `Order ${orderId} is not pending refund (current status: ${order.status})` };
  }
  order.status = 'refunded';
  order.updatedAt = new Date().toISOString();
  return order;
}

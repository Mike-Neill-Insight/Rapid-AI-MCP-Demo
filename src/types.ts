/**
 * Domain Types for the MCP Demo
 *
 * These types define the shape of our mock business data: customers, orders,
 * and products. They're used by both the data layer and the MCP tool/resource
 * handlers to ensure type safety throughout.
 *
 * In a real system, these would come from your database schema or API contracts.
 * For this demo, they serve as the "contract" between mock data and MCP handlers.
 */

// ──────────────────────────────────────────────────────────────────────────────
// Customer
// ──────────────────────────────────────────────────────────────────────────────

export interface Customer {
  id: string;
  name: string;
  email: string;
  company: string;
  tier: 'standard' | 'premium' | 'enterprise';
  createdAt: string; // ISO 8601
}

// ──────────────────────────────────────────────────────────────────────────────
// Order
// ──────────────────────────────────────────────────────────────────────────────

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refund-pending'
  | 'refunded';

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

export interface Order {
  id: string;
  customerId: string;
  status: OrderStatus;
  items: OrderItem[];
  total: number;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

// ──────────────────────────────────────────────────────────────────────────────
// Product
// ──────────────────────────────────────────────────────────────────────────────

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  inStock: boolean;
}

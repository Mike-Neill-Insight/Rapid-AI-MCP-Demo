/**
 * Mock Product Data
 *
 * Products are the items customers can order. This data backs both the
 * product-catalog MCP Resource (read-only browsing) and the create-order
 * MCP Tool (validating product IDs when creating orders).
 *
 * 8 products across 3 categories give enough variety for a realistic demo
 * without being overwhelming.
 */

import type { Product } from '../types.js';

// ──────────────────────────────────────────────────────────────────────────────
// Mock Data — 8 products across 3 categories
// ──────────────────────────────────────────────────────────────────────────────

const products: Product[] = [
  {
    id: 'prod-001',
    name: 'Cloud Hosting - Basic',
    description: 'Shared cloud hosting, 10GB storage, 100GB bandwidth',
    price: 29.99,
    category: 'Hosting',
    inStock: true,
  },
  {
    id: 'prod-002',
    name: 'Cloud Hosting - Pro',
    description: 'Dedicated cloud hosting, 100GB storage, 1TB bandwidth, SSL included',
    price: 99.99,
    category: 'Hosting',
    inStock: true,
  },
  {
    id: 'prod-003',
    name: 'Cloud Hosting - Enterprise',
    description: 'Enterprise cloud hosting, unlimited storage, dedicated support',
    price: 499.99,
    category: 'Hosting',
    inStock: true,
  },
  {
    id: 'prod-004',
    name: 'Security Audit - Standard',
    description: 'Automated vulnerability scan + report for up to 5 endpoints',
    price: 299.99,
    category: 'Security',
    inStock: true,
  },
  {
    id: 'prod-005',
    name: 'Security Audit - Advanced',
    description: 'Manual penetration testing + automated scan, up to 20 endpoints',
    price: 1499.99,
    category: 'Security',
    inStock: true,
  },
  {
    id: 'prod-006',
    name: 'Managed Backup - 1TB',
    description: 'Daily automated backups with 30-day retention, 1TB storage',
    price: 49.99,
    category: 'Data Services',
    inStock: true,
  },
  {
    id: 'prod-007',
    name: 'Managed Backup - 10TB',
    description: 'Daily automated backups with 90-day retention, 10TB storage',
    price: 199.99,
    category: 'Data Services',
    inStock: true,
  },
  {
    id: 'prod-008',
    name: 'Disaster Recovery Plan',
    description: 'Full DR planning, implementation, and quarterly testing',
    price: 2999.99,
    category: 'Data Services',
    inStock: false, // Out of stock — useful for testing edge cases
  },
];

// ──────────────────────────────────────────────────────────────────────────────
// Lookup Functions
// ──────────────────────────────────────────────────────────────────────────────

export function getProductById(id: string): Product | undefined {
  return products.find((p) => p.id === id);
}

export function getAllProducts(): Product[] {
  return [...products];
}

export function getProductsByCategory(category: string): Product[] {
  return products.filter(
    (p) => p.category.toLowerCase() === category.toLowerCase()
  );
}

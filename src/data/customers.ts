/**
 * Mock Customer Data
 *
 * This module provides hardcoded customer records and lookup functions.
 * In a real MCP server, these would query a database or API. For this demo,
 * in-memory data keeps things simple and presentation-safe (no external deps).
 *
 * The lookup functions mirror what you'd have in a real data access layer:
 * - getCustomerById: exact match by ID
 * - getCustomerByEmail: exact match by email
 * - getAllCustomers: list all (for resource enumeration)
 */

import type { Customer } from '../types.js';

// ──────────────────────────────────────────────────────────────────────────────
// Mock Data — 5 customers across different tiers
// ──────────────────────────────────────────────────────────────────────────────

const customers: Customer[] = [
  {
    id: 'cust-001',
    name: 'Alice Johnson',
    email: 'alice@northwindtraders.com',
    company: 'Northwind Traders',
    tier: 'enterprise',
    createdAt: '2024-01-15T09:00:00Z',
  },
  {
    id: 'cust-002',
    name: 'Bob Martinez',
    email: 'bob@contoso.com',
    company: 'Contoso Ltd',
    tier: 'premium',
    createdAt: '2024-03-22T14:30:00Z',
  },
  {
    id: 'cust-003',
    name: 'Carol Chen',
    email: 'carol@fabrikam.com',
    company: 'Fabrikam Inc',
    tier: 'standard',
    createdAt: '2024-06-10T11:15:00Z',
  },
  {
    id: 'cust-004',
    name: 'David Kim',
    email: 'david@adventureworks.com',
    company: 'Adventure Works',
    tier: 'premium',
    createdAt: '2024-08-05T16:45:00Z',
  },
  {
    id: 'cust-005',
    name: 'Eva Patel',
    email: 'eva@wideworldimporters.com',
    company: 'Wide World Importers',
    tier: 'enterprise',
    createdAt: '2024-09-20T08:00:00Z',
  },
];

// ──────────────────────────────────────────────────────────────────────────────
// Lookup Functions
// ──────────────────────────────────────────────────────────────────────────────

export function getCustomerById(id: string): Customer | undefined {
  return customers.find((c) => c.id === id);
}

export function getCustomerByEmail(email: string): Customer | undefined {
  return customers.find((c) => c.email.toLowerCase() === email.toLowerCase());
}

export function getAllCustomers(): Customer[] {
  return [...customers];
}

# Mock Data Layer

This directory contains hardcoded business data for the demo: customers, orders, and products.

In a real MCP server, this would be replaced by database queries or API calls. The mock data keeps the demo self-contained and presentation-safe (no external dependencies to fail during a live demo).

## Files

| File | Contains | Records |
|------|----------|---------|
| `customers.ts` | Customer records + lookup functions | 5 customers |
| `orders.ts` | Order records + search/create/refund functions | 10 orders |
| `products.ts` | Product catalog + lookup functions | 8 products |

## Design notes

- The `orders` array is **mutable** — `create-order` and `approve-refund` modify it at runtime
- This means each server restart resets the data (intentional for demos)
- Types are defined in `src/types.ts`

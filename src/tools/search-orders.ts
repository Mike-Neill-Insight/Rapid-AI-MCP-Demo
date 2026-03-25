/**
 * MCP Tool: search-orders
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ What the AI sees:                                                   │
 * │ A tool that searches orders with filters. The AI invokes this when  │
 * │ a user asks "show me all pending orders" or "what orders does       │
 * │ customer cust-002 have?"                                            │
 * │                                                                     │
 * │ Multiple optional filters demonstrate that MCP tools can have       │
 * │ complex, flexible input schemas — the AI picks which filters to     │
 * │ fill based on the user's natural language request.                  │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * Input schema design notes:
 *
 * - The `status` field uses `z.enum(...)` rather than `z.string()`. This
 *   is intentional: the enum values appear in the tool's JSON Schema,
 *   which tells the AI exactly which statuses are valid. Without an enum,
 *   the AI might guess "processing" or "completed" — values that don't
 *   exist in our system. Enums eliminate that guesswork.
 *
 * - The `minTotal` / `maxTotal` fields use a `z.preprocess → z.coerce`
 *   pattern because they are optional numbers. A naive `z.coerce.number()
 *   .optional()` has a subtle bug: it coerces `null`, `""`, and `undefined`
 *   to `0` instead of leaving them absent. The preprocess step intercepts
 *   those "empty" values and maps them to `undefined` before coercion runs.
 *
 * Tool annotations:
 * - readOnlyHint: true — search is a read-only operation
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { searchOrders } from '../data/orders.js';

const inputSchema = z.object({
  status: z
    .enum(['pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'refund-pending', 'refunded'])
    .optional()
    .describe('Filter by order status'),
  customerId: z
    .string()
    .optional()
    .describe('Filter by customer ID (e.g., "cust-001")'),
  minTotal: z
    .preprocess(
      (val) => (val === null || val === undefined || val === '' ? undefined : val),
      z.coerce.number().optional()
    )
    .describe('Minimum order total (inclusive)'),
  maxTotal: z
    .preprocess(
      (val) => (val === null || val === undefined || val === '' ? undefined : val),
      z.coerce.number().optional()
    )
    .describe('Maximum order total (inclusive)'),
});

const outputSchema = z.object({
  orders: z.array(
    z.object({
      id: z.string(),
      customerId: z.string(),
      status: z.string(),
      total: z.number(),
      itemCount: z.number(),
      createdAt: z.string(),
    })
  ),
  totalCount: z.number(),
});

export function registerSearchOrdersTool(server: McpServer) {
  server.registerTool(
    'search-orders',
    {
      title: 'Search Orders',
      description:
        'Search and filter orders by status, customer, or total amount. Returns matching orders with summary info.',
      inputSchema,
      outputSchema,
      annotations: {
        readOnlyHint: true,
      },
    },
    async (params) => {
      const results = searchOrders(params);

      const orders = results.map((o) => ({
        id: o.id,
        customerId: o.customerId,
        status: o.status,
        total: o.total,
        itemCount: o.items.length,
        createdAt: o.createdAt,
      }));

      const structured = { orders, totalCount: orders.length };

      // Build a human-readable filter description for the text response
      const filters = Object.entries(params)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => `${k}=${v}`)
        .join(', ');

      return {
        content: [
          {
            type: 'text' as const,
            text: `Found ${orders.length} order(s)${filters ? ` matching: ${filters}` : ''}:\n\n${orders.map((o) => `  ${o.id} | ${o.customerId} | ${o.status} | $${o.total.toFixed(2)} | ${o.itemCount} item(s)`).join('\n') || '  (none)'}`,
          },
        ],
        structuredContent: structured,
      };
    }
  );
}

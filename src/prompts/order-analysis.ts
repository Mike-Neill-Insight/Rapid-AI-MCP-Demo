/**
 * MCP Prompt: order-analysis
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ This prompt demonstrates OPTIONAL arguments and PROMPT REUSE.       │
 * │                                                                     │
 * │ The status filter is optional — if omitted, the prompt analyzes     │
 * │ ALL orders. This means the same prompt template serves multiple     │
 * │ use cases:                                                          │
 * │   - "Analyze all orders"        → no args                          │
 * │   - "Analyze pending orders"    → status: "pending"                │
 * │   - "Analyze refund requests"   → status: "refund-pending"         │
 * │                                                                     │
 * │ This is a key benefit of MCP prompts over hardcoded instructions:   │
 * │ a single prompt template can produce different analyses depending   │
 * │ on the context, reducing duplication while ensuring consistent      │
 * │ output format across all variations.                                │
 * │                                                                     │
 * │ ⚠️  Copilot Studio does NOT currently support MCP prompts — only    │
 * │ tools and resources. This prompt is testable via MCP Inspector,     │
 * │ VS Code, and other MCP clients that support prompts/get.            │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * Compare with customer-summary.ts, which has a REQUIRED argument
 * (customerId). Together these two prompts illustrate the full spectrum:
 * prompts can require specific inputs, accept optional inputs, or take
 * no inputs at all. The argsSchema shape determines the behavior.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { searchOrders } from '../data/orders.js';
import { getCustomerById } from '../data/customers.js';

export function registerOrderAnalysisPrompt(server: McpServer) {
  server.registerPrompt(
    'order-analysis',
    {
      title: 'Order Analysis',
      description:
        'Analyze orders, optionally filtered by status. Provides data and asks for insights on trends, issues, and recommendations.',
      // argsSchema takes a raw Zod shape (not z.object() — the SDK wraps it)
      argsSchema: {
        status: z
          .enum([
            'pending',
            'confirmed',
            'shipped',
            'delivered',
            'cancelled',
            'refund-pending',
            'refunded',
          ])
          .optional()
          .describe('Optional: filter orders by status. Omit to analyze all orders.'),
      },
    },
    ({ status }) => {
      const orders = searchOrders(status ? { status } : {});

      const orderDetails = orders.map((o) => {
        const customer = getCustomerById(o.customerId);
        return `- ${o.id} | ${customer?.name ?? o.customerId} | ${o.status} | $${o.total.toFixed(2)} | ${o.items.length} item(s) | ${o.createdAt}`;
      });

      const totalRevenue = orders
        .filter((o) => !['cancelled', 'refunded'].includes(o.status))
        .reduce((sum, o) => sum + o.total, 0);

      const statusCounts = orders.reduce(
        (acc, o) => {
          acc[o.status] = (acc[o.status] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      const filterLabel = status ? `Status: ${status}` : 'All orders';

      return {
        messages: [
          {
            role: 'user' as const,
            content: {
              type: 'text' as const,
              text: `Please analyze the following orders (${filterLabel}):

**Orders (${orders.length} total):**
${orderDetails.join('\n') || '(no orders match the filter)'}

**Summary Statistics:**
- Total revenue (excl. cancelled/refunded): $${totalRevenue.toFixed(2)}
- Status breakdown: ${Object.entries(statusCounts).map(([s, c]) => `${s}: ${c}`).join(', ')}

Please provide:
1. Key trends or patterns in the order data
2. Any orders that need attention (stale pending, refund requests, etc.)
3. Revenue insights
4. Operational recommendations`,
            },
          },
        ],
      };
    }
  );
}

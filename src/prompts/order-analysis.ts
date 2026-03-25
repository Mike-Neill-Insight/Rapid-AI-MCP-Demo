/**
 * MCP Prompt: order-analysis
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ This prompt demonstrates optional arguments. The status filter is   │
 * │ optional — if omitted, the prompt analyzes ALL orders.              │
 * │                                                                     │
 * │ This shows that MCP prompts can be flexible: the same prompt        │
 * │ template works for "analyze all orders" and "analyze only pending   │
 * │ orders" depending on what the user asks for.                        │
 * └─────────────────────────────────────────────────────────────────────┘
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

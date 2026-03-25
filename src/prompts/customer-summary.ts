/**
 * MCP Prompt: customer-summary
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ Prompts vs. Tools vs. Resources:                                    │
 * │                                                                     │
 * │ PROMPTS are reusable prompt TEMPLATES. They don't execute logic —   │
 * │ they return structured messages that guide the AI's response.       │
 * │                                                                     │
 * │ Think of them as "stored procedures for conversations":             │
 * │ - Resources provide DATA (what the AI knows)                        │
 * │ - Tools provide ACTIONS (what the AI can do)                        │
 * │ - Prompts provide INSTRUCTIONS (how the AI should respond)          │
 * │                                                                     │
 * │ This prompt takes a customerId, fetches their data, and returns     │
 * │ a structured message asking the AI to summarize the customer's      │
 * │ account. The AI gets both the data AND the instructions in one go.  │
 * │                                                                     │
 * │ ⚠️  Copilot Studio does NOT currently support MCP prompts — only    │
 * │ tools and resources. This prompt is testable via MCP Inspector,     │
 * │ VS Code, and other MCP clients that support prompts/get.            │
 * └─────────────────────────────────────────────────────────────────────┘
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getCustomerById } from '../data/customers.js';
import { getOrdersByCustomerId } from '../data/orders.js';

export function registerCustomerSummaryPrompt(server: McpServer) {
  server.registerPrompt(
    'customer-summary',
    {
      title: 'Customer Account Summary',
      description:
        'Generate a comprehensive summary of a customer account, including order history, spending patterns, and account health.',
      // argsSchema takes a raw Zod shape (not z.object() — the SDK wraps it)
      argsSchema: {
        customerId: z
          .string()
          .describe('The customer ID to summarize (e.g., "cust-001")'),
      },
    },
    ({ customerId }) => {
      const customer = getCustomerById(customerId);

      if (!customer) {
        return {
          messages: [
            {
              role: 'user' as const,
              content: {
                type: 'text' as const,
                text: `Customer "${customerId}" not found. Please check the customer ID and try again.`,
              },
            },
          ],
        };
      }

      const orders = getOrdersByCustomerId(customer.id);
      const totalSpent = orders
        .filter((o) => !['cancelled', 'refunded'].includes(o.status))
        .reduce((sum, o) => sum + o.total, 0);

      // The prompt returns messages that guide the AI's response.
      // The "user" message contains the data + instructions.
      return {
        messages: [
          {
            role: 'user' as const,
            content: {
              type: 'text' as const,
              text: `Please provide a comprehensive account summary for this customer:

**Customer Details:**
- Name: ${customer.name}
- Company: ${customer.company}
- Email: ${customer.email}
- Tier: ${customer.tier}
- Customer since: ${customer.createdAt}

**Order History (${orders.length} orders):**
${orders.map((o) => `- ${o.id}: ${o.status} | $${o.total.toFixed(2)} | ${o.items.length} item(s) | ${o.createdAt}`).join('\n')}

**Spending Summary:**
- Total spent (excl. cancelled/refunded): $${totalSpent.toFixed(2)}
- Total orders: ${orders.length}
- Active orders: ${orders.filter((o) => ['pending', 'confirmed', 'shipped'].includes(o.status)).length}

Please analyze:
1. Overall account health and engagement level
2. Spending patterns and trends
3. Any concerning orders (refunds, cancellations)
4. Recommendations for account management`,
            },
          },
        ],
      };
    }
  );
}

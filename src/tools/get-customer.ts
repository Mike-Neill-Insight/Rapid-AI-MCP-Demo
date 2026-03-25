/**
 * MCP Tool: get-customer
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ What the AI sees:                                                   │
 * │ A tool named "get-customer" that can look up a customer by their    │
 * │ ID or email address. The AI will invoke this when a user asks       │
 * │ something like "look up customer cust-001" or "find Alice's info".  │
 * │                                                                     │
 * │ The input schema tells the AI what parameters it can provide.       │
 * │ The output schema tells the AI what structured data to expect back. │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * Tool annotations:
 * - readOnlyHint: true — this tool only reads data, never modifies it.
 *   This helps the AI (and Copilot Studio) understand that calling this
 *   tool is safe and has no side effects.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getCustomerById, getCustomerByEmail } from '../data/customers.js';
import { getOrdersByCustomerId } from '../data/orders.js';

// The Zod schema defines what parameters the AI must provide.
// .describe() strings are sent to the AI as parameter descriptions.
const inputSchema = z.object({
  customerId: z
    .string()
    .optional()
    .describe('Customer ID (e.g., "cust-001"). Provide either this or email.'),
  email: z
    .string()
    .email()
    .optional()
    .describe('Customer email address. Provide either this or customerId.'),
});

// Output schema enables structuredContent — the AI gets typed data, not just text.
const outputSchema = z.object({
  customer: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    company: z.string(),
    tier: z.string(),
    createdAt: z.string(),
  }),
  recentOrders: z.array(
    z.object({
      id: z.string(),
      status: z.string(),
      total: z.number(),
      createdAt: z.string(),
    })
  ),
});

export function registerGetCustomerTool(server: McpServer) {
  server.registerTool(
    'get-customer',
    {
      title: 'Get Customer',
      description:
        'Look up a customer by ID or email address. Returns customer details and their recent orders.',
      inputSchema,
      outputSchema,
      annotations: {
        readOnlyHint: true,
      },
    },
    async ({ customerId, email }) => {
      // Look up by ID first, then fall back to email
      const customer = customerId
        ? getCustomerById(customerId)
        : email
          ? getCustomerByEmail(email)
          : undefined;

      if (!customer) {
        // Return isError: true for business errors (not found).
        // This is the MCP-correct way to report "not found" — NOT an HTTP 404.
        // The AI sees this as "the tool ran but the result was an error."
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: `Customer not found. Searched by: ${customerId ? `ID "${customerId}"` : `email "${email}"`}`,
            },
          ],
        };
      }

      const recentOrders = getOrdersByCustomerId(customer.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 5)
        .map((o) => ({
          id: o.id,
          status: o.status,
          total: o.total,
          createdAt: o.createdAt,
        }));

      const result = { customer, recentOrders };

      return {
        // content: human-readable text for display
        content: [
          {
            type: 'text' as const,
            text: `Customer: ${customer.name} (${customer.company})\nTier: ${customer.tier}\nEmail: ${customer.email}\n\nRecent Orders (${recentOrders.length}):\n${recentOrders.map((o) => `  - ${o.id}: ${o.status} — $${o.total.toFixed(2)}`).join('\n')}`,
          },
        ],
        // structuredContent: typed data the AI can process programmatically
        structuredContent: result,
      };
    }
  );
}

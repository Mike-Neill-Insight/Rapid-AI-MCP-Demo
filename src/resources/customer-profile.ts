/**
 * MCP Resource: customer-profile
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ This is a DYNAMIC resource using ResourceTemplate.                  │
 * │                                                                     │
 * │ Unlike the product-catalog (fixed URI), this resource has a         │
 * │ parameterized URI: customer://{customerId}/profile                  │
 * │                                                                     │
 * │ ResourceTemplate tells MCP clients:                                 │
 * │ 1. The URI pattern (with {customerId} placeholder)                  │
 * │ 2. How to list available instances (the list callback)              │
 * │                                                                     │
 * │ HOW COPILOT STUDIO FINDS THIS RESOURCE:                             │
 * │ Copilot Studio does NOT call resources/list. Instead, the           │
 * │ get-customer tool returns a resource_link pointing to               │
 * │ customer://{id}/profile in its response. The AI then calls          │
 * │ resources/read to get the full profile with complete order history. │
 * │ See: src/tools/get-customer.ts                                      │
 * │                                                                     │
 * │ MCP Inspector and VS Code DO call the list callback, so this        │
 * │ resource is also directly browsable in those clients.               │
 * │                                                                     │
 * │ If a client requests a nonexistent customer, we throw a             │
 * │ McpError with code -32002 (resource not found), which is the       │
 * │ MCP-correct way to report missing resources.                        │
 * └─────────────────────────────────────────────────────────────────────┘
 */

import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { getAllCustomers, getCustomerById } from '../data/customers.js';
import { getOrdersByCustomerId } from '../data/orders.js';

export function registerCustomerProfileResource(server: McpServer) {
  server.registerResource(
    // Name: unique identifier
    'customer-profile',

    // ResourceTemplate: defines the URI pattern and how to enumerate instances.
    // The {customerId} segment becomes a parameter passed to the handler.
    new ResourceTemplate('customer://{customerId}/profile', {
      // list callback: tells clients which customer profiles exist.
      // Copilot Studio calls this to discover available resources.
      list: async () => ({
        resources: getAllCustomers().map((c) => ({
          uri: `customer://${c.id}/profile`,
          name: `${c.name} (${c.company})`,
        })),
      }),
    }),

    // Metadata
    {
      title: 'Customer Profile',
      description:
        'Detailed customer profile including account info and full order history. Use the customer ID in the URI.',
      mimeType: 'application/json',
    },

    // Handler: receives the parsed URI and extracted template parameters.
    // The second argument { customerId } is automatically extracted from the URI.
    async (uri, { customerId }) => {
      const customer = getCustomerById(customerId as string);

      if (!customer) {
        // MCP-correct error for missing resources: throw McpError with -32002.
        // This is different from tool errors (which use isError: true in the result).
        throw new McpError(
          ErrorCode.InvalidParams,
          `Customer "${customerId}" not found`
        );
      }

      const orders = getOrdersByCustomerId(customer.id);
      const profile = {
        ...customer,
        orderHistory: orders.map((o) => ({
          id: o.id,
          status: o.status,
          total: o.total,
          itemCount: o.items.length,
          createdAt: o.createdAt,
        })),
        totalSpent: orders
          .filter((o) => !['cancelled', 'refunded'].includes(o.status))
          .reduce((sum, o) => sum + o.total, 0),
        orderCount: orders.length,
      };

      return {
        contents: [
          {
            uri: uri.href,
            text: JSON.stringify(profile, null, 2),
          },
        ],
      };
    }
  );
}

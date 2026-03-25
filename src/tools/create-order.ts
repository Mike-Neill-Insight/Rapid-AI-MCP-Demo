/**
 * MCP Tool: create-order
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ What the AI sees:                                                   │
 * │ A tool that creates a new order. Unlike get-customer and            │
 * │ search-orders, this tool WRITES data. The AI invokes this when a    │
 * │ user says "place an order for customer cust-001 for Cloud Hosting". │
 * │                                                                     │
 * │ This demonstrates that MCP tools aren't limited to read-only        │
 * │ operations — they can perform actions with side effects.            │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * Tool annotations:
 * - readOnlyHint: false — this tool creates data
 * - destructiveHint: false — creating an order doesn't destroy existing data
 * - idempotentHint: false — calling twice creates two orders
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getCustomerById } from '../data/customers.js';
import { getProductById } from '../data/products.js';
import { createOrder } from '../data/orders.js';

const inputSchema = z.object({
  customerId: z
    .string()
    .describe('The customer placing the order (e.g., "cust-001")'),
  items: z
    .array(
      z.object({
        productId: z.string().describe('Product ID (e.g., "prod-001")'),
        quantity: z.number().int().min(1).describe('Quantity to order'),
      })
    )
    .min(1)
    .describe('List of products and quantities to order'),
});

const outputSchema = z.object({
  orderId: z.string(),
  customerId: z.string(),
  status: z.string(),
  items: z.array(
    z.object({
      productId: z.string(),
      productName: z.string(),
      quantity: z.number(),
      unitPrice: z.number(),
    })
  ),
  total: z.number(),
  createdAt: z.string(),
});

export function registerCreateOrderTool(server: McpServer) {
  server.registerTool(
    'create-order',
    {
      title: 'Create Order',
      description:
        'Create a new order for a customer. Validates that the customer and products exist before creating.',
      inputSchema,
      outputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
      },
    },
    async ({ customerId, items }) => {
      // Validate customer exists
      const customer = getCustomerById(customerId);
      if (!customer) {
        return {
          isError: true,
          content: [
            { type: 'text' as const, text: `Customer "${customerId}" not found. Cannot create order.` },
          ],
        };
      }

      // Validate all products exist and build order items
      const orderItems = [];
      for (const item of items) {
        const product = getProductById(item.productId);
        if (!product) {
          return {
            isError: true,
            content: [
              { type: 'text' as const, text: `Product "${item.productId}" not found. Cannot create order.` },
            ],
          };
        }
        if (!product.inStock) {
          return {
            isError: true,
            content: [
              { type: 'text' as const, text: `Product "${product.name}" is currently out of stock.` },
            ],
          };
        }
        orderItems.push({
          productId: product.id,
          productName: product.name,
          quantity: item.quantity,
          unitPrice: product.price,
        });
      }

      const order = createOrder(customerId, orderItems);

      return {
        content: [
          {
            type: 'text' as const,
            text: `✅ Order created successfully!\n\nOrder ID: ${order.id}\nCustomer: ${customer.name} (${customer.company})\nItems:\n${order.items.map((i) => `  - ${i.productName} × ${i.quantity} @ $${i.unitPrice.toFixed(2)}`).join('\n')}\n\nTotal: $${order.total.toFixed(2)}\nStatus: ${order.status}`,
          },
        ],
        structuredContent: {
          orderId: order.id,
          customerId: order.customerId,
          status: order.status,
          items: order.items,
          total: order.total,
          createdAt: order.createdAt,
        },
      };
    }
  );
}

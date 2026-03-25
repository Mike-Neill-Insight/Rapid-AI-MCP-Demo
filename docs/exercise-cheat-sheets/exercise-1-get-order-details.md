# Exercise 1: `get-order-details` Tool — Solution

> ⚠️ **Spoiler**: Try the exercise in [exercises.md](../exercises.md) first!

## `src/tools/get-order-details.ts`

```typescript
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getOrderById } from '../data/orders.js';
import { getCustomerById } from '../data/customers.js';

const inputSchema = z.object({
  orderId: z
    .string()
    .describe('The order ID to look up (e.g., "ord-001")'),
});

const outputSchema = z.object({
  order: z.object({
    id: z.string(),
    status: z.string(),
    total: z.number(),
    createdAt: z.string(),
    updatedAt: z.string(),
  }),
  customer: z.object({
    id: z.string(),
    name: z.string(),
    company: z.string(),
    tier: z.string(),
  }),
  items: z.array(
    z.object({
      productId: z.string(),
      productName: z.string(),
      quantity: z.number(),
      unitPrice: z.number(),
      lineTotal: z.number(),
    })
  ),
});

export function registerGetOrderDetailsTool(server: McpServer) {
  server.registerTool(
    'get-order-details',
    {
      title: 'Get Order Details',
      description:
        'Get detailed information about a single order, including customer info and line item breakdown.',
      inputSchema,
      outputSchema,
      annotations: {
        readOnlyHint: true,
      },
    },
    async ({ orderId }) => {
      const order = getOrderById(orderId);

      if (!order) {
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: `Order "${orderId}" not found.`,
            },
          ],
        };
      }

      const customer = getCustomerById(order.customerId);

      const items = order.items.map((i) => ({
        productId: i.productId,
        productName: i.productName,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        lineTotal: Math.round(i.unitPrice * i.quantity * 100) / 100,
      }));

      const result = {
        order: {
          id: order.id,
          status: order.status,
          total: order.total,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
        },
        customer: {
          id: customer?.id ?? order.customerId,
          name: customer?.name ?? 'Unknown',
          company: customer?.company ?? 'Unknown',
          tier: customer?.tier ?? 'unknown',
        },
        items,
      };

      return {
        content: [
          {
            type: 'text' as const,
            text: `Order ${order.id} (${order.status})\nCustomer: ${result.customer.name} (${result.customer.company})\n\nItems:\n${items.map((i) => `  - ${i.productName} × ${i.quantity} @ $${i.unitPrice.toFixed(2)} = $${i.lineTotal.toFixed(2)}`).join('\n')}\n\nTotal: $${order.total.toFixed(2)}`,
          },
        ],
        structuredContent: result,
      };
    }
  );
}
```

## Register in `src/server.ts`

Add the import:
```typescript
import { registerGetOrderDetailsTool } from './tools/get-order-details.js';
```

Add in `createMcpServer()` alongside other tools:
```typescript
registerGetOrderDetailsTool(server);
```

## 💡 What to notice

1. **`readOnlyHint: true`** — this tool only reads, which tells the AI it's safe to call without user confirmation
2. **`outputSchema` + `structuredContent`** — the AI gets typed data it can process programmatically, not just text
3. **Error pattern** — `isError: true` with a text content item, NOT an HTTP error or thrown exception
4. **Customer enrichment** — the order only stores `customerId`, but we look up the full customer name/company to give the AI richer context
5. **`lineTotal` calculation** — we compute `unitPrice × quantity` for each item so the AI doesn't have to do math

## 🧪 Test with MCP Inspector

```
Tool: get-order-details
Arguments: { "orderId": "ord-001" }
Expected: Order details with customer "Alice Johnson" and 2 line items
```

```
Tool: get-order-details
Arguments: { "orderId": "ord-999" }
Expected: isError: true, "Order not found"
```

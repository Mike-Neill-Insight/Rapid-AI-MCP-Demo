# Exercise 2: `order://{orderId}/invoice` Resource — Solution

> ⚠️ **Spoiler**: Try the exercise in [07-exercises.md](../07-exercises.md) first!

## Important: The `resource_link` Pattern

By design, Copilot Studio does **not** call `resources/list` to discover available resources. Instead, it discovers resources through **`resource_link` items returned by tools**. This means every resource needs a companion tool — or must be linked from an existing tool — to be visible to Copilot Studio.

This solution includes both pieces of the pattern:
1. The **resource** (serves invoice data via `resources/read`)
2. A **companion tool** that returns `resource_link` items pointing to invoices

Together, these form the complete resource discovery pattern. See [Microsoft's documentation on MCP tools & resources](https://microsoft.github.io/mcscatblog/posts/mcp-tools-resources/) for the design rationale behind this approach.

---

## `src/resources/order-invoice.ts`

```typescript
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { getOrderById, searchOrders } from '../data/orders.js';
import { getCustomerById } from '../data/customers.js';

export function registerOrderInvoiceResource(server: McpServer) {
  server.registerResource(
    'order-invoice',

    new ResourceTemplate('order://{orderId}/invoice', {
      list: async () => ({
        resources: searchOrders({})
          .filter((o) => !['cancelled', 'refunded'].includes(o.status))
          .map((o) => ({
            uri: `order://${o.id}/invoice`,
            name: `Invoice for ${o.id}`,
          })),
      }),
    }),

    {
      title: 'Order Invoice',
      description:
        'Formatted invoice for an order, including customer info, line items, and totals.',
      mimeType: 'text/plain',
    },

    async (uri, { orderId }) => {
      const order = getOrderById(orderId as string);

      if (!order) {
        throw new McpError(
          ErrorCode.InvalidParams,
          `Order "${orderId}" not found`
        );
      }

      const customer = getCustomerById(order.customerId);

      const lines = order.items.map((item) => {
        const lineTotal = item.unitPrice * item.quantity;
        return `  ${item.productName.padEnd(35)} ${String(item.quantity).padStart(3)} × $${item.unitPrice.toFixed(2).padStart(10)} = $${lineTotal.toFixed(2).padStart(10)}`;
      });

      const invoice = `
╔══════════════════════════════════════════════════════════════╗
║                         INVOICE                              ║
╠══════════════════════════════════════════════════════════════╣

  Order:     ${order.id}
  Date:      ${order.createdAt}
  Status:    ${order.status}

  Bill To:   ${customer?.name ?? 'Unknown Customer'}
             ${customer?.company ?? ''}
             ${customer?.email ?? ''}

╠══════════════════════════════════════════════════════════════╣
  ITEMS
╠══════════════════════════════════════════════════════════════╣

${lines.join('\n')}

╠══════════════════════════════════════════════════════════════╣
  TOTAL:  $${order.total.toFixed(2).padStart(53)}
╚══════════════════════════════════════════════════════════════╝
`.trim();

      return {
        contents: [
          {
            uri: uri.href,
            text: invoice,
          },
        ],
      };
    }
  );
}
```

## `src/tools/get-invoice.ts` (Companion tool — returns `resource_link`)

```typescript
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getOrderById } from '../data/orders.js';
import { getCustomerById } from '../data/customers.js';

const inputSchema = z.object({
  orderId: z
    .string()
    .describe('The order ID to get an invoice for (e.g., "ord-001")'),
});

export function registerGetInvoiceTool(server: McpServer) {
  server.registerTool(
    'get-invoice',
    {
      title: 'Get Invoice',
      description:
        'Get a formatted invoice for an order. Returns a link to the full invoice document.',
      inputSchema,
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
            { type: 'text' as const, text: `Order "${orderId}" not found.` },
          ],
        };
      }

      if (['cancelled', 'refunded'].includes(order.status)) {
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: `Order "${orderId}" has been ${order.status}. No invoice available.`,
            },
          ],
        };
      }

      const customer = getCustomerById(order.customerId);

      return {
        content: [
          {
            type: 'text' as const,
            text: `Invoice for order ${order.id} — ${customer?.name ?? 'Unknown'} — $${order.total.toFixed(2)}`,
          },
          // This resource_link is how Copilot Studio discovers the invoice resource.
          // The AI can follow this link to call resources/read and get the full invoice.
          {
            type: 'resource_link' as const,
            uri: `order://${order.id}/invoice`,
            name: `Invoice — ${order.id}`,
            mimeType: 'text/plain',
          },
        ],
      };
    }
  );
}
```

## Register in `src/server.ts`

Add the imports:
```typescript
import { registerOrderInvoiceResource } from './resources/order-invoice.js';
import { registerGetInvoiceTool } from './tools/get-invoice.js';
```

Add in `createMcpServer()`:
```typescript
// Resources
registerOrderInvoiceResource(server);

// Tools
registerGetInvoiceTool(server);
```

## 💡 What to notice

1. **Two files, not one** — the resource serves the data, but the tool makes it discoverable. This is the `resource_link` pattern required for Copilot Studio.

2. **`ResourceTemplate` with `list` callback** — the `list` function returns all valid invoice URIs. MCP Inspector uses this to show available resources. Copilot Studio ignores it.

3. **`McpError` vs `isError`** — Resources throw `McpError` for not-found. Tools return `{ isError: true }`. Different error conventions for different primitives.

4. **Filtering cancelled/refunded** — no invoice for cancelled orders. The resource handler could still return one (the data exists), but the tool guards against it. This is a design choice: the tool enforces business rules, the resource is the data layer.

5. **`mimeType: 'text/plain'`** — the invoice is formatted text, not JSON. Resources can return any MIME type.

## 🧪 Test with MCP Inspector

**Tool test:**
```
Tool: get-invoice
Arguments: { "orderId": "ord-001" }
Expected: Text summary + resource_link to order://ord-001/invoice
```

**Resource test (via Resources tab):**
```
Resource: order://ord-001/invoice
Expected: Formatted ASCII invoice with line items and total
```

**Error cases:**
```
Tool: get-invoice { "orderId": "ord-006" }  → isError (cancelled order)
Tool: get-invoice { "orderId": "ord-999" }  → isError (not found)
```

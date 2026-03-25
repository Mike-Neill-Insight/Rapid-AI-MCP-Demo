# Exercise 3: `escalation-report` Prompt — Solution

> ⚠️ **Spoiler**: Try the exercise in [exercises.md](../exercises.md) first!

## `src/prompts/escalation-report.ts`

```typescript
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getAllCustomers, getCustomerById } from '../data/customers.js';
import { getOrdersByCustomerId, searchOrders } from '../data/orders.js';

export function registerEscalationReportPrompt(server: McpServer) {
  server.registerPrompt(
    'escalation-report',
    {
      title: 'Escalation Report',
      description:
        'Generate a prioritized escalation report for orders needing attention (refund-pending, cancelled). Optionally filter to a specific customer.',
      // argsSchema takes a raw Zod shape — the SDK wraps it in z.object()
      argsSchema: {
        customerId: z
          .string()
          .optional()
          .describe(
            'Optional customer ID to filter to. If omitted, reports across all customers.'
          ),
      },
    },
    ({ customerId }) => {
      // Gather escalation-worthy orders
      let escalationOrders;
      let scopeDescription: string;

      if (customerId) {
        const customer = getCustomerById(customerId);
        if (!customer) {
          return {
            messages: [
              {
                role: 'user' as const,
                content: {
                  type: 'text' as const,
                  text: `Customer "${customerId}" not found. Please check the ID and try again.`,
                },
              },
            ],
          };
        }

        escalationOrders = getOrdersByCustomerId(customerId).filter((o) =>
          ['refund-pending', 'cancelled'].includes(o.status)
        );
        scopeDescription = `${customer.name} (${customer.company}, ${customer.tier} tier)`;
      } else {
        escalationOrders = searchOrders({}).filter((o) =>
          ['refund-pending', 'cancelled'].includes(o.status)
        );
        scopeDescription = 'all customers';
      }

      if (escalationOrders.length === 0) {
        return {
          messages: [
            {
              role: 'user' as const,
              content: {
                type: 'text' as const,
                text: `No orders requiring escalation found for ${scopeDescription}. All orders are in good standing.`,
              },
            },
          ],
        };
      }

      // Enrich with customer details
      const enrichedOrders = escalationOrders.map((order) => {
        const cust = getCustomerById(order.customerId);
        return {
          orderId: order.id,
          status: order.status,
          total: order.total,
          customerName: cust?.name ?? 'Unknown',
          customerCompany: cust?.company ?? 'Unknown',
          customerTier: cust?.tier ?? 'unknown',
          itemCount: order.items.length,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
          daysSinceUpdate: Math.floor(
            (Date.now() - new Date(order.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
          ),
        };
      });

      const orderDetails = enrichedOrders
        .map(
          (o) =>
            `- ${o.orderId}: ${o.status} | $${o.total.toFixed(2)} | ${o.customerName} (${o.customerCompany}, ${o.customerTier}) | ${o.itemCount} item(s) | Updated ${o.daysSinceUpdate} days ago`
        )
        .join('\n');

      return {
        messages: [
          {
            role: 'user' as const,
            content: {
              type: 'text' as const,
              text: `Please generate a prioritized escalation report for the following orders requiring attention.

**Scope**: ${scopeDescription}
**Orders requiring attention**: ${escalationOrders.length}

**Orders:**
${orderDetails}

**Prioritization criteria** (in order of importance):
1. Enterprise tier customers first (highest business impact)
2. Refund-pending orders before cancelled (active action needed)
3. Higher dollar amounts
4. Older update dates (customer has been waiting longer)

**For each order, please provide:**
- Priority level (Critical / High / Medium / Low)
- Recommended action
- Business impact assessment
- Time sensitivity

**End with** an overall summary and any patterns you notice (e.g., same customer with multiple issues, tier-specific trends).`,
            },
          },
        ],
      };
    }
  );
}
```

## Register in `src/server.ts`

Add the import:
```typescript
import { registerEscalationReportPrompt } from './prompts/escalation-report.js';
```

Add in `createMcpServer()` alongside other prompts:
```typescript
registerEscalationReportPrompt(server);
```

## 💡 What to notice

1. **`argsSchema` is a raw Zod shape** — `{ customerId: z.string().optional() }`, NOT `z.object({ ... })`. The SDK wraps it. This is a common gotcha — if you pass `z.object()`, you'll get a runtime error.

2. **Optional parameter** — `customerId` is optional. When omitted, the prompt reports across all customers. The AI decides whether to pass it based on the conversation context.

3. **Data + instructions together** — the prompt bundles the order data AND the analysis instructions into one message. The AI gets everything it needs to produce a consistent, structured report.

4. **Computed fields** — `daysSinceUpdate` is calculated at prompt-generation time so the AI doesn't have to figure out date math. Always pre-compute what you can.

5. **No side effects** — prompts are pure templates. They fetch data and format messages, but never modify state. That's the key difference from tools.

6. **Graceful empty case** — if there are no escalation-worthy orders, we return a simple "all clear" message instead of an empty report template.

## 🧪 Test with MCP Inspector

**Prompts tab:**
```
Prompt: escalation-report
Args: {}
Expected: Report covering ord-004 (refund-pending) and ord-006 (cancelled)
```

```
Prompt: escalation-report
Args: { "customerId": "cust-002" }
Expected: Report for Bob Martinez only — ord-004 (refund-pending)
```

```
Prompt: escalation-report
Args: { "customerId": "cust-001" }
Expected: "No orders requiring escalation" (Alice has no problematic orders)
```

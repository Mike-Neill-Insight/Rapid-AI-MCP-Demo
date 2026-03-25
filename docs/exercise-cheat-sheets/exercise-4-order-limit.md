# Exercise 4: Order Limit Validation — Solution

> ⚠️ **Spoiler**: Try the exercise in [exercises.md](../exercises.md) first!

## Changes to `src/tools/create-order.ts`

This exercise modifies the existing `create-order` tool. The change is small — add a validation check after building the order items but before calling `createOrder()`.

### What to add

Insert this block **after** the `for` loop that builds `orderItems` and **before** the `createOrder()` call:

```typescript
      // ── Exercise 4: Tier-based order limit ──────────────────────────────
      // Standard-tier customers have a $5,000 order limit.
      // This demonstrates business rule validation inside MCP tools.
      const orderTotal = orderItems.reduce(
        (sum, item) => sum + item.unitPrice * item.quantity,
        0
      );

      if (customer.tier === 'standard' && orderTotal > 5000) {
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: `Order total $${orderTotal.toFixed(2)} exceeds the $5,000 limit for standard-tier customers. ${customer.name}'s current tier is "${customer.tier}". To place larger orders, the customer can upgrade to premium or enterprise tier.`,
            },
          ],
        };
      }
      // ── End Exercise 4 ─────────────────────────────────────────────────
```

### Full modified function (for reference)

Here's the complete `create-order` handler with the new validation inserted:

```typescript
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

      // ── Exercise 4: Tier-based order limit ──────────────────────────────
      const orderTotal = orderItems.reduce(
        (sum, item) => sum + item.unitPrice * item.quantity,
        0
      );

      if (customer.tier === 'standard' && orderTotal > 5000) {
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: `Order total $${orderTotal.toFixed(2)} exceeds the $5,000 limit for standard-tier customers. ${customer.name}'s current tier is "${customer.tier}". To place larger orders, the customer can upgrade to premium or enterprise tier.`,
            },
          ],
        };
      }
      // ── End Exercise 4 ─────────────────────────────────────────────────

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
```

## No changes to `server.ts`

This exercise modifies an existing tool — no new registration needed.

## 💡 What to notice

1. **Surgical change** — only ~10 lines added to an existing function. No new files, no new dependencies. This is the ideal exercise pattern: small change, big learning.

2. **Business errors use `isError: true`** — NOT thrown exceptions. The MCP SDK has a clear convention: business rule violations return `isError: true` in the tool result. Protocol errors (like missing resources) use `McpError`.

3. **Helpful error message** — the error tells the AI exactly what happened AND suggests a resolution (upgrade tier). This lets the AI provide actionable advice to the user instead of a generic "order failed" message.

4. **Pre-compute the total** — we calculate `orderTotal` before calling `createOrder()` so we can reject the order without creating it. The `createOrder()` function also computes the total internally, so this is intentionally redundant for the validation gate.

5. **Only standard tier** — premium and enterprise customers have no limit. The exercise is about showing conditional business logic, not about the specific limit.

## 🧪 Test with MCP Inspector

**Should succeed** (standard tier, under limit):
```
Tool: create-order
Arguments: {
  "customerId": "cust-003",
  "items": [{ "productId": "prod-001", "quantity": 1 }]
}
Expected: ✅ Order created — $29.99 (well under $5,000)
```

**Should fail** (standard tier, over limit):
```
Tool: create-order
Arguments: {
  "customerId": "cust-003",
  "items": [{ "productId": "prod-008", "quantity": 2 }]
}
Expected: isError — $5,999.98 exceeds $5,000 limit for standard tier
```

Wait — `prod-008` (Disaster Recovery Plan) is out of stock! The out-of-stock check will fire first. Use this instead:

```
Tool: create-order
Arguments: {
  "customerId": "cust-003",
  "items": [{ "productId": "prod-005", "quantity": 4 }]
}
Expected: isError — $5,999.96 exceeds $5,000 limit for standard tier
```

**Should succeed** (enterprise tier, over limit is OK):
```
Tool: create-order
Arguments: {
  "customerId": "cust-001",
  "items": [{ "productId": "prod-005", "quantity": 4 }]
}
Expected: ✅ Order created — $5,999.96 (enterprise tier, no limit)
```

> **💡 Gotcha in the original exercise**: The exercise says to test with `prod-008` (Disaster Recovery Plan, $2,999.99 × 2 = $5,999.98), but `prod-008` has `inStock: false`. The out-of-stock validation fires before the tier check. Use `prod-005` (Security Audit - Advanced, $1,499.99 × 4 = $5,999.96) instead — it's in stock and exceeds the limit.

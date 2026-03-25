# Exercises

> **Prerequisites**: Completed the [Learning Path](../README.md#learning-path) through step 4 (Testing)
>
> **These exercises help you internalize MCP patterns by extending the demo server.**

## Exercise 1: Add a New Tool — `get-order-details`

**Goal**: Create a tool that returns detailed information about a single order.

**What you'll practice**: Tool registration, input/output schemas, error handling.

**Steps**:
1. Create `src/tools/get-order-details.ts`
2. Input: `orderId` (string, required)
3. Output: Full order object including customer name (not just ID), item details, and status history
4. Handle the error case: order not found → `isError: true`
5. Add tool annotations: this is a read-only tool
6. Register it in `src/server.ts`
7. Test with MCP Inspector

**Hint**: Look at `src/tools/get-customer.ts` for the pattern. You'll need both `getOrderById` from `data/orders.ts` and `getCustomerById` from `data/customers.ts`.

---

## Exercise 2: Add a New Resource — `order://{orderId}/invoice`

**Goal**: Create a dynamic resource template that returns a formatted invoice for an order.

**What you'll practice**: ResourceTemplate, dynamic URIs, the difference between Resources and Tools.

**Steps**:
1. Create `src/resources/order-invoice.ts`
2. Use `ResourceTemplate` with URI pattern `order://{orderId}/invoice`
3. The `list` callback should return all non-cancelled, non-refunded orders
4. The handler should return a formatted text invoice with customer info, line items, and totals
5. Handle missing orders with `McpError` (code `-32002`)
6. Register it in `src/server.ts`

**Think about**: Why is this a Resource and not a Tool? Because an invoice is *read-only context* — a document the AI references, not an action it performs.

---

## Exercise 3: Add a New Prompt — `escalation-report`

**Goal**: Create a prompt that prepares an escalation report for orders that need attention.

**What you'll practice**: Prompt templates, combining data from multiple sources, optional parameters.

**Steps**:
1. Create `src/prompts/escalation-report.ts`
2. Args: `customerId` (optional) — if provided, only that customer's orders; if omitted, all customers
3. The prompt should include: orders in `refund-pending` or `cancelled` status, customer tier info, and ask the AI to prioritize by business impact
4. Register it in `src/server.ts`

---

## Exercise 4: Handle a New Error Case

**Goal**: Make `create-order` reject orders where the total exceeds $5,000 for standard-tier customers.

**What you'll practice**: Business rule validation, error handling patterns.

**Steps**:
1. Modify `src/tools/create-order.ts`
2. After building order items, calculate the total
3. Look up the customer's tier
4. If tier is `standard` and total > $5,000, return `isError: true` with a helpful message suggesting they upgrade to premium
5. Test with MCP Inspector: try ordering a Disaster Recovery Plan ($2,999.99 × 2 = $5,999.98) for `cust-003` (standard tier)

---

## Tools vs. Resources vs. Prompts — Quick Reference

| | Tools 🔧 | Resources 📄 | Prompts 📝 |
|---|----------|-------------|-----------|
| **Purpose** | Perform actions | Provide context | Guide AI responses |
| **Analogy** | API endpoint | File/document | Stored procedure |
| **Has side effects?** | Can (create, update, delete) | Never (read-only) | Never (template only) |
| **Parameters** | Input schema (Zod) | URI (fixed or template) | Args schema (Zod shape) |
| **Returns** | Content + structured data | Content at a URI | Messages for the AI |
| **Error pattern** | `isError: true` in result | `McpError` exception | N/A (return error message) |
| **Annotations** | `readOnlyHint`, `destructiveHint`, etc. | `mimeType` | N/A |
| **Example** | "Create order for customer X" | "Show me the product catalog" | "Summarize this customer's account" |

## What to Build Next

Ideas for extending this into a real project:

1. **Database backend**: Replace in-memory data with SQLite or Cosmos DB. The data layer functions stay the same — just swap the implementation.

2. **Authentication**: Add API key or OAuth validation to the Express middleware. Update the OpenAPI spec with security schemes.

3. **Notifications**: Use MCP's notification capability to push updates when orders change status (e.g., `notifications/resources/updated`).

4. **Multi-tenant**: Add a tenant ID to the session and filter data per-tenant. This is how you'd build an MCP server for a SaaS product.

5. **Real API integration**: Replace mock data with calls to a real CRM (Dynamics 365, Salesforce) or database. The MCP tool handlers become thin wrappers around your existing APIs.

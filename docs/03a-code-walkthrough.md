# Code Walkthrough

> **Prerequisites**: [Architecture & Data Flow](02-architecture.md)
>
> **Next**: [Local Development](03-local-development.md), then [Testing](04-testing.md)

This guide walks through the source code in the order you should read it. Each section explains *what* the code does and *why* it's structured that way, with pointers to the key patterns and MCP concepts demonstrated.

## Reading Order

| # | File | What You'll Learn |
|---|------|-------------------|
| 1 | `src/server.ts` | Express setup, Streamable HTTP transport, session management |
| 2 | `src/types.ts` | Domain types shared across the project |
| 3 | `src/data/*.ts` | Mock data layer — how tools and resources get their data |
| 4 | `src/tools/get-customer.ts` | Your first tool — input/output schemas, `structuredContent`, `resource_link` |
| 5 | `src/tools/search-orders.ts` | Optional filters, Zod enums, `z.preprocess` for AI-safe numbers |
| 6 | `src/tools/create-order.ts` | Write operations, validation, annotation hints |
| 7 | `src/tools/approve-refund.ts` | Governance patterns, `destructiveHint`, state validation |
| 8 | `src/tools/list-products.ts` | The `resource_link` discovery pattern — why this tool exists |
| 9 | `src/resources/product-catalog.ts` | Static resources, custom URI schemes |
| 10 | `src/resources/customer-profile.ts` | Dynamic resources with `ResourceTemplate` |
| 11 | `src/resources/refund-policy.ts` | Markdown resources, MIME types |
| 12 | `src/prompts/customer-summary.ts` | Prompt templates, `argsSchema`, message structure |
| 13 | `src/prompts/order-analysis.ts` | Optional arguments, prompt reuse |

---

## 1. The Entry Point — `src/server.ts`

**Start here.** This file wires everything together: Express, the MCP SDK, and session management.

### Key concepts

**Streamable HTTP transport** — MCP uses three HTTP endpoints on the same path:

```
POST /mcp  → receives JSON-RPC requests (initialize, tools/call, resources/read, etc.)
GET  /mcp  → SSE streaming for real-time responses and session resumability
DELETE /mcp → explicit session cleanup
```

Copilot Studio requires Streamable HTTP — this is the only transport it supports.

**Session-per-conversation** — Each Copilot Studio conversation gets its own `McpServer` instance:

```typescript
// From server.ts — the session map
const sessions = new Map<string, Session>();

// Each session has its own server, transport, and activity timestamp
interface Session {
  transport: StreamableHTTPServerTransport;
  server: McpServer;
  lastActivity: number;
}
```

Why per-session servers? Because tool state (like orders created during a conversation) should be isolated. If two users create orders at the same time, they shouldn't see each other's data.

**The initialize handshake** — The first request to POST /mcp must be an `initialize` request (no session ID yet). The server:

1. Creates a new `McpServer` instance via `createMcpServer()`
2. Creates a new `StreamableHTTPServerTransport` with a UUID session ID
3. Connects them together
4. Stores the session in the map

Subsequent requests include the `Mcp-Session-Id` header, and the server routes them to the correct session.

**Registration pattern** — All tools, resources, and prompts are registered in `createMcpServer()`:

```typescript
function createMcpServer(): McpServer {
  const server = new McpServer({ name: 'rapid-ai-mcp-demo', version: '1.0.0' });

  // Tools — actions the AI can perform
  registerGetCustomerTool(server);
  registerSearchOrdersTool(server);
  // ... more registrations

  return server;
}
```

Each `register*` function is imported from its own file and takes the server as a parameter. This keeps each tool/resource/prompt self-contained.

### What to look for

- The `isInitializeRequest()` guard — ensures non-initialize requests without a session ID are rejected
- The `onsessioninitialized` callback — stores the session only after the MCP handshake succeeds
- The cleanup interval — runs every 5 minutes to remove sessions idle for 30+ minutes
- The `transport.onclose` handler — removes sessions when the transport closes

---

## 2. Domain Types — `src/types.ts`

Simple TypeScript interfaces for the business domain: `Customer`, `Order`, `Product`, `OrderItem`, and the `OrderStatus` type. These are used throughout tools, resources, and the data layer.

Nothing MCP-specific here — this is standard TypeScript. The types exist to ensure consistency between the mock data and the tool responses.

---

## 3. Mock Data Layer — `src/data/*.ts`

Three files provide in-memory data and lookup functions:

| File | Data | Key Detail |
|------|------|------------|
| `customers.ts` | 5 customers | Immutable — lookups only |
| `products.ts` | 8 products across 3 categories | Includes one out-of-stock product (`prod-008`) for testing edge cases |
| `orders.ts` | 10 orders in various statuses | **Mutable** — `createOrder()` and `approveRefund()` modify the array |

The data layer is intentionally simple (arrays + filter functions) because the focus of this project is MCP patterns, not database design. In a real system, these would be database queries.

### What to look for

- `orders.ts` exports a **mutable** `let orders` array — `createOrder()` pushes new items, `approveRefund()` modifies status in place
- `products.ts` includes `prod-008` (Disaster Recovery Plan) with `inStock: false` — this lets you test the stock validation in `create-order`
- Each file exports focused lookup functions (`getCustomerById`, `getCustomerByEmail`, `searchOrders`, etc.) rather than exposing raw arrays

---

## 4. Your First Tool — `src/tools/get-customer.ts`

This is the best file to understand the full tool registration pattern. Read the file's block comment first — it includes a diagram of "what the AI sees."

### Key concepts

**`server.registerTool(name, config, handler)`** — The MCP SDK's v2 API for registering tools:

```typescript
server.registerTool(
  'get-customer',           // Tool name (what the AI calls)
  {
    title: 'Get Customer',  // Human-readable display name
    description: '...',     // Natural language — the AI reads this to decide when to use the tool
    inputSchema,            // Zod schema → converted to JSON Schema for the AI
    outputSchema,           // Zod schema → enables structuredContent in the response
    annotations: {          // Hints about the tool's behavior
      readOnlyHint: true,   // "This tool doesn't change data"
    },
  },
  async (params) => { ... } // The handler that runs when the AI calls the tool
);
```

**`inputSchema`** — A Zod object schema. The SDK converts it to JSON Schema and sends it to the AI, so the AI knows which parameters to provide. The `describe()` calls on each field become `description` in JSON Schema — the AI reads these to understand what to pass.

**`outputSchema`** — Enables the response to include `structuredContent` (typed data) alongside `content` (human-readable text). Without an output schema, you can only return text.

**`isError: true`** — MCP's pattern for business errors. When a customer isn't found, the tool returns `{ isError: true, content: [...] }` instead of throwing an exception. This is important: the AI sees the error message and can act on it (e.g., "Customer not found — would you like to search by email instead?"). An HTTP error or thrown exception would produce a generic error the AI can't interpret.

**`resource_link`** — After returning customer data, the tool also returns a `resource_link` item:

```typescript
{
  type: 'resource_link',
  uri: `customer://${customer.id}/profile`,
  name: `${customer.name} — Full Profile`,
  mimeType: 'application/json',
}
```

This tells the AI: "there's more data available at this URI if you need it." The AI can then call `resources/read` on that URI. This is how Copilot Studio discovers resources — it does not call `resources/list`.

### What to look for

- The dual `customerId` / `email` parameters — the AI picks which to use based on the user's question
- The `content` array has both a `text` item (for display) and a `resource_link` item (for discovery)
- The `structuredContent` mirrors the `outputSchema` shape exactly

---

## 5. Search with Filters — `src/tools/search-orders.ts`

Demonstrates a tool with multiple optional parameters. The AI decides which filters to apply based on the user's natural language request.

### Key concepts

**Zod `z.enum()`** — The `status` field uses an enum instead of a free-form string. The enum values appear in the tool's JSON Schema, which tells the AI exactly which statuses are valid. Without this, the AI might guess "processing" or "completed" — values that don't exist in the system.

**`z.preprocess` for optional numbers** — The `minTotal` and `maxTotal` fields demonstrate a subtle Zod pattern:

```typescript
minTotal: z.preprocess(
  (val) => (val === null || val === undefined || val === '' ? undefined : val),
  z.coerce.number().optional()
)
```

Why not just `z.coerce.number().optional()`? Because `z.coerce.number()` converts `null`, `""`, and `undefined` to `0` — which would mean "filter by minimum total of $0" instead of "no minimum filter." The `preprocess` step intercepts these empty values and maps them to `undefined` before coercion, preserving the "not specified" semantics.

---

## 6. Write Operations — `src/tools/create-order.ts`

Demonstrates a tool that creates data, with multi-stage validation.

### Key concepts

**Annotation hints for write tools:**

```typescript
annotations: {
  readOnlyHint: false,    // This tool modifies data
  destructiveHint: false, // Creating doesn't destroy existing data
  idempotentHint: false,  // Calling twice creates two separate orders
}
```

These hints tell the AI (and the client) about the tool's behavior. A client might show a confirmation dialog for destructive operations, or allow retries for idempotent ones.

**`z.coerce.number()`** — The `quantity` field uses `z.coerce.number()` instead of `z.number()`. AI models sometimes send numbers as strings in JSON (e.g., `"2"` instead of `2`). The `coerce` variant accepts both formats, silently converting strings to numbers before validation.

**Multi-stage validation** — The handler validates in order: customer exists → each product exists → each product in stock. Each check returns `isError: true` with a descriptive message on failure. This "fail fast" approach means the AI gets a specific, actionable error rather than a generic crash.

---

## 7. Governance Patterns — `src/tools/approve-refund.ts`

Demonstrates a destructive operation with state validation — the most constrained tool in the project.

### Key concepts

**`destructiveHint: true`** — This tool changes an order's status from `refund-pending` to `refunded`. The destructive hint signals to clients that this action has consequences and might warrant user confirmation.

**State validation** — The tool checks multiple preconditions:
- Order exists
- Order status is exactly `refund-pending` (not `pending`, not `refunded`)

Each validation failure returns `isError: true` with a specific message. The AI uses these messages to guide the user ("This order isn't eligible for a refund because...").

**Policy resource_link** — After approving a refund, the tool returns a `resource_link` to `policy://refund`. This lets the AI read the full refund policy document if needed — for example, to explain the refund timeline to the customer.

---

## 8. The resource_link Pattern — `src/tools/list-products.ts`

This tool exists specifically to demonstrate the `resource_link` discovery pattern. Read the file's block comment — it explains why this tool needs to exist even though the data lives in a resource.

### Key concepts

By design, Copilot Studio discovers resources through `resource_link` items returned by tools — it does **not** call `resources/list`. This means every resource needs a companion tool that returns a `resource_link` pointing to it.

The `list-products` tool returns two things:
1. A brief text summary ("8 products across 3 categories")
2. A `resource_link` to `catalog://products`

The AI uses the summary to decide if it needs more detail. If it does, it calls `resources/read` on the URI to get the full catalog.

---

## 9. Static Resources — `src/resources/product-catalog.ts`

The simplest resource type: a fixed URI that always returns the same data structure.

### Key concepts

**`server.registerResource(name, uri, options, handler)`** — The registration API for resources:

```typescript
server.registerResource(
  'product-catalog',       // Resource name
  'catalog://products',    // Static URI — clients call resources/read with this URI
  {
    title: 'Product Catalog',
    description: '...',
    mimeType: 'application/json',
  },
  async (uri) => ({
    contents: [{
      uri: uri.href,
      text: JSON.stringify(products, null, 2),
    }],
  })
);
```

**Custom URI schemes** — MCP resources use URIs but don't require HTTP URLs. Custom schemes like `catalog://`, `customer://`, and `policy://` are conventional — they make it clear these are MCP resources, not web endpoints.

---

## 10. Dynamic Resources — `src/resources/customer-profile.ts`

Demonstrates `ResourceTemplate` for parameterized resources.

### Key concepts

**`ResourceTemplate`** — Unlike static resources, dynamic resources use URI templates with placeholders:

```typescript
server.registerResource(
  'customer-profile',
  new ResourceTemplate('customer://{customerId}/profile', { list: listCallback }),
  { ... },
  async (uri, { customerId }) => { ... }
);
```

The `{customerId}` placeholder is extracted from the URI when the AI calls `resources/read`. The `list` callback returns all valid URIs — MCP Inspector and VS Code use this to show available profiles in their UI.

**`McpError` for missing resources** — When a customer ID doesn't exist, the resource throws `McpError` with `ErrorCode.InvalidParams`. This is different from the tool pattern (`isError: true`) — resources are lower-level and use protocol-level errors.

---

## 11. Markdown Resources — `src/resources/refund-policy.ts`

A static resource that serves a plain-text markdown document rather than structured data.

### Key concepts

**MIME type: `text/markdown`** — Tells the AI the content is structured prose with headings, lists, and emphasis. Other common MIME types include `application/json` (structured data) and `text/plain` (unstructured text). The MIME type helps the AI decide how to process and present the content.

**When to use resources vs. tools** — The refund policy is the clearest resource example: it's ambient context (a policy document), not an action. The AI reads it when it needs to understand refund rules — for example, before approving a refund or explaining the policy to a customer.

---

## 12. Prompt Templates — `src/prompts/customer-summary.ts`

Demonstrates prompts with required arguments.

### Key concepts

**Prompts vs. Tools vs. Resources:**
- **Tools** = functions the AI calls (actions)
- **Resources** = data the AI reads (context)
- **Prompts** = instructions the AI follows (templates)

Think of prompts as "stored procedures for conversations" — they package data retrieval and analysis instructions into a reusable template.

**`argsSchema` takes a raw Zod shape:**

```typescript
argsSchema: {
  customerId: z.string().describe('The customer ID to summarize'),
}
```

⚠️ Note: this is `{ key: z.string() }`, **not** `z.object({ key: z.string() })`. The SDK wraps the shape in `z.object()` internally. Passing a `z.object()` causes a runtime error — a common gotcha.

**Message structure** — Prompts return an array of `messages` with `role` and `content`. The `role: 'user'` message contains data + instructions. The AI processes these messages and generates a response following the template's instructions.

---

## 13. Optional Arguments — `src/prompts/order-analysis.ts`

Demonstrates a prompt where the argument is optional, enabling one template to serve multiple use cases.

### Key concepts

**Prompt reuse** — The same prompt works for:
- "Analyze all orders" → called with no arguments
- "Analyze pending orders" → called with `status: "pending"`
- "Analyze refund requests" → called with `status: "refund-pending"`

This reduces duplication while ensuring consistent output format across all variations.

---

## What's Next?

Now that you understand the code, try running the server and testing each tool, resource, and prompt:

- **[Local Development](03-local-development.md)** — Start the server, configure ports and tunnels
- **[Testing](04-testing.md)** — Use MCP Inspector to test interactively
- **[Exercises](07-exercises.md)** — Build your own tools, resources, and prompts

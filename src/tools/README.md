# MCP Tools

**Tools** are functions the AI can call with parameters to perform actions and get results.

Think of them like API endpoints — the AI sends a request with arguments, and the tool returns a response.

## Tools in this project

| Tool | Type | Description |
|------|------|-------------|
| `get-customer` | Read | Look up a customer by ID or email. Returns `resource_link` to full profile. |
| `search-orders` | Read | Search/filter orders by status, customer, amount |
| `list-products` | Read | Get catalog overview. Returns `resource_link` to full product catalog. |
| `create-order` | Write | Create a new order for a customer |
| `approve-refund` | Write (destructive) | Approve a pending refund. Returns `resource_link` to refund policy. |

## Key concepts demonstrated

- **Input schemas** (Zod): Define what parameters the AI must provide
- **Output schemas** + `structuredContent`: Return typed data the AI can process
- **Tool annotations**: `readOnlyHint`, `destructiveHint`, `idempotentHint` — help the AI understand risk
- **Error handling**: `isError: true` for business errors (not found, invalid state)
- **resource_link pattern**: Tools return `{ type: "resource_link", uri: "..." }` items so Copilot Studio can discover and read MCP Resources (see `get-customer`, `list-products`, `approve-refund`)

## Learn more

- [MCP Tools specification](https://modelcontextprotocol.io/specification/server/tools)

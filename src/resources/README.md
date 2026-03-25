# MCP Resources

**Resources** are read-only data the AI uses for context. They have a URI, a MIME type, and return content.

Think of them like files or documents — the AI reads them to understand background information.

## How Copilot Studio Discovers Resources

> ⚠️ **Important**: Copilot Studio does **not** call `resources/list` to discover resources.
> Instead, it discovers them through **`resource_link` items returned by tools**.

The pattern works like this:

1. AI calls a **tool** (e.g., `list-products`)
2. Tool response includes a `resource_link` item with a URI (e.g., `catalog://products`)
3. AI calls `resources/read` on that URI to get the full content
4. AI uses the content to generate its response

This means every resource needs a companion tool (or must be linked from an existing tool) to be visible to Copilot Studio. MCP Inspector and VS Code *do* call `resources/list`, so resources still work there directly.

See: [Microsoft blog on MCP tools & resources](https://microsoft.github.io/mcscatblog/posts/mcp-tools-resources/)

## Resources in this project

| Resource | Type | URI | Discovered Via |
|----------|------|-----|----------------|
| `product-catalog` | Static | `catalog://products` | `list-products` tool returns `resource_link` |
| `customer-profile` | Dynamic | `customer://{customerId}/profile` | `get-customer` tool returns `resource_link` |
| `refund-policy` | Static | `policy://refund` | `approve-refund` tool returns `resource_link` |

## Key concepts demonstrated

- **Static resources**: Fixed URI, always returns the same data structure (`product-catalog`, `refund-policy`)
- **Dynamic resources** (ResourceTemplate): Parameterized URI, content varies per request (`customer-profile`)
- **resource_link pattern**: Tools return `{ type: "resource_link", uri: "..." }` so Copilot Studio can discover and read resources
- **Error handling**: `McpError` with code `-32002` for missing resources (different from tool errors!)

## Resources vs. Tools — When to Use Which

| Use case | Primitive | Why |
|----------|-----------|-----|
| Reference data (policies, docs, config) | **Resource** | Static context the AI reads as needed |
| Entity lookup (find a customer) | **Tool** | Parameterized action with business logic |
| Catalog/listing | **Both** | Tool for discovery + resource_link, Resource serves the data |

The refund policy is the clearest resource example: it's a static document that provides ambient context, not an entity lookup.

## Learn more

- [MCP Resources specification](https://modelcontextprotocol.io/specification/server/resources)
- [Microsoft: MCP Tools & Resources](https://microsoft.github.io/mcscatblog/posts/mcp-tools-resources/)

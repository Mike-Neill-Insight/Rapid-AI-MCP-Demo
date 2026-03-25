# MCP Resources

**Resources** are read-only data the AI uses for context. They have a URI, a MIME type, and return content.

Think of them like files or documents — the AI reads them to understand background information.

## Resources in this project

| Resource | Type | URI | Description |
|----------|------|-----|-------------|
| `product-catalog` | Static | `catalog://products` | Full product list with pricing |
| `customer-profile` | Dynamic | `customer://{customerId}/profile` | Per-customer profile + order history |

## Key concepts demonstrated

- **Static resources**: Fixed URI, always returns the same data structure
- **Dynamic resources** (ResourceTemplate): Parameterized URI, content varies per request
- **Resource listing**: The `list` callback tells clients which instances exist
- **Error handling**: `McpError` with code `-32002` for missing resources (different from tool errors!)

## Resources vs. Tools

Use a **Resource** when the AI needs background knowledge (read-only context).
Use a **Tool** when the AI needs to perform an action (possibly with side effects).

## Learn more

- [MCP Resources specification](https://modelcontextprotocol.io/specification/server/resources)

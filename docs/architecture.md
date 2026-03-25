# Architecture & Data Flow

> **Prerequisites**: [What is MCP?](what-is-mcp.md)
>
> **Next**: Explore the code starting at [src/server.ts](../src/server.ts), then [Testing](testing.md)

## System Overview

```
┌─────────────────────────┐
│     Copilot Studio      │
│  (or MCP Inspector)     │
│                         │
│  "Look up customer      │
│   cust-001"             │
└────────┬────────────────┘
         │ HTTPS POST /mcp
         │ JSON-RPC: tools/call
         │ Header: Mcp-Session-Id
         ▼
┌─────────────────────────────────────────────────┐
│              Express.js Server                   │
│  ┌────────────────────────────────────────────┐ │
│  │         Streamable HTTP Transport          │ │
│  │  • Parses JSON-RPC requests                │ │
│  │  • Manages session lifecycle               │ │
│  │  • Streams responses via SSE               │ │
│  └────────────────┬───────────────────────────┘ │
│                   │                              │
│  ┌────────────────▼───────────────────────────┐ │
│  │             McpServer                      │ │
│  │  Routes requests to the right handler:     │ │
│  │  • tools/list    → list all tools          │ │
│  │  • tools/call    → execute a tool          │ │
│  │  • resources/... → read a resource         │ │
│  │  • prompts/...   → get a prompt            │ │
│  └────┬──────────┬──────────┬─────────────────┘ │
│       │          │          │                    │
│  ┌────▼────┐ ┌──▼───┐ ┌───▼────┐               │
│  │  Tools  │ │ Res. │ │Prompts │               │
│  │ 4 tools │ │  2   │ │   2    │               │
│  └────┬────┘ └──┬───┘ └───┬────┘               │
│       │         │         │                      │
│  ┌────▼─────────▼─────────▼────┐                │
│  │      Mock Data Layer        │                │
│  │  customers / orders / prods │                │
│  └─────────────────────────────┘                │
└─────────────────────────────────────────────────┘
```

## Request Lifecycle

Here's what happens when Copilot Studio calls `get-customer`:

### 1. Initialize (once per conversation)

```
Client → POST /mcp
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2025-03-26",
    "clientInfo": { "name": "copilot-studio", "version": "1.0" },
    "capabilities": {}
  }
}

Server → 200 OK
Header: Mcp-Session-Id: abc-123-def
{
  "result": {
    "protocolVersion": "2025-03-26",
    "serverInfo": { "name": "rapid-ai-mcp-demo", "version": "1.0.0" },
    "capabilities": {
      "tools": { "listChanged": true },
      "resources": { "listChanged": true },
      "prompts": { "listChanged": true }
    }
  }
}
```

### 2. Discover (client learns what's available)

```
Client → POST /mcp
Header: Mcp-Session-Id: abc-123-def
{ "jsonrpc": "2.0", "id": 2, "method": "tools/list" }

Server → 200 OK
{
  "result": {
    "tools": [
      { "name": "get-customer", "description": "Look up a customer...", "inputSchema": {...} },
      { "name": "search-orders", ... },
      { "name": "create-order", ... },
      { "name": "approve-refund", ... }
    ]
  }
}
```

### 3. Invoke (AI calls a tool)

```
Client → POST /mcp
Header: Mcp-Session-Id: abc-123-def
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "get-customer",
    "arguments": { "customerId": "cust-001" }
  }
}

Server → 200 OK (SSE stream)
data: {
  "result": {
    "content": [{ "type": "text", "text": "Customer: Alice Johnson..." }],
    "structuredContent": { "customer": {...}, "recentOrders": [...] }
  }
}
```

## Session Lifecycle

```
┌──────────┐     initialize      ┌──────────┐
│  No      │ ──────────────────► │  Active  │
│  Session │  (creates session)  │  Session │ ◄── subsequent requests
└──────────┘                     └─────┬────┘     update lastActivity
                                       │
                          ┌────────────┼────────────┐
                          │            │            │
                    DELETE /mcp    30 min idle    transport
                    (explicit)     (TTL cleanup)   closes
                          │            │            │
                          ▼            ▼            ▼
                     ┌─────────────────────────────────┐
                     │         Session Removed          │
                     └─────────────────────────────────┘
```

- Each session gets its own `McpServer` instance (isolated state)
- Session ID is a UUID, sent via `Mcp-Session-Id` header
- Idle sessions are automatically cleaned up after 30 minutes
- Clients can explicitly end sessions with `DELETE /mcp`

## Key Files

| File | Role | Start Here? |
|------|------|:-----------:|
| `src/server.ts` | Express setup, transport wiring, session management | ✅ Yes |
| `src/tools/*.ts` | Tool implementations (one file per tool) | After server.ts |
| `src/resources/*.ts` | Resource implementations | After tools |
| `src/prompts/*.ts` | Prompt implementations | After resources |
| `src/data/*.ts` | Mock data + lookup functions | Reference as needed |
| `src/types.ts` | TypeScript type definitions | Reference as needed |
| `openapi.json` | Swagger spec for Copilot Studio connector | When connecting |

# What is the Model Context Protocol (MCP)?

> **Prerequisites**: None — this is the starting point.
>
> **Next**: [Architecture & Data Flow](02-architecture.md)

## The Problem

AI assistants are powerful but isolated. They can't access your company's data, APIs, or systems without custom integrations — and every AI platform has its own plugin format:

- Copilot Studio has connectors
- ChatGPT has plugins (now GPTs)
- Claude has tool use
- VS Code has extensions

Building and maintaining integrations for each platform is expensive.

## The Solution

**MCP (Model Context Protocol)** is an open standard created by Anthropic that gives AI assistants a universal way to connect to external systems. Build one MCP server, and any MCP-compatible client can use it.

Think of it like USB for AI — a standard interface that works everywhere.

## The Three Primitives

MCP defines three types of capabilities a server can expose:

### 🔧 Tools — Actions the AI Can Perform

Tools are **functions the AI calls** with parameters to get a result. They're the MCP equivalent of API endpoints.

**When to use**: The AI needs to *do something* — look up data, create records, trigger actions.

```
User: "Look up customer Alice Johnson"
→ AI calls tool: get-customer({ email: "alice@northwindtraders.com" })
→ Tool returns: { name: "Alice Johnson", company: "Northwind Traders", ... }
→ AI: "Alice Johnson is an enterprise customer at Northwind Traders..."
```

### 📄 Resources — Data the AI Can Read

Resources are **read-only data** the AI uses for context. They have a URI and return content, like files or documents.

**When to use**: The AI needs *background knowledge* — reference data, configuration, documentation.

```
User: "What products do we sell?"
→ AI calls tool: list-products()
→ Tool returns a resource_link: catalog://products
→ AI calls resources/read on catalog://products
→ Resource returns: [{ name: "Cloud Hosting - Basic", price: 29.99 }, ...]
→ AI: "We offer 8 products across Hosting, Security, and Data Services..."
```

> **Copilot Studio note**: Copilot Studio discovers resources through `resource_link`
> items returned by tools — it does NOT call `resources/list` directly. Other clients
> like MCP Inspector and VS Code do enumerate resources directly. See
> [Microsoft's blog post](https://microsoft.github.io/mcscatblog/posts/mcp-tools-resources/)
> for details on the resource_link pattern.

### 📝 Prompts — Reusable Prompt Templates

> ⚠️ **Copilot Studio note**: Copilot Studio does **not** currently support MCP prompts — only tools and resources. Prompts work with MCP Inspector, VS Code, Claude Desktop, and other MCP clients. They are included in this project because they are a core MCP primitive worth understanding.

Prompts are **structured message templates** that guide the AI's response. They package data and instructions together.

**When to use**: You want *consistent, repeatable AI interactions* — standard reports, analysis formats, response templates.

```
User activates prompt: customer-summary({ customerId: "cust-001" })
→ Prompt returns messages with customer data + analysis instructions
→ AI produces a structured account summary following the template
```

### When to Use Which?

| Need | Use | Why |
|------|-----|-----|
| AI performs an action | **Tool** | It has parameters, executes logic, returns results |
| AI needs background data | **Resource** | Read-only context, like a file the AI can reference |
| AI follows a standard format | **Prompt** | Template with instructions + data, ensures consistency |

## How MCP Works (Transport)

```
┌──────────────┐         ┌──────────────────┐
│  AI Client   │  HTTP   │   MCP Server     │
│ (Copilot     │ ──────► │   (your code)    │
│  Studio)     │ POST    │                  │
│              │ /mcp    │  Handles:        │
│              │ ◄────── │  - tools/call    │
│              │  SSE    │  - resources/read│
│              │         │  - prompts/get   │
└──────────────┘         └──────────────────┘
```

1. **Client discovers capabilities**: On connect, the client asks "what tools, resources, and prompts do you have?"
2. **Server responds**: Lists everything with descriptions and schemas
3. **Client invokes**: When the AI needs something, it sends a JSON-RPC request
4. **Server responds**: Processes the request and returns results

MCP uses **Streamable HTTP** as the transport:
- **POST /mcp** — Client sends JSON-RPC requests
- **GET /mcp** — Server streams responses via SSE (Server-Sent Events)
- **DELETE /mcp** — Client ends the session

## MCP + Copilot Studio

Microsoft Copilot Studio connects to MCP servers through **custom connectors**. The flow:

1. You deploy your MCP server (locally with a tunnel, or to Azure)
2. You create an OpenAPI spec describing the `/mcp` endpoint
3. You import the spec as a custom connector in Copilot Studio
4. Copilot Studio discovers your tools and resources and uses them in conversations

The key requirement is the `x-ms-agentic-protocol: mcp-streamable-1.0` marker in your OpenAPI spec — this tells Copilot Studio "this isn't a regular API, it speaks MCP."

## Learn More

- [MCP Specification](https://modelcontextprotocol.io/specification)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [Copilot Studio MCP Documentation](https://learn.microsoft.com/en-us/microsoft-copilot-studio/agent-extend-action-mcp)

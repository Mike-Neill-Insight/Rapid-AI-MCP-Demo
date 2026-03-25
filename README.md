# MCP Server Demo for Copilot Studio

A hands-on learning project that demonstrates how to build an **MCP (Model Context Protocol) server** and connect it to **Microsoft Copilot Studio**.

You'll learn the three MCP primitives — **Tools**, **Resources**, and **Prompts** — by exploring a working server with a customer/order management domain.

## What You'll Learn

- What MCP is and why it matters for AI integrations
- How to build an MCP server with TypeScript and the official SDK
- The difference between Tools, Resources, and Prompts
- How to use Streamable HTTP transport (required by Copilot Studio)
- How to connect your server to Copilot Studio via a custom connector
- How to deploy to Azure Container Apps

## Prerequisites

- **Node.js** 18+ ([download](https://nodejs.org))
- **npm** (comes with Node.js)
- A code editor (VS Code recommended)
- For Copilot Studio: a Microsoft 365 account with Copilot Studio access
- For deployment: an Azure subscription (free tier works)

## Quick Start

```bash
# Install dependencies
npm install

# Start the dev server (auto-reloads on changes)
npm run dev

# In another terminal, verify it's running
curl http://localhost:3100/health
```

## Learning Path

Read these in order for the best learning experience:

| # | What | Where | Time |
|---|------|-------|------|
| 1 | **What is MCP?** — conceptual overview | [docs/01-what-is-mcp.md](docs/01-what-is-mcp.md) | 10 min |
| 2 | **Architecture** — how requests flow | [docs/02-architecture.md](docs/02-architecture.md) | 5 min |
| 3a | **Code walkthrough** — annotated source tour | [docs/03a-code-walkthrough.md](docs/03a-code-walkthrough.md) | 20 min |
| 3 | **Local development** — setup, ports, tunnels | [docs/03-local-development.md](docs/03-local-development.md) | 5 min |
| 4 | **Test locally** — verify with MCP Inspector | [docs/04-testing.md](docs/04-testing.md) | 10 min |
| 5 | **Connect to Copilot Studio** | [docs/05-copilot-studio-setup.md](docs/05-copilot-studio-setup.md) | 15 min |
| 6 | **Deploy to Azure** | [docs/06-azure-deployment.md](docs/06-azure-deployment.md) | 20 min |
| 7 | **Exercises** — build your own extensions | [docs/07-exercises.md](docs/07-exercises.md) | 30+ min |

## Project Structure

```
src/
  server.ts              ← Start here! The guided-tour entry point
  types.ts               ← TypeScript types for the domain
  data/                  ← Mock data layer (customers, orders, products)
  tools/                 ← MCP Tools — actions the AI can perform
    get-customer.ts        Look up customer by ID or email
    search-orders.ts       Search/filter orders
    create-order.ts        Create a new order (write operation)
    approve-refund.ts      Approve a refund (write with guardrails)
  resources/             ← MCP Resources — read-only data for context
    product-catalog.ts     Full product listing (static resource)
    customer-profile.ts    Per-customer profile (dynamic template)
  prompts/               ← MCP Prompts — reusable prompt templates
    customer-summary.ts    Customer account summary prompt
    order-analysis.ts      Order analysis prompt
docs/                    ← Learning guides and deployment instructions
openapi.json             ← OpenAPI 2.0 spec for Copilot Studio connector
Dockerfile               ← Container image for deployment
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with hot reload (uses tsx) |
| `npm run build` | Compile TypeScript to JavaScript |
| `npm start` | Run compiled server (production) |
| `npm run inspect` | Open MCP Inspector to test tools/resources/prompts |

## Demo Flow

Suggested progression for a live demo or walkthrough:

1. **Start server** → show health check, explain the transport
2. **MCP Inspector** → connect, show tool/resource/prompt discovery
3. **Resource read** → fetch product catalog (AI gets context)
4. **Prompt** → use customer-summary in MCP Inspector (AI gets structured instructions) *(Note: prompts work in Inspector but not in Copilot Studio)*
5. **Tool: read** → get-customer lookup (AI calls a function)
6. **Tool: search** → search-orders with filters (parameterized query)
7. **Tool: write** → create-order (demonstrates write capability)
8. **Tool: governance** → approve-refund (shows destructive operation with guardrails)
9. **Error handling** → call with invalid customer ID (graceful `isError` response)
10. **Connect to Copilot Studio** → show the full loop with custom connector

## Tech Stack

- **Runtime**: Node.js + TypeScript
- **MCP SDK**: `@modelcontextprotocol/sdk` (official TypeScript SDK)
- **HTTP Framework**: Express.js
- **Transport**: Streamable HTTP (`mcp-streamable-1.0`)
- **Validation**: Zod v4

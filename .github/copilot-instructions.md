# Copilot Instructions

## Project Overview

MCP (Model Context Protocol) server demo for Copilot Studio. TypeScript + Express + `@modelcontextprotocol/sdk`. Customer/order domain with in-memory mock data.

## Build & Run

```bash
npm run dev          # Dev server with hot reload (tsx)
npm run build        # Compile TypeScript → dist/
npm start            # Run compiled server (production)
npm run inspect      # Open MCP Inspector for interactive testing
```

Default port is 3100 (configurable via `PORT` env var). Port 3000 is often taken on dev machines.

## Architecture

- **Transport**: Streamable HTTP at `POST/GET/DELETE /mcp` (required by Copilot Studio)
- **Sessions**: Stateful, per-conversation `McpServer` instances stored in a Map with 30-min TTL
- **MCP SDK**: v2 API — use `registerTool`, `registerResource`, `registerPrompt` (not legacy `tool`/`resource`/`prompt`)
- **Validation**: Zod v4 for tool input/output schemas
- **Prompts**: `argsSchema` takes a raw Zod shape `{ key: z.string() }`, NOT `z.object({ ... })`

## Key Conventions

- **Tool errors**: Return `{ isError: true, content: [...] }` for business errors (not found, invalid state). Never throw HTTP errors for tool-level problems.
- **Resource errors**: Throw `McpError` with `ErrorCode.InvalidParams` for missing resources.
- **Tool annotations**: All tools declare `readOnlyHint`, `destructiveHint`, `idempotentHint`.
- **Output schemas**: All tools provide `outputSchema` and return both `content` (text) and `structuredContent` (typed data).
- **Comments**: Every file has "why" comments explaining the MCP concept it implements — this is a training project.
- **Imports**: Use `.js` extensions in imports (ESM resolution requires it even for `.ts` files).


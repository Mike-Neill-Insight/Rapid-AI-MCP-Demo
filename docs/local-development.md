# Local Development

> **Prerequisites**: [What is MCP?](what-is-mcp.md)
>
> **Next**: [Testing](testing.md)

## Getting Started

```bash
# Install dependencies
npm install

# Start the dev server (auto-reloads on file changes)
npm run dev
```

The server starts at `http://127.0.0.1:3100` by default.

## Configuration

Copy `.env.example` to `.env` to customize:

```bash
cp .env.example .env
```

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3100` | Port the server listens on |

## Exposing to Copilot Studio

Copilot Studio requires HTTPS access to your server. For local development, use a tunnel:

### VS Code Dev Tunnels

```bash
# One-time setup
winget install Microsoft.devtunnel
devtunnel user login

# Start tunnel (run alongside your dev server)
devtunnel host -p 3100 --allow-anonymous
```

### ngrok

```bash
# Start tunnel
ngrok http 3100
```

After starting a tunnel, update `openapi.json` with your tunnel hostname.

## Live Demo Tips

If using this for a presentation:

1. **Start everything before the demo**: server + tunnel, verify with health check
2. **Pre-test all scenarios**: Run through the demo flow once to warm up sessions
3. **Have a backup**: If the tunnel drops, you can still demo with MCP Inspector locally
4. **Keep the server terminal visible**: The session logs show what's happening in real time
5. **Use port 3100**: Port 3000 is commonly taken by other tools (we default to 3100 for this reason)

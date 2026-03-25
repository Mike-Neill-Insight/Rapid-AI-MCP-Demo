# Testing Your MCP Server

> **Prerequisites**: [Architecture](architecture.md), server running (`npm run dev`)
>
> **Next**: [Copilot Studio Setup](copilot-studio-setup.md)

## Quick Health Check

First, verify the server is running:

```bash
curl http://localhost:3100/health
```

Expected response:
```json
{ "status": "ok", "activeSessions": 0, "uptime": 12.345 }
```

## Testing with MCP Inspector

The [MCP Inspector](https://github.com/modelcontextprotocol/inspector) is a visual tool for testing MCP servers. It lets you discover and invoke tools, resources, and prompts interactively.

### Setup

```bash
# Start your server in one terminal
npm run dev

# Open MCP Inspector in another terminal
npm run inspect
```

The Inspector will open in your browser.

### Connecting to Your Server

1. In the Inspector, select **"Streamable HTTP"** as the transport type
2. **Important**: Enter your MCP server URL: `http://localhost:3100/mcp`
   - ⚠️ Do NOT use the Inspector's own URL (`localhost:6274`) — that's the Inspector UI, not your server
3. Click **Connect**
4. You should see the server's capabilities listed

### Testing Tools

1. Click the **Tools** tab
2. You'll see all 4 tools listed: `get-customer`, `search-orders`, `create-order`, `approve-refund`
3. Click on `get-customer`
4. Enter a parameter: `customerId` = `cust-001`
5. Click **Execute**
6. You should see Alice Johnson's customer details and recent orders

**Try these scenarios:**
- `get-customer` with `email` = `bob@contoso.com` (lookup by email)
- `get-customer` with `customerId` = `cust-999` (not found → `isError: true`)
- `search-orders` with `status` = `refund-pending` (finds ord-004)
- `create-order` with `customerId` = `cust-001`, `items` = `[{ "productId": "prod-001", "quantity": 2 }]`
- `approve-refund` with `orderId` = `ord-004` (approves the refund)
- `approve-refund` with `orderId` = `ord-004` again (already refunded → error)

### Testing Resources

1. Click the **Resources** tab
2. You'll see `product-catalog` and the `customer-profile` template
3. Click `product-catalog` → see all 8 products with pricing
4. Click `customer-profile` → select a customer → see their full profile with order history

### Testing Prompts

1. Click the **Prompts** tab
2. Click `customer-summary` → enter `customerId` = `cust-001`
3. See the structured prompt with customer data and analysis instructions
4. Click `order-analysis` → leave status empty for all orders, or enter `pending`

## Testing with curl

For quick smoke tests or CI pipelines:

### Initialize a session

```bash
# Initialize — note the Mcp-Session-Id in the response headers
curl -X POST http://localhost:3100/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2025-03-26",
      "capabilities": {},
      "clientInfo": { "name": "curl-test", "version": "1.0.0" }
    }
  }' -v 2>&1 | grep -i "mcp-session-id"
```

### Call a tool (use the session ID from above)

```bash
curl -X POST http://localhost:3100/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: YOUR-SESSION-ID-HERE" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "get-customer",
      "arguments": { "customerId": "cust-001" }
    }
  }'
```

## Common Issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| `ECONNREFUSED` on port 3100 | Server not running | Run `npm run dev` |
| Port 3100 already in use | Another process on that port | Change `PORT` in `.env` or kill the other process |
| 400 "Missing Mcp-Session-Id" | Sending tool call without initializing | Send an `initialize` request first |
| 404 "Session not found" | Session expired (30 min idle) | Re-initialize |
| `isError: true` in tool result | Business error (e.g., customer not found) | Check the error message — this is expected behavior |
| MCP Inspector won't connect | Wrong transport type or URL | Use "Streamable HTTP" and `http://localhost:3100/mcp` |

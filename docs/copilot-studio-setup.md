# Connecting to Copilot Studio

> **Prerequisites**: [Testing](testing.md) — verify your server works locally first
>
> **Next**: [Azure Deployment](azure-deployment.md) (for production) or [Exercises](exercises.md) (to extend the server)
>
> **Source**: [Microsoft official MCP lab](https://microsoft.github.io/pp-mcp/labs/mcs-mcp/) | [MS Learn — Add MCP to agent](https://learn.microsoft.com/en-us/microsoft-copilot-studio/mcp-add-components-to-agent)

## Overview

Copilot Studio connects to MCP servers through the **Power Platform connector** infrastructure. MCP servers are added as **tools** on your agent's Tools page — they use the same connector plumbing as other Power Platform connectors, which means enterprise security (VNet, DLP, OAuth) works out of the box.

The process:

1. Expose your local server via a tunnel (or deploy to Azure)
2. Create a custom connector from the OpenAPI spec
3. Add the MCP server to your agent as a **tool**
4. Authorize the connection
5. Test the integration

## Step 1: Expose Your Server

Copilot Studio needs HTTPS access to your `/mcp` endpoint. For local development, use a tunnel.

### Option A: VS Code Port Forwarding (Recommended for quick demos)

VS Code has built-in port forwarding — no CLI install needed:

1. Open the project in VS Code and start the server (`npm run dev`)
2. Select the **PORTS** tab at the bottom of the VS Code terminal
3. Click the green **Forward a Port** button
4. Enter `3100` as the port number
5. Right-click the row → **Port Visibility** → **Public**
6. Ctrl+click the **Forwarded Address** to copy the URL (e.g., `https://something-3100.devtunnels.ms`)
7. Browse to `{url}/mcp` — you should see: `{"jsonrpc":"2.0","error":{"code":-32000,"message":"Method not allowed."},"id":null}`
   This means the server is running and reachable. The error is expected — GET is not the right HTTP method for MCP.

### Option B: Dev Tunnels CLI

```bash
# Install the dev tunnels CLI (if not already installed)
winget install Microsoft.devtunnel

# Login
devtunnel user login

# Create and start a tunnel
devtunnel host -p 3100 --allow-anonymous
```

You'll get a URL like `https://abc123.devtunnels.ms`.

### Option C: ngrok

```bash
# Install ngrok (https://ngrok.com/download)
ngrok http 3100
```

You'll get a URL like `https://abc123.ngrok-free.app`.

> **⚠️ Important**: Update the `host` field in `openapi.json` with your tunnel URL (without `https://`).

## Step 2: Update the OpenAPI Spec

Edit `openapi.json` and replace the `host` placeholder:

```json
{
  "host": "abc123.devtunnels.ms",
  "schemes": ["https"]
}
```

The critical marker is `x-ms-agentic-protocol: mcp-streamable-1.0` on the POST `/mcp` operation — this tells Copilot Studio "this isn't a regular REST API, it speaks MCP." This is already set in the included `openapi.json`.

## Step 3: Create the Custom Connector

You need a custom connector so Copilot Studio can reach your MCP server. There are two paths:

### Path A: From Copilot Studio (Recommended)

1. Open [Copilot Studio](https://copilotstudio.microsoft.com)
2. Select your agent (or create a new one)
3. Go to the **Tools** page in the top menu
4. Select **Add a tool**
5. Select **New tool** → **Custom connector**
   This redirects you to Power Apps to create the connector.
6. Select **New custom connector** → **Import an OpenAPI file**
7. Upload your `openapi.json` file (or paste the YAML equivalent)
8. On the **General** tab:
   - **Host**: your tunnel URL (e.g., `abc123.devtunnels.ms`)
   - **Base URL**: `/`
9. On the **Security** tab:
   - Select **No authentication** (for local dev)
10. On the **Definition** tab:
    - Verify the `/mcp` POST operation is listed
    - Verify `x-ms-agentic-protocol: mcp-streamable-1.0` is present
11. Click **Create connector**

### Path B: From Power Apps directly

1. Go to [Power Apps](https://make.powerapps.com) → pin **Custom connectors** in the left menu
2. Click **+ New custom connector** → **Import an OpenAPI file**
3. Follow steps 7–11 above

## Step 4: Add the MCP Server to Your Agent

1. Go back to Copilot Studio → your agent → **Tools** page
2. Select **Add a tool**
3. Select the **Model Context Protocol** tab to filter MCP servers
4. Select your MCP connector from the list
5. **Authorize the connection**:
   - Select **Not connected** → **Create new Connection**
   - Select **Create** to establish the connection
6. Select **Add to agent** (adds MCP tools and resources) or **Add and configure** (adds and lets you configure details)

> **💡 Tip**: Make sure **Generative AI Orchestration** is enabled on your agent. MCP tools require orchestration to be turned on so the AI can decide which tools to call.

**What you should see after this step:**
- ✅ The MCP server appears on the agent's Tools page
- ✅ The discovered tools are listed (get-customer, search-orders, list-products, create-order, approve-refund)
- ✅ Resources are accessible through the `resource_link` pattern (tools return links, agent calls `resources/read`)

## Step 5: Test the Integration

1. In Copilot Studio, refresh the **Test your agent** panel
2. You may be prompted to **Connect** additional permissions — click through to authorize
3. Try these prompts:

| Prompt | Expected tool | What to look for |
|--------|---------------|------------------|
| "Look up customer cust-001" | `get-customer` | Customer info + `resource_link` to full profile |
| "What products do you sell?" | `list-products` | Product summary; agent may follow `resource_link` to full catalog |
| "Show me all pending orders" | `search-orders` | Filtered order list |
| "Create an order for customer cust-003 for Cloud Hosting Basic" | `create-order` | New order confirmation |
| "Approve the refund for ord-004" | `approve-refund` | Refund confirmation + `resource_link` to refund policy |

**What you should see:**
- ✅ Copilot Studio identifies the right tool to call
- ✅ The tool parameters are correctly extracted from natural language
- ✅ The response is formatted and presented to the user
- ✅ In your server's terminal, you see session creation and request logs

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Connector can't reach server | Tunnel not running or URL changed | Restart tunnel, update `openapi.json` host |
| "No tools available" | MCP server not added to agent | Go to Tools → Add a tool → Model Context Protocol tab → select your connector |
| Tools not discovered | Missing `x-ms-agentic-protocol` | Verify it's in `openapi.json` under the POST operation |
| "Additional permissions required" | Connection not authorized | Click Connect → authorize the connection in the dialog |
| `Method not allowed` on GET /mcp | Normal — MCP uses POST | This is expected. The server is working correctly. |
| 426 Upgrade Required | Port conflict (another service on same port) | Change `PORT` in `.env` and restart |
| Authentication errors | Connector expects auth but server doesn't | Set connector auth to "No authentication" for local dev |
| Timeout errors | Tunnel latency or server cold start | Ensure server is running, try the request again |
| Orchestration errors | Generative AI not enabled | Turn on Generative AI Orchestration in agent settings |

> **⚠️ Common Gotcha**: When your tunnel URL changes (e.g., after restarting ngrok), you must update both `openapi.json` AND the connector configuration in Copilot Studio/Power Apps. VS Code port forwarding with a GitHub login provides a stable URL that persists across restarts.

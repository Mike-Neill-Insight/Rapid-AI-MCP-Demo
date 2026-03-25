# Connecting to Copilot Studio

> **Prerequisites**: [Testing](testing.md) — verify your server works locally first
>
> **Next**: [Azure Deployment](azure-deployment.md) (for production) or [Exercises](exercises.md) (to extend the server)

## Overview

Copilot Studio connects to MCP servers through **custom connectors**. The process:

1. Expose your local server via a tunnel (or deploy to Azure)
2. Create a custom connector from the OpenAPI spec
3. Add the connector to your Copilot Studio agent
4. Test the integration

## Step 1: Expose Your Server

Copilot Studio needs HTTPS access to your `/mcp` endpoint. For local development, use a tunnel.

### Option A: VS Code Dev Tunnels (Recommended for Microsoft environments)

```bash
# Install the dev tunnels CLI (if not already installed)
winget install Microsoft.devtunnel

# Login
devtunnel user login

# Create and start a tunnel
devtunnel host -p 3100 --allow-anonymous
```

You'll get a URL like `https://abc123.devtunnels.ms`. This is your server URL.

### Option B: ngrok

```bash
# Install ngrok (https://ngrok.com/download)
ngrok http 3100
```

You'll get a URL like `https://abc123.ngrok-free.app`.

> **⚠️ Important**: Update the `host` field in `openapi.json` with your tunnel URL (without `https://`).

<!-- Screenshot: Terminal showing the tunnel URL after running devtunnel or ngrok -->

## Step 2: Update the OpenAPI Spec

Edit `openapi.json` and replace the `host` placeholder:

```json
{
  "host": "abc123.devtunnels.ms",
  "schemes": ["https"]
}
```

## Step 3: Create the Custom Connector

### Using Copilot Studio MCP Wizard (Recommended)

1. Open [Copilot Studio](https://copilotstudio.microsoft.com)
2. Select your agent (or create a new one)
3. Go to **Actions** → **Add an action**
4. Select **"MCP Server"**

<!-- Screenshot: Copilot Studio Actions panel with "Add an action" button highlighted -->

5. In the **Host** field, enter your tunnel URL: `https://abc123.devtunnels.ms`
6. In the **Base Path** field, enter: `/`
7. For **Authentication**, select **No Authentication** (for local dev)

<!-- Screenshot: MCP Server configuration dialog with host and base path filled in -->

8. Click **Add**
9. Copilot Studio will connect to your server and discover available tools

**What you should see after this step:**
- ✅ The action appears in your agent's Actions list
- ✅ The discovered tools are listed (get-customer, search-orders, create-order, approve-refund)

### Using Custom Connector (Manual)

If the MCP wizard isn't available in your environment:

1. Go to [Power Automate](https://make.powerautomate.com) → **Custom connectors**
2. Click **+ New custom connector** → **Import an OpenAPI file**
3. Upload your `openapi.json` file

<!-- Screenshot: Power Automate custom connector import dialog -->

4. On the **General** tab:
   - **Host**: your tunnel URL (e.g., `abc123.devtunnels.ms`)
   - **Base URL**: `/`

5. On the **Security** tab:
   - Select **No authentication** (for local dev)

6. On the **Definition** tab:
   - Verify the `/mcp` POST operation is listed
   - Verify `x-ms-agentic-protocol: mcp-streamable-1.0` is present

7. Click **Create connector**

<!-- Screenshot: Custom connector definition tab showing the /mcp operation -->

8. Go back to Copilot Studio → your agent → **Actions** → **Add an action**
9. Search for your custom connector name
10. Add it to the agent

**What you should see after this step:**
- ✅ The connector appears in the Custom Connectors list
- ✅ You can test the connector with a test operation
- ✅ The connector is available as an action in Copilot Studio

## Step 4: Test the Integration

1. In Copilot Studio, open the **Test** panel
2. Try these prompts:
   - "Look up customer cust-001" → should invoke `get-customer`
   - "What products do you sell?" → may use the product catalog resource
   - "Show me all pending orders" → should invoke `search-orders`
   - "Create an order for customer cust-003 for Cloud Hosting Basic" → should invoke `create-order`

<!-- Screenshot: Copilot Studio test panel showing a successful tool invocation -->

**What you should see:**
- ✅ Copilot Studio identifies the right tool to call
- ✅ The tool parameters are correctly extracted from natural language
- ✅ The response is formatted and presented to the user
- ✅ In your server's terminal, you see session creation and request logs

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Connector can't reach server | Tunnel not running or URL changed | Restart tunnel, update `openapi.json` host |
| "No actions available" | Connector not added to agent | Go to Actions → Add action → select your connector |
| Tools not discovered | Missing `x-ms-agentic-protocol` | Verify it's in `openapi.json` under the POST operation |
| 426 Upgrade Required | Port conflict (another service on same port) | Change `PORT` in `.env` and restart |
| Authentication errors | Connector expects auth but server doesn't | Set connector auth to "No authentication" for local dev |
| Timeout errors | Tunnel latency or server cold start | Ensure server is running, try the request again |

> **⚠️ Common Gotcha**: When your tunnel URL changes (e.g., after restarting ngrok), you must update both `openapi.json` AND the connector configuration in Copilot Studio/Power Automate. Dev Tunnels with a persistent name avoid this issue.

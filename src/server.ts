/**
 * MCP Server — Main Entry Point
 * ══════════════════════════════
 *
 * This is the "guided tour" file. If you're reading one file to understand
 * how this MCP server works, this is the one.
 *
 * What happens here:
 * 1. Create an McpServer instance (the MCP protocol handler)
 * 2. Register all Tools, Resources, and Prompts
 * 3. Set up Express with Streamable HTTP transport
 * 4. Handle session lifecycle (create, reuse, cleanup)
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ DATA FLOW:                                                          │
 * │                                                                     │
 * │ Copilot Studio ──POST /mcp──► Express ──► MCP SDK ──► Tool Handler │
 * │                                  │                         │        │
 * │                                  │    ◄── JSON-RPC ───◄───┘        │
 * │                                  │                                  │
 * │ Copilot Studio ◄─── SSE ───◄───┘                                  │
 * │                                                                     │
 * │ The MCP SDK handles all JSON-RPC framing. You just register         │
 * │ handlers and return results — the SDK does the rest.               │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * Transport: Streamable HTTP (required by Copilot Studio since Aug 2025)
 * - POST /mcp — receives JSON-RPC requests
 * - GET /mcp — SSE streaming for real-time responses
 * - DELETE /mcp — explicit session cleanup
 */

import { randomUUID } from 'node:crypto';
import express from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';

// Tool registrations
import { registerGetCustomerTool } from './tools/get-customer.js';
import { registerSearchOrdersTool } from './tools/search-orders.js';
import { registerCreateOrderTool } from './tools/create-order.js';
import { registerApproveRefundTool } from './tools/approve-refund.js';
import { registerListProductsTool } from './tools/list-products.js';

// Resource registrations
import { registerProductCatalogResource } from './resources/product-catalog.js';
import { registerCustomerProfileResource } from './resources/customer-profile.js';
import { registerRefundPolicyResource } from './resources/refund-policy.js';

// Prompt registrations
import { registerCustomerSummaryPrompt } from './prompts/customer-summary.js';
import { registerOrderAnalysisPrompt } from './prompts/order-analysis.js';

// ══════════════════════════════════════════════════════════════════════════════
// Configuration
// ══════════════════════════════════════════════════════════════════════════════

const PORT = parseInt(process.env.PORT || '3100', 10);

// Session idle timeout: 30 minutes. Sessions not used within this window
// are automatically cleaned up to prevent memory leaks.
const SESSION_TTL_MS = 30 * 60 * 1000;

// ══════════════════════════════════════════════════════════════════════════════
// Session Management
// ══════════════════════════════════════════════════════════════════════════════

// Each Copilot Studio conversation gets its own session. The session maps
// a session ID (sent via Mcp-Session-Id header) to a transport instance.
interface Session {
  transport: StreamableHTTPServerTransport;
  server: McpServer;
  lastActivity: number;
}

const sessions = new Map<string, Session>();

/**
 * Create a new McpServer instance with all tools, resources, and prompts
 * registered. Each session gets its own server instance so that tool
 * state (like created orders) is isolated per conversation.
 */
function createMcpServer(): McpServer {
  const server = new McpServer(
    {
      name: 'rapid-ai-mcp-demo',
      version: '1.0.0',
    },
    {
      capabilities: {
        // Enable logging so tools can use ctx.mcpReq.log() for debugging
        logging: {},
      },
    }
  );

  // Register all MCP primitives
  // Each of these functions adds one tool/resource/prompt to the server.
  // See the individual files for detailed comments on each one.

  // Tools — actions the AI can perform
  registerGetCustomerTool(server);
  registerSearchOrdersTool(server);
  registerCreateOrderTool(server);
  registerApproveRefundTool(server);
  registerListProductsTool(server);

  // Resources — read-only data the AI can access
  registerProductCatalogResource(server);
  registerCustomerProfileResource(server);
  registerRefundPolicyResource(server);

  // Prompts — reusable prompt templates
  // Note: Copilot Studio does not currently support MCP prompts.
  // These work with MCP Inspector, VS Code, and other MCP clients.
  registerCustomerSummaryPrompt(server);
  registerOrderAnalysisPrompt(server);

  return server;
}

/**
 * Clean up expired sessions. Runs periodically to prevent memory leaks.
 * In production, you'd use a more sophisticated store (Redis, etc.).
 */
function cleanupExpiredSessions() {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (now - session.lastActivity > SESSION_TTL_MS) {
      console.log(`[sessions] Cleaning up expired session: ${id}`);
      session.transport.close?.();
      session.server.close();
      sessions.delete(id);
    }
  }
}

// Run cleanup every 5 minutes
setInterval(cleanupExpiredSessions, 5 * 60 * 1000);

// ══════════════════════════════════════════════════════════════════════════════
// Express App Setup
// ══════════════════════════════════════════════════════════════════════════════

const app = express();

// Parse JSON request bodies (required for JSON-RPC requests)
app.use(express.json());

// ──────────────────────────────────────────────────────────────────────────────
// Health Check — GET /health
// Useful for monitoring, load balancers, and verifying the server is running.
// ──────────────────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    activeSessions: sessions.size,
    uptime: process.uptime(),
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// POST /mcp — Handle JSON-RPC Requests (Streamable HTTP)
//
// This is the main endpoint Copilot Studio calls. Two cases:
// 1. Initialize request (no session yet) → create new session
// 2. Subsequent request (has Mcp-Session-Id) → route to existing session
// ──────────────────────────────────────────────────────────────────────────────
app.post('/mcp', async (req, res) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;

  // Case 1: Existing session — route to the right transport
  if (sessionId) {
    const session = sessions.get(sessionId);
    if (!session) {
      // Session expired or never existed
      res.status(404).json({
        jsonrpc: '2.0',
        error: { code: -32000, message: 'Session not found or expired' },
        id: null,
      });
      return;
    }
    session.lastActivity = Date.now();
    await session.transport.handleRequest(req, res, req.body);
    return;
  }

  // Case 2: No session ID — must be an initialize request
  if (!isInitializeRequest(req.body)) {
    // Non-initialize requests without a session ID are invalid
    res.status(400).json({
      jsonrpc: '2.0',
      error: { code: -32000, message: 'Missing Mcp-Session-Id header. Send an initialize request first.' },
      id: null,
    });
    return;
  }

  // Create a new session with its own McpServer instance
  const server = createMcpServer();
  const transport = new StreamableHTTPServerTransport({
    // Generate a unique, unguessable session ID
    sessionIdGenerator: () => randomUUID(),
    onsessioninitialized: (newSessionId) => {
      // Store the session once the MCP handshake completes
      sessions.set(newSessionId, {
        transport,
        server,
        lastActivity: Date.now(),
      });
      console.log(`[sessions] New session: ${newSessionId} (active: ${sessions.size})`);
    },
  });

  // Clean up when the transport closes
  transport.onclose = () => {
    if (transport.sessionId) {
      sessions.delete(transport.sessionId);
      console.log(`[sessions] Closed: ${transport.sessionId} (active: ${sessions.size})`);
    }
  };

  // Connect the MCP server to the transport and handle the request
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

// ──────────────────────────────────────────────────────────────────────────────
// GET /mcp — SSE Streaming (Session Resumability)
//
// Clients can open a GET connection to receive Server-Sent Events.
// This enables real-time streaming of responses and session resumability
// using the Last-Event-ID header.
// ──────────────────────────────────────────────────────────────────────────────
app.get('/mcp', async (req, res) => {
  const sessionId = req.headers['mcp-session-id'] as string;

  if (!sessionId || !sessions.has(sessionId)) {
    res.status(400).json({
      jsonrpc: '2.0',
      error: { code: -32000, message: 'Invalid or missing session ID' },
      id: null,
    });
    return;
  }

  const session = sessions.get(sessionId)!;
  session.lastActivity = Date.now();
  await session.transport.handleRequest(req, res);
});

// ──────────────────────────────────────────────────────────────────────────────
// DELETE /mcp — Explicit Session Cleanup
//
// Clients can explicitly end a session. This is cleaner than waiting
// for the idle timeout.
// ──────────────────────────────────────────────────────────────────────────────
app.delete('/mcp', async (req, res) => {
  const sessionId = req.headers['mcp-session-id'] as string;

  if (!sessionId || !sessions.has(sessionId)) {
    res.status(404).json({
      jsonrpc: '2.0',
      error: { code: -32000, message: 'Session not found' },
      id: null,
    });
    return;
  }

  const session = sessions.get(sessionId)!;
  session.transport.close?.();
  await session.server.close();
  sessions.delete(sessionId);
  console.log(`[sessions] Deleted: ${sessionId} (active: ${sessions.size})`);

  res.status(200).json({ status: 'session deleted' });
});

// ══════════════════════════════════════════════════════════════════════════════
// Start Server
// ══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, '127.0.0.1', () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                  MCP Server — Ready! 🚀                      ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  Endpoint:  http://127.0.0.1:${String(PORT).padEnd(5)}                          ║
║  MCP:       POST/GET/DELETE /mcp                             ║
║  Health:    GET /health                                      ║
║                                                              ║
║  Tools:     get-customer, search-orders, list-products    ║
║             create-order, approve-refund                     ║
║  Resources: product-catalog, customer-profile,               ║
║             refund-policy                                    ║
║  Prompts:   customer-summary, order-analysis                 ║
║                                                              ║
║  Next steps:                                                 ║
║  1. Test with MCP Inspector: npm run inspect                 ║
║  2. Expose via tunnel for Copilot Studio                     ║
║     See docs/03-local-development.md                         ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
  `);
});

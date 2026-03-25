/**
 * MCP Tool: list-products
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ WHY IS THIS A TOOL AND NOT JUST A RESOURCE?                        │
 * │                                                                     │
 * │ The product catalog data lives in a Resource (catalog://products),  │
 * │ but Copilot Studio doesn't call resources/list to discover          │
 * │ resources. Instead, it discovers them through TOOLS that return     │
 * │ resource_link items in their response.                              │
 * │                                                                     │
 * │ Pattern:                                                            │
 * │ 1. AI calls this tool → gets a resource_link to catalog://products │
 * │ 2. AI calls resources/read on that URI → gets the full catalog     │
 * │                                                                     │
 * │ This is the "resource_link" pattern — tools act as discovery        │
 * │ mechanisms for resources. See Microsoft's blog:                     │
 * │ https://microsoft.github.io/mcscatblog/posts/mcp-tools-resources/  │
 * │                                                                     │
 * │ The tool also returns a brief summary so the AI can decide          │
 * │ whether it needs the full catalog without another round trip.       │
 * └─────────────────────────────────────────────────────────────────────┘
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getAllProducts } from '../data/products.js';

const outputSchema = z.object({
  productCount: z.number(),
  categories: z.array(z.string()),
  summary: z.string(),
});

export function registerListProductsTool(server: McpServer) {
  server.registerTool(
    'list-products',
    {
      title: 'List Products',
      description:
        'Get an overview of the product catalog. Returns a summary and a resource link to the full catalog data.',
      inputSchema: z.object({}),
      outputSchema,
      annotations: {
        readOnlyHint: true,
      },
    },
    async () => {
      const products = getAllProducts();
      const categories = [...new Set(products.map((p) => p.category))];

      const result = {
        productCount: products.length,
        categories,
        summary: `${products.length} products across ${categories.length} categories: ${categories.join(', ')}`,
      };

      return {
        content: [
          {
            type: 'text' as const,
            text: result.summary,
          },
          // resource_link: tells the AI (and Copilot Studio) that the full
          // product catalog is available at this URI via resources/read.
          // Copilot Studio will follow this link to fetch the full data.
          {
            type: 'resource_link' as const,
            uri: 'catalog://products',
            name: 'Full Product Catalog',
            mimeType: 'application/json',
          },
        ],
        structuredContent: result,
      };
    }
  );
}

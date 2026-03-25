/**
 * MCP Resource: product-catalog
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ Resources vs. Tools — when to use which:                            │
 * │                                                                     │
 * │ RESOURCES are for READ-ONLY DATA the AI needs as context.           │
 * │ Think of them like files or documents the AI can reference.         │
 * │ They have a URI, a MIME type, and return content.                   │
 * │                                                                     │
 * │ TOOLS are for ACTIONS the AI performs with parameters.              │
 * │ Think of them like API endpoints the AI calls.                      │
 * │                                                                     │
 * │ This resource provides the full product catalog. The AI reads it    │
 * │ to understand what products are available — e.g., before helping    │
 * │ a user place an order, it can check prices and availability.        │
 * │                                                                     │
 * │ This is a STATIC resource: it has a fixed URI (catalog://products)  │
 * │ and always returns the same catalog data. Compare this with the     │
 * │ customer-profile resource, which is DYNAMIC (URI varies per         │
 * │ customer).                                                          │
 * └─────────────────────────────────────────────────────────────────────┘
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getAllProducts } from '../data/products.js';

export function registerProductCatalogResource(server: McpServer) {
  server.registerResource(
    // Name: unique identifier for this resource
    'product-catalog',

    // URI: the address clients use to request this resource.
    // Custom schemes (catalog://) are allowed in MCP. In production,
    // you might use https:// URIs pointing to real endpoints.
    'catalog://products',

    // Metadata: helps the AI understand what this resource contains
    {
      title: 'Product Catalog',
      description:
        'Complete list of available products with pricing, descriptions, and stock status. Use this to look up product details before creating orders.',
      mimeType: 'application/json',
    },

    // Handler: returns the resource content when requested
    async (uri) => {
      const products = getAllProducts();
      return {
        contents: [
          {
            uri: uri.href,
            text: JSON.stringify(products, null, 2),
          },
        ],
      };
    }
  );
}

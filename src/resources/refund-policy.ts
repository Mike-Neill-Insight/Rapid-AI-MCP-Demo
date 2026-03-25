/**
 * MCP Resource: refund-policy
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ This is the IDEAL use case for an MCP Resource:                     │
 * │ a static reference document that provides ambient context.          │
 * │                                                                     │
 * │ Unlike the product-catalog (structured data) or customer-profile    │
 * │ (entity lookup), this is a plain-text policy document. The AI       │
 * │ reads it when it needs to understand refund rules — for example,   │
 * │ before approving a refund or explaining the policy to a customer.   │
 * │                                                                     │
 * │ This resource is discovered by Copilot Studio through the           │
 * │ approve-refund tool, which returns a resource_link to this URI      │
 * │ alongside its response. The AI can then read the full policy.       │
 * └─────────────────────────────────────────────────────────────────────┘
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

const REFUND_POLICY = `
# Rapid AI — Refund Policy

**Effective Date**: January 1, 2025
**Last Updated**: January 1, 2025

## Eligibility

1. Refund requests must be submitted within **30 days** of the original order date.
2. Only orders with status "delivered" or "shipped" are eligible for refunds.
3. Orders that have already been refunded or cancelled are not eligible.

## Refund Amounts

- **Full refund**: Available within 14 days of order date for any reason.
- **Partial refund (75%)**: Available between 15–30 days of order date.
- **No refund**: After 30 days, refunds are not available.

## Process

1. Customer requests a refund through their account or support channel.
2. The system creates a refund request with status "refund-pending".
3. A support agent reviews and approves (or denies) the refund.
4. Approved refunds are processed within 5–7 business days.

## Exceptions

- Enterprise tier customers may request exceptions beyond the 30-day window.
  These require manager approval.
- Defective products are eligible for full refund regardless of timing.

## Contact

For refund questions, contact support@rapid-ai-demo.example.com.
`.trim();

export function registerRefundPolicyResource(server: McpServer) {
  server.registerResource(
    'refund-policy',

    // Static URI — this is a single document, not a parameterized template.
    'policy://refund',

    {
      title: 'Refund Policy',
      description:
        'Company refund policy including eligibility rules, refund amounts by time window, and the approval process.',
      mimeType: 'text/markdown',
    },

    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          text: REFUND_POLICY,
        },
      ],
    })
  );
}

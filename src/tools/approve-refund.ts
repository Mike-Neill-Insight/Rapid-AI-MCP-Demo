/**
 * MCP Tool: approve-refund
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ What the AI sees:                                                   │
 * │ A tool that approves a pending refund. This is a DESTRUCTIVE write  │
 * │ operation — once approved, the refund is processed and can't be     │
 * │ undone.                                                             │
 * │                                                                     │
 * │ This demonstrates governance / guardrails in MCP:                   │
 * │ - The tool annotation marks it as destructive                       │
 * │ - The tool validates the order is actually in 'refund-pending'      │
 * │   state before allowing the operation                               │
 * │ - In production, you might add additional authorization checks      │
 * │                                                                     │
 * │ During the demo, this shows that MCP tools can express risk levels  │
 * │ through annotations, helping the AI (and Copilot Studio) decide     │
 * │ whether to ask for user confirmation before proceeding.             │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * Tool annotations:
 * - readOnlyHint: false — modifies data
 * - destructiveHint: true — this is an irreversible operation
 * - idempotentHint: true — approving the same refund twice is a no-op (already refunded)
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { approveRefund, getOrderById } from '../data/orders.js';

const inputSchema = z.object({
  orderId: z
    .string()
    .describe('The order ID to approve the refund for (e.g., "ord-004"). Order must be in "refund-pending" status.'),
});

const outputSchema = z.object({
  orderId: z.string(),
  previousStatus: z.string(),
  newStatus: z.string(),
  refundAmount: z.number(),
  customerId: z.string(),
});

export function registerApproveRefundTool(server: McpServer) {
  server.registerTool(
    'approve-refund',
    {
      title: 'Approve Refund',
      description:
        'Approve a pending refund for an order. The order must be in "refund-pending" status. This is an irreversible operation — the refund will be processed.',
      inputSchema,
      outputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
      },
    },
    async ({ orderId }) => {
      // Check current state before attempting (for the "previousStatus" field)
      const currentOrder = getOrderById(orderId);

      const result = approveRefund(orderId);

      if ('error' in result) {
        return {
          isError: true,
          content: [
            { type: 'text' as const, text: result.error },
            // Include the refund policy link even on errors so the AI can
            // explain eligibility rules when a refund is rejected.
            {
              type: 'resource_link' as const,
              uri: 'policy://refund',
              name: 'Refund Policy',
              mimeType: 'text/markdown',
            },
          ],
        };
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: `✅ Refund approved for order ${result.id}.\n\nRefund amount: $${result.total.toFixed(2)}\nCustomer: ${result.customerId}\nPrevious status: refund-pending\nNew status: ${result.status}`,
          },
          // resource_link: the refund policy document provides context
          // about eligibility rules, time windows, and the approval process.
          // Copilot Studio can follow this link to ground its response.
          {
            type: 'resource_link' as const,
            uri: 'policy://refund',
            name: 'Refund Policy',
            mimeType: 'text/markdown',
          },
        ],
        structuredContent: {
          orderId: result.id,
          previousStatus: currentOrder?.status ?? 'refund-pending',
          newStatus: result.status,
          refundAmount: result.total,
          customerId: result.customerId,
        },
      };
    }
  );
}

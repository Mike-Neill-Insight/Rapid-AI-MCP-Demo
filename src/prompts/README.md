# MCP Prompts

**Prompts** are reusable prompt templates that guide the AI's response. They package data and instructions together.

Think of them like stored procedures for conversations — consistent, repeatable AI interactions.

## Prompts in this project

| Prompt | Args | Description |
|--------|------|-------------|
| `customer-summary` | `customerId` (required) | Summarize a customer's account health |
| `order-analysis` | `status` (optional) | Analyze orders with optional status filter |

## Key concepts demonstrated

- **argsSchema**: Define parameters using Zod shapes (not `z.object()` — the SDK wraps it)
- **Data + instructions**: Prompts fetch data and combine it with analysis instructions
- **Optional arguments**: `order-analysis` works with or without a status filter

## Prompts vs. Tools vs. Resources

- **Resources** provide DATA (what the AI knows)
- **Tools** provide ACTIONS (what the AI can do)
- **Prompts** provide INSTRUCTIONS (how the AI should respond)

## Learn more

- [MCP Prompts specification](https://modelcontextprotocol.io/specification/server/prompts)

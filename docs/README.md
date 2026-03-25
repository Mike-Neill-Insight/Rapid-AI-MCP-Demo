# Documentation

This folder contains the learning guides for the MCP Server Demo. Read them in numbered order for the best experience.

## Learning Path

| # | Guide | Description |
|---|-------|-------------|
| 01 | [What is MCP?](01-what-is-mcp.md) | Conceptual overview — the three primitives, transport, and Copilot Studio |
| 02 | [Architecture & Data Flow](02-architecture.md) | System diagrams, request lifecycle, session management |
| 03a | [Code Walkthrough](03a-code-walkthrough.md) | Annotated tour of every source file — what it does and why |
| 03 | [Local Development](03-local-development.md) | Setup, configuration, tunnels for Copilot Studio |
| 04 | [Testing](04-testing.md) | MCP Inspector, curl examples, troubleshooting |
| 05 | [Copilot Studio Setup](05-copilot-studio-setup.md) | Connect your server to Copilot Studio via custom connector |
| 06 | [Azure Deployment](06-azure-deployment.md) | Deploy to Azure Container Apps |
| 07 | [Exercises](07-exercises.md) | 4 hands-on exercises to extend the server |

## Exercise Cheat Sheets

Complete solutions for the exercises: [exercise-cheat-sheets/](exercise-cheat-sheets/)

## Source Code READMEs

Each source directory has its own README with domain-specific guidance:

- [`src/tools/README.md`](../src/tools/README.md) — Tool inventory, annotations, `resource_link` patterns
- [`src/resources/README.md`](../src/resources/README.md) — Resource types, discovery pattern, when to use resources vs. tools
- [`src/prompts/README.md`](../src/prompts/README.md) — Prompt patterns, `argsSchema` gotchas
- [`src/data/README.md`](../src/data/README.md) — Mock data layer, what's mutable vs. immutable

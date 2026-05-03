---
name: aspire-mcp-first
description: When the Aspire CLI MCP server is attached (mcp__aspire__* tools available) AND a .NET Aspire AppHost is running, query Aspire's MCP server for resource state, console logs, distributed traces, and resource commands BEFORE shelling out to docker logs, parsing log files, or guessing at endpoints. Situational — invoke when debugging a running Aspire app or when the user mentions log/health/trace investigation.
---

# Aspire MCP First

## When this skill applies

Use this skill when **all** of the following hold:
1. `mcp__aspire__*` tools are present in your tool list (the Aspire CLI MCP server is attached, typically via `<project-root>/.mcp.json` declaring `aspire agent mcp` as a stdio server, or via `aspire mcp init`)
2. The user is debugging, investigating, or asking about a running .NET Aspire application — service state, logs, traces, why something doesn't respond, why a health check fails, what endpoint a service is on
3. The Aspire AppHost is actually running (`aspire run`, `dotnet run --project AppHost`, or via Rider/VS run config). Without a running AppHost, the MCP server returns empty or refuses connections.

This skill is **situational**, not always-on like `rider-mcp-first`. Most coding sessions don't touch a running Aspire app. When they do, this skill applies hard.

## Why this matters

Without Aspire MCP, debugging a multi-service Aspire app means:
- `Bash docker logs <container>` — for each container, one at a time
- Reading log files at `obj/Aspire/...` — manual, partial
- Hand-correlating timestamps across services for a distributed trace
- Hunting for the dynamic port assigned to each resource

With Aspire MCP, all of those are single tool calls returning structured data, scoped to the live AppHost.

## Quick decision table

| Goal | Use Aspire MCP | NOT |
|---|---|---|
| What resources are running and healthy? | `mcp__aspire__*` (resource state listing) | Bash `docker ps`, manually parse Aspire dashboard URL |
| Real-time logs from a service | `mcp__aspire__*` (log tail / get_logs) | `Bash docker logs -f <name>` |
| Logs from ALL services correlated | `mcp__aspire__*` (cross-resource log query) | N parallel `docker logs` calls |
| Distributed trace for a request | `mcp__aspire__*` (trace query) | hand-correlate by timestamp/correlation-id across log files |
| What endpoint is service X on? | `mcp__aspire__*` (resource endpoints) | parse AppHost code, guess port |
| What Aspire integrations are available? | `mcp__aspire__*` (list integrations) | search NuGet, scan upstream docs |
| Trigger a resource-specific command | `mcp__aspire__*` (execute command) | manual restart via Aspire dashboard |

Note: exact tool names under `mcp__aspire__*` vary by Aspire CLI version (13.1+). Check your live tool list rather than guessing names — the operations above are the *capabilities*, naming may differ.

## When filesystem / shell tools are still right

- AppHost code edits — that's pure `.cs` source code work; if `mcp__rider__*` is attached, use Rider; otherwise filesystem tools
- Pre-AppHost-start config (e.g. inspecting `appsettings.json`) — Aspire MCP needs a running app to be useful
- Aspire CLI commands that aren't MCP-exposed (`aspire publish`, `aspire add`) — use `Bash`
- When AppHost is **not running** — Aspire MCP tools either won't appear or will error. Don't try to start the app yourself; ask the user or check if a "no AppHost detected" message comes back.

## Setup prerequisite

The Aspire MCP server is the `aspire agent mcp` subcommand of the Aspire CLI. For tools to appear:
1. Aspire CLI installed: `dotnet tool install -g Aspire.Cli` (or the equivalent for the user's Aspire version)
2. MCP registered, either:
   - **Project-scoped**: `<repo-root>/.mcp.json` includes an `aspire` server entry (`type: stdio`, `command: aspire`, `args: ["agent", "mcp"]`)
   - **User-scoped**: `aspire mcp init` from inside the AppHost project
3. The AppHost is running (or Aspire CLI can discover the most recent run). Without an AppHost, most queries return empty.

If the user reports `mcp__aspire__*` is missing in a Aspire-flavored project, the diagnosis is the same as for Rider: (1) is the CLI installed? (2) is `.mcp.json` registered? (3) is the AppHost actually running? Fall back to filesystem / `Bash docker logs` only after confirming the chain is broken.

## Anti-patterns (Red Flags)

| Thought | Reality |
|---|---|
| "I'll just `docker logs` it real quick" | Aspire MCP returns the same thing in one structured call, scoped to the resource you actually mean. `docker` requires you to know the container name and timing. |
| "Aspire MCP is for AI agents, I'll just check the dashboard" | The dashboard is for humans. You're an agent. Use the tools made for you. |
| "There's no MCP for this — let me write a custom Bash pipeline" | Check the actual `mcp__aspire__*` listing first. Aspire CLI 13.1+ covers most state queries. |
| "I'll grep AppHost.cs to find the port" | Ports are *dynamic* in Aspire — the value in code is the *requested* port, not the *actual* one. Always query the live MCP. |
| "The user didn't mention Aspire" | If `.mcp.json` declares `aspire` and `mcp__aspire__*` tools are present, the project IS Aspire-flavored. Treat any debugging question as Aspire-aware. |

## Cooperation with other dotlight skills

- `rider-mcp-first` — for source code work (`.cs` / `.vue` / etc), Rider wins. For *runtime* state, Aspire MCP wins. Use both side by side.
- `aspire-integration-testing` — when a test fails because a resource didn't come up, query Aspire MCP for that resource's actual state before assuming a test bug
- `aspire-service-defaults` — health endpoints map to Aspire resource health; use MCP to read the result, don't curl it manually
- `dotnet-performance-analyst` (agent) — when investigating prod-shape performance issues, distributed traces from Aspire MCP are the input

## One-line summary

**AppHost running + `mcp__aspire__*` present → ALL runtime questions go through Aspire MCP, not `docker logs` / log file reads / port guessing.**

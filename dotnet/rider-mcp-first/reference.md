# Rider MCP First — Reference

Details behind `SKILL.md`. Load when setting up, diagnosing a connection, or briefing subagents.

## Contents

1. [Setup prerequisite](#setup-prerequisite)
2. [Rider-not-attached gate — full protocol](#rider-not-attached-gate--full-protocol)
3. [projectPath — examples and multi-project diagnosis](#projectpath--examples-and-multi-project-diagnosis)
4. [Token math](#token-math)
5. [Cooperation with other dotlight skills](#cooperation-with-other-dotlight-skills)

## Setup prerequisite

The Rider MCP server runs **inside** the Rider IDE process. Claude Code does not launch it; it connects to it. For `mcp__rider__*` tools to appear:

1. **Rider IDE must be open** with the target solution loaded
2. The JetBrains MCP plugin must be enabled (default in Rider 2025.x+)
3. The project must register the MCP endpoint via `<project-root>/.mcp.json`, or user-scoped via `~/.claude.json` `mcpServers`

If the user reports `mcp__rider__*` is missing, diagnose in order: (1) is Rider open? (2) is the solution actually loaded in Rider? (3) does the registered endpoint URL match what Rider exposes? (typically `http://127.0.0.1:64342/stream` for newer JetBrains MCP, `/sse` for older).

**Context-cost note:** an attached MCP server loads its full tool schema into every session (~10–20K tokens) whether used or not. Rider MCP pays for itself on any .NET session; register it project-scoped (`.mcp.json` in the .NET repos) rather than user-scoped, so non-.NET projects don't carry the schema. The same applies to the Aspire MCP server (`aspire-mcp-first`).

## Rider-not-attached gate — full protocol

Why the gate exists: a typical .NET exploration session burns **30–80K tokens** through filesystem fallback (multi-project Grep, full-file Reads, repeated globs). The user often has Rider available — they just need to open it or load the right solution. Silent fallback means the user pays the bill before noticing. One question prevents the leak.

Ask via `AskUserQuestion` (preload via ToolSearch `"select:AskUserQuestion"` once per session — deferred tool; fall back to a tight text question if unavailable, but **still ask, never proceed silently**). Three options, in this order:

1. **(Recommended) "I'll open Rider — give me a moment"** — wait for confirmation, re-scan the tool list, proceed with full Rider discipline. Saves 50–90% of session tokens.
2. **"Proceed with filesystem — much more expensive"** — explicit opt-in to the leak (~30–80K tokens vs ~5–15K with Rider). Proceed without further pestering.
3. **"Skip the .NET work for now"** — exit gracefully.

**Persistence:** honor the answer for the whole session; do not re-ask per operation. "Stop asking about Rider" = permanent session opt-out.

**Subagent dispatch with no Rider:** resolve the gate WITH THE USER first in the parent session — subagents have no back-channel and will silently filesystem-fallback. Then brief the subagent explicitly:

- *"User has opened Rider — `projectPath=<value from get_solution_projects>`. Use `mcp__rider__*` for all .NET file ops."* (option 1)
- *"User has opted into filesystem fallback for this session. Use `Grep` / `Read` / `Edit` — Rider is not available."* (option 2)

## projectPath — examples and multi-project diagnosis

`projectPath` is the **solution folder** (directory containing `.sln`/`.slnx`):

- ✅ `c:/Pool/laisa2/Solution` (contains `LAISA.slnx`)
- ❌ `c:/Pool/laisa2` (repo root — *"doesn't correspond to any open project"*)
- ❌ `c:/Pool/laisa2/Solution/LAISA.AppHost` (subproject — same error)
- ❌ `c:/Pool/<guessed-from-prefix>` (hallucinated path — same error, wasted call)

**Multi-project workflows.** With several .NET repos (e.g. `c:/Pool/laisa2`, `c:/Pool/projector`), Rider may have only **one** loaded — the MCP server is per-Rider-instance. A correct `projectPath` for the repo you're in still fails if Rider has a *different* solution open. That is a **runtime state mismatch, not a path-guessing bug**:

1. Call `mcp__rider__get_solution_projects` (no `projectPath` needed) to see what Rider actually has loaded
2. Wrong solution → tell the user explicitly: *"Rider has `<X>` loaded, but this session is in `<Y>`. Open `<Y>` in Rider and I'll be 50–90% more efficient. Until then, falling back to filesystem tools."*
3. Don't loop retrying the same `projectPath` — the user has to switch Rider's loaded solution

Falling back to filesystem when the WRONG solution is loaded is a legitimate diagnosis, not the Red-Flag rationalization. The Red Flag is falling back when Rider IS attached to the right solution.

## Token math

A typical "explore the auth flow" session in a 50-class .NET solution:

| Strategy | Calls | Approx tokens |
|---|---|---|
| Pure filesystem | ~30× `Grep` + ~15× `Read` | ~120 000 |
| Rider MCP first | ~5× `search_symbol` + ~3× `find_references` + ~5× `read_file` | ~15 000 |

**Saving: ~105 000 tokens per exploration session** — ~50% of a 200K context window, repeated across every .NET session.

## Cooperation with other dotlight skills

- `aspire-integration-testing` — Rider runs the test project via `execute_run_configuration` and streams results
- `efcore-patterns` / `database-performance` / `database-design-conventions` / `database-review` — Rider DB introspection (`list_database_*`, `execute_sql_query`) replaces external `psql`; inspect the ACTUAL schema before proposing changes
- `csharp-api-design` / `csharp-type-design-performance` — `search_symbol` to find existing API surface before extending
- `dotnet-performance-analyst` (agent) — Rider launches dotTrace / dotMemory via run configurations
- `executing-plans` — when a plan task says "modify class X": `search_symbol` to locate, then `read_file` / `replace_text_in_file`

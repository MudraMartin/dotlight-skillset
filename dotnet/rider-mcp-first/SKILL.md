---
name: rider-mcp-first
description: When working in a .NET solution with the JetBrains Rider MCP server attached (mcp__rider__* tools available), use Rider's semantic operations BEFORE filesystem Grep/Read/Edit. Saves 50-90% of context tokens on .NET exploration tasks.
---

# Rider MCP First

<EXTREMELY-IMPORTANT>
If `mcp__rider__*` tools are available in your tool list AND you are working with C# / .NET / `.csproj` / `.sln` / `.slnx` files, you ABSOLUTELY MUST prefer them over `Grep` / `Read` / `Glob` / `Edit` for code operations.

Filesystem tools answer **"what bytes are here?"**. Rider tools answer **"what does this code MEAN?"** — and the second is what you actually need 90% of the time when navigating .NET code.

This is not negotiable. Defaulting to Grep/Read in a Rider-attached session burns the user's tokens for zero benefit. The Rider MCP server has a pre-built ReSharper semantic index — your search query returns the answer, not 50 KB of file contents to scan.

**Before your first .NET file operation in any session: scan your tool list for `mcp__rider__*`. If present, follow this skill. If absent, proceed with filesystem tools and tell the user "Rider MCP not attached — open Rider on the solution and I'll be 50–90% more efficient."**
</EXTREMELY-IMPORTANT>

## Quick decision table

| Goal | Use Rider tool | NOT |
|---|---|---|
| Find class / method / property by name | `mcp__rider__search_symbol` | `Grep "class Foo"` |
| Where is X used? (call sites, references) | `mcp__rider__find_references` | `Grep "Foo("` then read every hit |
| What members does class Z have? | `mcp__rider__get_symbol_info` | `Read Z.cs` then scroll |
| Rename `IFoo` → `IBar` solution-wide | `mcp__rider__rename_refactoring` | 30× `Edit` |
| Move type to namespace | `mcp__rider__move_type_to_namespace` | `Edit` (breaks references) |
| What projects depend on what? | `mcp__rider__get_project_dependencies` | parse `.csproj` files manually |
| List solution projects | `mcp__rider__get_solution_projects` | `Glob "**/*.csproj"` then read |
| Find file by name/keyword | `mcp__rider__find_files_by_name_keyword` | `Glob "**/*Foo*.cs"` |
| Find file by glob | `mcp__rider__find_files_by_glob` | `Glob` *(both fine, prefer Rider for in-solution)* |
| Search text in C# files | `mcp__rider__search_in_files_by_regex` / `_by_text` | `Grep` *(prefer Rider — scoped to solution, semantic-aware)* |
| Read .cs file | `mcp__rider__read_file` | `Read` *(equivalent — either works)* |
| Edit .cs file | `mcp__rider__replace_text_in_file` | `Edit` *(both fine; Rider also runs format-on-save)* |
| Reformat file after edits | `mcp__rider__reformat_file` | manual whitespace fixing |
| Check file for compile errors | `mcp__rider__get_file_problems` | `Bash dotnet build` *(faster — file-scoped)* |
| Build solution | `mcp__rider__build_solution` | `Bash dotnet build` *(both work)* |
| Run app / tests | `mcp__rider__execute_run_configuration` | `Bash dotnet run/test` |
| Inspect DB tables / run SQL | `mcp__rider__execute_sql_query`, `preview_table_data`, `list_database_*` | `Bash psql` |
| Custom code inspection | `mcp__rider__run_inspection_kts` (+ `_api`/`_examples`) | not available via filesystem |
| Semantic tree of file | `mcp__rider__generate_psi_tree` | not available via filesystem |

## When filesystem tools are still right

Rider doesn't index everything. For these, default to `Grep` / `Read` / `Glob` / `Edit`:

- Non-code files: `.md`, `.json`, `.yml`, `.yaml`, `.toml`, `.razor`, `.vue`, `.ts`, `.js`, `.scss`
- Files outside the solution folder: docs, specs, repo-root config, `Resources/`, `experiments/`
- Cross-cutting text search across mixed file types (e.g. "find every TODO across the whole repo regardless of language")
- Quick existence checks where you don't need semantic info
- Anything in `.git/`, `node_modules/`, `bin/`, `obj/`
- When `mcp__rider__*` is **not** in your tool list (Rider closed, plugin disabled, MCP misconfigured) — fall back without shame

## Setup prerequisite

The Rider MCP server runs **inside** the Rider IDE process. Claude Code does not launch it; it connects to it. For `mcp__rider__*` tools to appear:

1. **Rider IDE must be open** with the target solution loaded
2. The JetBrains MCP plugin must be enabled (default in Rider 2025.x+)
3. The project must register the MCP endpoint via `<project-root>/.mcp.json`, or user-scoped via `~/.claude.json` `mcpServers`

If the user reports `mcp__rider__*` is missing, the diagnosis order is: (1) is Rider open? (2) is the solution actually loaded in Rider? (3) does the registered endpoint URL match what Rider exposes? (typically `http://127.0.0.1:64342/stream` for newer JetBrains MCP, `/sse` for older)

## projectPath quirk

For Rider MCP tools, `projectPath` is the **solution folder** (the directory containing `.sln` or `.slnx`), not the repo root.

- ✅ `c:/Pool/laisa2/Solution` (contains `LAISA.slnx`)
- ❌ `c:/Pool/laisa2` (repo root — Rider returns errors)

When in doubt, run `mcp__rider__get_solution_projects` first to confirm the solution is loaded.

## Red Flags — STOP if you think:

| Thought | Reality |
|---|---|
| "I'll just `Grep` this real quick" | Did you check if Rider is attached? `search_symbol` is faster AND saves the user's tokens. |
| "`Read` is more familiar" | Familiarity ≠ correct. The user pays for context, not for your comfort. |
| "Rider might not have indexed this" | It's a ReSharper index of an open solution. Of course it has. Try first, fall back if it actually fails. |
| "Just one `Grep`, won't hurt" | Each `Grep` on a .NET solution averages 5–30 KB of context. `search_symbol` returns ~100 tokens. Compounds across a session. |
| "Filesystem is more reliable" | Both are reliable. Rider is dramatically cheaper. |
| "I need to see the whole file anyway" | No, you usually need a class definition, a method, or a usage list. Those are semantic operations. |
| "I'll batch a few `Grep`s in parallel" | Two parallel `Grep`s on a large solution = 60 KB of context. One `find_references` = 200 tokens. Math wins. |

## Token math (why this skill exists)

A typical "explore the auth flow" session in a 50-class .NET solution:

| Strategy | Calls | Approx tokens |
|---|---|---|
| Pure filesystem | ~30× `Grep` + ~15× `Read` | ~120 000 |
| Rider MCP first | ~5× `search_symbol` + ~3× `find_references` + ~5× `read_file` | ~15 000 |

**Saving: ~105 000 tokens per exploration session.** That's ~50 % of a 200 K context window, or ~10 % of a 1 M window. Repeated across every .NET session in a project.

## Cooperation with other dotlight skills

- `aspire-integration-testing` — Rider can run the test project via `execute_run_configuration` and stream results
- `efcore-patterns` / `database-performance` — Rider DB introspection (`list_database_*`, `execute_sql_query`) replaces external `psql`
- `csharp-api-design` / `csharp-type-design-performance` — `search_symbol` to find existing API surface before extending
- `dotnet-performance-analyst` (agent) — Rider can launch dotTrace / dotMemory via run configurations
- `executing-plans` — when a plan task says "modify class X", use `search_symbol` to locate it, then `read_file` / `replace_text_in_file`

## One-line summary

**Open Rider → Claude saves 50–90% of context tokens on .NET work. This skill exists to keep that benefit from being thrown away by reflexive `Grep` / `Read`.**

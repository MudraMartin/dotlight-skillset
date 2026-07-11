---
name: rider-mcp-first
description: MANDATORY before ANY Grep/Read/Glob/Edit on files inside a .NET solution folder when mcp__rider__* tools are in the tool list — Rider semantic ops save 50–90% of exploration tokens. Invoke at session start AND at first sign of any .NET file work, not just when "exploring".
---

# Rider MCP First

<EXTREMELY-IMPORTANT>
**STOP. Before reading further, scan your current tool list for any tool name starting with `mcp__rider__`.**

- **If present** → you ABSOLUTELY MUST follow this skill for every file operation inside the solution folder. Reflexive `Grep` / `Read` / `Glob` / `Edit` on anything inside the solution (`.cs`, `.csproj`, `.sln`, `.slnx`, `.vue`, `.ts`, `.razor`, `.scss`, `.json`, …) is a token leak. No exceptions for "this one's quick", "I'm just confirming", or "I'm more comfortable with Grep". The user pays for every wasted token.
- **If absent** → **STOP and ask the user before any .NET file operation.** Do NOT silently fall back to filesystem — that is exactly the leak this skill exists to prevent. See the **Rider-not-attached gate** below.

This skill is rigid, not flexible. The model has a strong reflex to fall back to `Grep` / `Read` because they are familiar. **That reflex is the bug this skill exists to suppress.** Filesystem tools answer "what bytes are here?". Rider tools answer "what does this code MEAN?" — and the second is what you actually need 90% of the time. The Rider MCP server has a pre-built ReSharper semantic index; your query returns ~100 tokens of answer instead of ~30 KB of file contents to scan.

**Per-call gate.** Before *every single* `Grep` / `Read` / `Glob` / `Edit` call you are about to make, ask yourself: *"Is the target inside the solution folder, and is `mcp__rider__*` in my tool list?"* If yes to both, **switch to the Rider equivalent** (table below). This check takes one cheap thought; skipping it costs the user thousands of tokens.

**The gate runs every call — including after you've already drifted.** If you notice mid-session that you've used filesystem tools on solution files without checking, do NOT rationalize "consistency" or "let me finish out the current sub-task in filesystem and switch later." Switch to Rider on the *very next call*. Path-dependence is the most expensive rationalization in this skill — see the matching Red Flag row below.
</EXTREMELY-IMPORTANT>

## Rider-not-attached gate (CRITICAL — prevents silent token leak)

When `mcp__rider__*` is **absent** and the task involves .NET file operations inside a solution folder, **DO NOT silently fall back to `Grep` / `Read` / `Glob` / `Edit`.** Before your first .NET file operation, ask the user via `AskUserQuestion` (preload via ToolSearch `"select:AskUserQuestion"` once per session — deferred tool; if unavailable, ask as a tight text question, but **still ask**):

1. **(Recommended) "I'll open Rider — give me a moment"** — wait, re-scan the tool list, proceed with Rider discipline (saves 50–90% of session tokens)
2. **"Proceed with filesystem — much more expensive"** — explicit opt-in (~30–80K tokens vs ~5–15K with Rider); proceed without further pestering
3. **"Skip the .NET work for now"** — exit gracefully

Honor the answer for the whole session — no re-asking. **Dispatching a subagent while Rider is absent: resolve this gate with the user FIRST**, then brief the subagent with the outcome. Full protocol and briefing templates: [reference.md](reference.md).

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

## Two-layer model: semantic vs text

Rider MCP exposes **two layers** — the fallback rule differs per layer:

- **Layer 1 — Semantic** (`search_symbol`, `get_symbol_info`, `find_references`, `rename_refactoring`, `move_type_to_namespace`, `generate_psi_tree`): typed, language-aware. C#/F#/Razor always (ReSharper); TypeScript/JavaScript always (bundled plugin); Vue only with the JetBrains Vue plugin installed.
- **Layer 2 — Text/glob** (`find_files_by_*`, `search_in_files_by_*`, `read_file`, `replace_text_in_file`, `list_directory_tree`): work on **any file in the solution folder** — `.vue`, `.ts`, `.scss`, `.md`, `.json`, anything. Solution-scoped, dedup'd, no `node_modules`/`bin`/`obj` noise — **better than raw `Grep` even for non-C# files.**

## When filesystem tools are still right

- **Files outside the solution folder** — repo-root docs, top-level config not part of any project (Rider's index is solution-scoped)
- **Cross-repo or cross-solution search**
- **Rider not attached** — after the gate above has been resolved with the user
- **Trivially fast existence check** for a single known path

For *anything else*, including `.vue` / `.ts` / `.scss` inside the solution: prefer the Layer-2 Rider tools over `Grep` and `Glob`.

## projectPath discipline (most common failure)

`projectPath` is the **solution folder** (the directory containing `.sln`/`.slnx`) — not the repo root, not a subproject, not your cwd. Three rules:

1. **Always pass `projectPath` explicitly** in every call that accepts it — Rider cannot infer it, and an unspecified call fails like a wrong one.
2. **When unsure, discover before guessing:** `mcp__rider__get_solution_projects` lists what Rider has loaded. One result → that's your `projectPath`. Multiple → ask the user. Zero → Rider has no solution loaded; stop using Rider tools until the user confirms.
3. **The project's `CLAUDE.md` documents the canonical `projectPath`** — treat it as authoritative; don't extrapolate from other repos.

**Subagent dispatch rule:** any subagent brief that involves Rider MCP **MUST state the `projectPath` value explicitly** (e.g. *"Use `projectPath=c:/Pool/laisa2/Solution` for all Rider MCP calls"*). Subagents don't inherit cwd or context; without the value they guess wrong or drift to filesystem — the single most common Rider MCP failure mode in practice.

Wrong-path examples and the multi-project "wrong solution loaded" diagnosis (runtime state mismatch, not a path bug): [reference.md](reference.md).

## Red Flags — STOP if you think:

| Thought | Reality |
|---|---|
| "I'll just `Grep` this real quick" | Did you check if Rider is attached? `search_symbol` is faster AND saves the user's tokens. |
| "I'll just `Read` this real quick" | Same trap as `Grep`, just one tool over. `mcp__rider__read_file` returns the same content but is solution-scoped and dedup'd. The "real quick" framing is the leak — every call adds 5–30 KB of context. The `Read`-variant is named explicitly because the model often pattern-matches the `Grep` row and thinks `Read` for one file is different. It isn't. |
| "I've already been using filesystem this session — switching to Rider mid-stream would be inconsistent / churn / break the established pattern" | **Path-dependence is the leak amplifier and the most expensive rationalization in this skill.** Each filesystem call after the first inherits the precedent and gets justified retroactively. The moment you notice you drifted, switch to Rider on the *very next call* — do not "finish out the current sub-task" for consistency. Sunk-cost reasoning applied to context tokens is just throwing more tokens after wasted ones. There is no consistency-tax for switching tools mid-stream; the user pays nothing for that. They do pay, per call, for staying drifted. |
| "`Read` is more familiar" | Familiarity ≠ correct. The user pays for context, not for your comfort. |
| "Rider might not have indexed this" | It's a ReSharper index of an open solution. Of course it has. Try first, fall back if it actually fails. |
| "Just one `Grep`, won't hurt" | Each `Grep` on a .NET solution averages 5–30 KB of context. `search_symbol` returns ~100 tokens. Compounds across a session. |
| "Filesystem is more reliable" | Both are reliable. Rider is dramatically cheaper. |
| "I need to see the whole file anyway" | No, you usually need a class definition, a method, or a usage list. Those are semantic operations. |
| "I'll batch a few `Grep`s in parallel" | Two parallel `Grep`s on a large solution = 60 KB of context. One `find_references` = 200 tokens. Math wins. |
| "Rider doesn't index `.vue` / `.ts` / `.scss`, I'll use `Grep`" | **False dichotomy.** Semantic ops may have limited coverage without the right language plugin — but **Layer-2 text ops work on every file in the solution folder**. Use the text tools, not `Grep`. |
| "It's a non-C# file, the skill doesn't apply" | The skill applies to **everything inside the solution folder**, regardless of language. Only step out of Rider for files genuinely outside the solution scope. |

## Setup, token math, cooperation notes

Setup prerequisites (Rider open, MCP plugin, `.mcp.json` endpoint), the not-attached diagnosis order, MCP schema context-cost note, full token math, and cooperation with other dotlight skills: [reference.md](reference.md).

## One-line summary

**Open Rider → Claude saves 50–90% of context tokens on .NET work. This skill exists to keep that benefit from being thrown away by reflexive `Grep` / `Read`.**

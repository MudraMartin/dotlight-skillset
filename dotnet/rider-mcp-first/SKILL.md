---
name: rider-mcp-first
description: MANDATORY before ANY Grep/Read/Glob/Edit on files inside a .NET solution folder (.cs, .csproj, .sln, .slnx, .vue, .ts, .razor, .scss, .json) when mcp__rider__* tools exist in the tool list. Skipping this skill in a Rider-attached session wastes 5-10x the tokens on every file operation. Invoke at session start AND at first sign of any .NET file work — not just when "exploring."
---

# Rider MCP First

<EXTREMELY-IMPORTANT>
**STOP. Before reading further, scan your current tool list for any tool name starting with `mcp__rider__`.**

- **If present** → you ABSOLUTELY MUST follow this skill for every file operation inside the solution folder. Reflexive `Grep` / `Read` / `Glob` / `Edit` on `.cs`, `.csproj`, `.sln`, `.slnx`, `.vue`, `.ts`, `.razor`, `.scss`, `.json` (when inside the solution) is a token leak. No exceptions for "this one's quick", "I'm just confirming", or "I'm more comfortable with Grep". The user pays for every wasted token.
- **If absent** → **STOP and ask the user before any .NET file operation.** Do NOT silently fall back to filesystem — that is exactly the leak this skill exists to prevent. See the **Rider-not-attached gate** below.

This skill is rigid, not flexible. The model has a strong reflex to fall back to `Grep` / `Read` because they are familiar. **That reflex is the bug this skill exists to suppress.** Filesystem tools answer "what bytes are here?". Rider tools answer "what does this code MEAN?" — and the second is what you actually need 90% of the time. The Rider MCP server has a pre-built ReSharper semantic index; your query returns ~100 tokens of answer instead of ~30 KB of file contents to scan.

**Per-call gate.** Before *every single* `Grep` / `Read` / `Glob` / `Edit` call you are about to make, ask yourself: *"Is the target inside the solution folder, and is `mcp__rider__*` in my tool list?"* If yes to both, **switch to the Rider equivalent** (table below). This check takes one cheap thought; skipping it costs the user thousands of tokens.
</EXTREMELY-IMPORTANT>

## Rider-not-attached gate (CRITICAL — prevents silent token leak)

When `mcp__rider__*` is **absent** from your tool list and the user has asked anything that involves .NET file operations (read, search, edit, refactor of `.cs` / `.csproj` / `.sln` / `.slnx` / `.vue` / `.ts` / `.razor` / `.scss` / `.json` inside the solution folder), **DO NOT silently fall back to `Grep` / `Read` / `Glob` / `Edit`**. Stop and ask the user — explicitly, clickable — what they want.

### Why this matters

A typical .NET exploration session burns **30–80K tokens** through filesystem fallback (multi-project Grep, full-file Reads to find one method, repeated globs to map the project layout). The user often has Rider running already — they just need to load the right solution, or the user just forgot. Silent fallback means the user pays the bill before noticing. **One question prevents the leak.**

### The gate — implementation

Before your first .NET file operation in the session, if `mcp__rider__*` is absent, ask the user via `AskUserQuestion` (preload it first if it's a deferred tool — see the `AskUserQuestion` preload note below). Three options, in this exact order:

1. **(Recommended) "I'll open Rider — give me a moment"** — wait for the user to confirm Rider is open, then re-scan your tool list for `mcp__rider__*`. If now present, proceed with full Rider discipline. **Saves 50–90% of context tokens for the rest of the session.**
2. **"Proceed with filesystem (`Grep` / `Read` / `Edit`) — much more expensive"** — explicit user opt-in to the leak. Proceed without further pestering. *Cost estimate: 30–80K tokens for typical exploration vs ~5–15K with Rider attached.*
3. **"Skip the .NET work for now"** — exit gracefully, do not proceed with file operations. Useful when the user wants to reconsider or do something else first.

If `AskUserQuestion` is unavailable (preload failed, deferred-tool list not loaded, or older Claude Code), fall back to a tight text question with the same three options — but **still ask, do not proceed silently**.

### AskUserQuestion preload (Claude Code 2.x+)

`AskUserQuestion` may be a *deferred* tool — listed in a `<system-reminder>` block but with its parameter schema not loaded by default. If so, calling it directly fails with `InputValidationError` and you'll fall back to text "1, 2, 3" lists, which the user has to read instead of clicking.

**Before invoking the gate, call `ToolSearch` with query `"select:AskUserQuestion"` once per session.** No-op if already loaded or not deferred.

### Persistence — don't pester

Once the user has answered the gate, **honor the choice for the rest of the session.** Do not re-ask on every operation. If the user picked option 2 ("proceed with filesystem"), they know what they're paying for; respect that and proceed. If they picked option 1, re-scan tool list once they confirm Rider is open and proceed with Rider discipline.

If the user explicitly says "stop asking about Rider" or similar, treat that as permanent opt-out for the session.

### Subagent dispatch with no Rider

If you are about to dispatch a subagent that will work on .NET files but `mcp__rider__*` is absent, **resolve the gate WITH THE USER FIRST in the parent session** — subagents don't have a back-channel to the user, and they will silently filesystem-fallback if asked. Once the user has chosen, brief the subagent in the dispatch prompt:

- *"User has opened Rider — `projectPath=<value from get_solution_projects>`. Use `mcp__rider__*` for all .NET file ops."* (option 1)
- *"User has opted into filesystem fallback for this session. Use `Grep` / `Read` / `Edit` — Rider is not available."* (option 2)

Without explicit briefing, the subagent will guess and probably leak.

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

Rider MCP exposes **two layers** of operations. Don't conflate them — the rule for falling back to filesystem is different for each.

**Layer 1 — Semantic (typed, language-aware).** Backed by IDE language plugins / PSI index.
- C# / F# / Razor — always available (ReSharper)
- TypeScript / JavaScript — always available (JS plugin is bundled)
- Vue components, props, emits, refs — **only if the JetBrains Vue plugin is installed** in Rider. Pre-installed in newer Rider builds, not guaranteed
- Tools affected: `search_symbol`, `get_symbol_info`, `find_references`, `rename_refactoring`, `move_type_to_namespace`, `generate_psi_tree`

**Layer 2 — Text / glob (works on any file in the solution folder).** Backed by IDE file index, not language semantics.
- Tools affected: `find_files_by_glob`, `find_files_by_name_keyword`, `search_in_files_by_regex`, `search_in_files_by_text`, `read_file`, `replace_text_in_file`, `list_directory_tree`
- These work on **`.vue`, `.ts`, `.js`, `.scss`, `.md`, `.json`, `.yml`** — anything in the solution folder. They are **scoped to the solution and respect IDE excludes** (no `node_modules/`, `bin/`, `obj/` noise), so they remain better than raw `Grep` even for non-C# files.

## When filesystem tools are still right

Default to `Grep` / `Read` / `Glob` / `Edit` only when:

- **Files outside the solution folder** — repo-root docs (`docs/`, `Resources/`, `experiments/`), top-level config that isn't part of any project. Rider's index is solution-scoped; for everything outside, filesystem wins.
- **Cross-repo or cross-solution search** spanning multiple solution folders or external worktrees.
- **Rider not attached** — `mcp__rider__*` absent from your tool list (Rider closed, plugin disabled, MCP misconfigured). Fall back without shame.
- **Trivially fast existence check** for a single known path where loading any tool is overkill.

For *anything else*, including `.vue` / `.ts` / `.scss` inside the solution: prefer `mcp__rider__search_in_files_by_*` and `mcp__rider__find_files_by_*` over `Grep` and `Glob`. They are scoped, deduped, and faster.

## Setup prerequisite

The Rider MCP server runs **inside** the Rider IDE process. Claude Code does not launch it; it connects to it. For `mcp__rider__*` tools to appear:

1. **Rider IDE must be open** with the target solution loaded
2. The JetBrains MCP plugin must be enabled (default in Rider 2025.x+)
3. The project must register the MCP endpoint via `<project-root>/.mcp.json`, or user-scoped via `~/.claude.json` `mcpServers`

If the user reports `mcp__rider__*` is missing, the diagnosis order is: (1) is Rider open? (2) is the solution actually loaded in Rider? (3) does the registered endpoint URL match what Rider exposes? (typically `http://127.0.0.1:64342/stream` for newer JetBrains MCP, `/sse` for older)

## projectPath discipline (read this carefully — most common failure)

For Rider MCP tools, `projectPath` is the **solution folder** (the directory containing `.sln` or `.slnx`), not the repo root, not a subproject folder, not the cwd of your shell.

- ✅ `c:/Pool/laisa2/Solution` (contains `LAISA.slnx`)
- ❌ `c:/Pool/laisa2` (repo root — Rider returns *"doesn't correspond to any open project"*)
- ❌ `c:/Pool/laisa2/Solution/LAISA.AppHost` (subproject — same error)
- ❌ `c:/Pool/<guessed-from-prefix>` (hallucinated path — same error and a wasted tool call)

### Three rules

1. **Always pass `projectPath` explicitly** in every `mcp__rider__*` call that accepts it. Do NOT rely on Rider to infer it from your cwd or the conversation context — it can't, and an unspecified call fails the same way as a wrong one.
2. **When unsure, discover before guessing.** Call `mcp__rider__get_solution_projects` first — it returns the list of solutions currently loaded in Rider. One result → that's your `projectPath`. Multiple → ask the user. Zero → Rider has no solution loaded; ask the user to open one and stop using Rider tools until they confirm.
3. **The canonical `projectPath` is documented in the project's `CLAUDE.md`** — check there first. Common patterns: `c:/Pool/<repo>/Solution`, `c:/Pool/<repo>/src`, `c:/Pool/<repo>` (only when `.sln` is at repo root). Treat the value in `CLAUDE.md` as authoritative; don't extrapolate from other repos.

### Multi-project workflows

If the user works on multiple .NET projects (e.g. `c:/Pool/laisa2`, `c:/Pool/projector`, `c:/Pool/foo`), Rider may have only **one** of them loaded at a time — the MCP server is per-Rider-instance. When the project under cwd is correct (`projectPath=c:/Pool/projector`) but Rider is currently open on a *different* solution (e.g. laisa2), every Rider call fails with *"doesn't correspond to any open project"* even though the path itself is right.

This is **not a path-guessing bug** — it's a **runtime state mismatch**. The fix is not to retry with a different path; it's to:

1. Call `mcp__rider__get_solution_projects` (no `projectPath` needed) to see what Rider actually has loaded right now
2. If it's the wrong solution, tell the user explicitly: *"Rider has `<X>` loaded, but this session is in `<Y>`. Open `<Y>` in Rider (or a second Rider instance) and I'll be 50–90% more efficient. Until then, falling back to filesystem tools."*
3. Don't loop retrying the same `projectPath` hoping it'll suddenly work — the user has to switch Rider's loaded solution

This also means in multi-project workflows, the skill SHOULD fall back to filesystem when the wrong Rider is loaded — that's not the rationalization Red Flag (below), it's a legitimate diagnosis. The Red Flag is falling back when Rider IS attached to the right solution.

### Subagent dispatch rule

When you dispatch a subagent (via the `Agent` tool with `subagent_type=Explore` or any other type) that will use `mcp__rider__*` tools, **the dispatch prompt MUST include the `projectPath` value explicitly** — e.g. *"Use `projectPath=c:/Pool/laisa2/Solution` for all Rider MCP calls."*

The subagent does NOT inherit cwd or conversational context from the parent — it only sees the prompt you write. Without an explicit `projectPath`, it will:
- Either guess based on a fragment of context it does see (often wrong) and burn tool calls on `"doesn't correspond to any open project"` errors
- Or rationalize its way to filesystem `Grep` / `Read` (the exact regression this skill exists to suppress — see Red Flags below)

This is the single most common Rider MCP failure mode reported in practice. Cost is small individually (one wasted tool call per attempt), large in aggregate when subagents fall back to filesystem.

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
| "Rider doesn't index `.vue` / `.ts` / `.scss`, I'll use `Grep`" | **False dichotomy.** Semantic ops (`search_symbol`, `find_references`) may have limited coverage for those without the right language plugin — but **text ops (`search_in_files_by_*`, `find_files_by_*`, `read_file`) work on every file in the solution folder** and are still solution-scoped, dedup'd, and `node_modules`/`bin`/`obj`-free. Use the text tools, not `Grep`. |
| "It's a non-C# file, the skill doesn't apply" | The skill applies to **everything inside the solution folder**, regardless of language. Only step out of Rider for files genuinely outside the solution scope. |

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

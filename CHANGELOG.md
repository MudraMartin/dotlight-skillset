# Changelog

All notable changes to DotLightSkillset will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.5.1] — 2026-05-04

### Fixed — `rider-mcp-first` projectPath discipline

The 0.4.x skill was correct that `projectPath` is the solution folder, not the repo root, but it didn't say strongly enough that `projectPath` must always be passed explicitly, must never be guessed, and must be discovered via `get_solution_projects` when uncertain. Reported failure mode: subagents (and sometimes the main loop) call `mcp__rider__*` tools without `projectPath` or with a guessed value, get back `"doesn't correspond to any open project"`, burn a tool call, and risk falling back to filesystem `Grep` after a few retries — defeating the whole skill.

Three new sections in `rider-mcp-first/SKILL.md`:

1. **Three rules** — (1) always pass `projectPath` explicitly, (2) discover via `get_solution_projects` before guessing, (3) treat `CLAUDE.md`'s documented `projectPath` as authoritative.
2. **Subagent dispatch rule** — when dispatching via the `Agent` tool, the prompt MUST include the `projectPath` value explicitly. Subagents don't inherit cwd or conversational context — without an explicit value they will guess (often wrong) or rationalize their way to filesystem. This is the single most common Rider MCP failure mode reported in practice.
3. **Multi-project workflows** — when the user has multiple .NET repos (e.g. `c:/Pool/laisa2`, `c:/Pool/projector`) but Rider has only **one** loaded at a time, every Rider call against the wrong solution fails with the same error even though the path is correct. The skill now diagnoses this as a **runtime state mismatch** (not a path-guessing bug), tells the user explicitly which solution Rider has loaded vs which they're working in, and falls back to filesystem only after that diagnosis (not as a reflexive retry).

### Changed

- `plugin.json` and `marketplace.json` both bumped to `0.5.1` (synchronous as always).

## [0.5.0] — 2026-05-04

### Added — 3 workflow skills, 1 new upstream attribution

Three new `superpowers/` skills land in 0.5.0, drawing on the latest mattpocock/skills work and Jan Smejkal's hsmejky/skills fork (a fourth upstream library now bundled).

#### `superpowers/grill-with-docs` — doc-aware sibling of `grill-me`

Adapted from [mattpocock/skills/engineering/grill-with-docs](https://github.com/mattpocock/skills) (MIT, © 2026 Matt Pocock). Same Socratic interrogation as `grill-me`, plus three new capabilities:

- **Glossary cross-check** — when the user uses a term, check it against the project's glossary and flag conflicts immediately
- **Code cross-reference** — when the user describes "how the system works", verify against the code (uses `mcp__rider__*` semantic ops when Rider MCP is attached, per `rider-mcp-first`)
- **Inline doc updates** — write resolved terminology to the glossary as it crystallises; offer ADRs only when the decision is hard-to-reverse + surprising + a real trade-off

**Adaptations from upstream:**
- **Path discovery** instead of hardcoded `CONTEXT.md` + `docs/adr/`. Probes in order: `CONTEXT.md` → `CONTEXT-MAP.md` → `project_conventions.md` → `docs/glossary.md` → `docs/architecture.md` → `Resources/Specifications/V*_Architecture_Definition.md` → `CLAUDE.md`. ADR location detection: `docs/adr/*.md` → `docs/decisions/*.md` → `Resources/Specifications/*Decisions*.md`. Detects existing numbering scheme (`0001-x.md` vs `ADR-001`) and matches it.
- **.NET domain-first checklist** (aggregates, FK cardinality, idempotency, partial failure, observability) — same as our `grill-me` modification.
- **`AskUserQuestion` deferred-tool preload** directive — preserves the clickable-card UX rather than degrading to text "1, 2, 3" lists.
- **Two reference files** (`CONTEXT-FORMAT.md`, `ADR-FORMAT.md`) ported with .NET annotations and explicit support for laisa2-style single-file ADR logs (`V*_Decisions.md` with `## ADR-NNN` sections).

#### `superpowers/improve-architecture` — Ousterhout-style deep-modules audit

Adapted from [hsmejky/skills/improve-architecture](https://github.com/hsmejky/skills) (MIT, © 2026 Jan Smejkal — fork modifications; © 2026 Matt Pocock — original work). Built on Ousterhout's *A Philosophy of Software Design* (deep vs shallow modules) and Feathers' seam terminology. Disciplined vocabulary (Module / Interface / Depth / Seam / Adapter / Leverage / Locality), explicit deletion test, parallel sub-agent design when alternative interfaces need exploration.

**Adaptations from upstream:**
- **`AskUserQuestion` deferred-tool preload** for steps 3 (candidate list) and 4 (grilling loop).
- **`Explore` subagent fallback** note — falls back to `general-purpose` with explicit "read-only investigation" brief if `Explore` isn't registered.
- **.NET-specific deepening patterns section** — common shallow-module shapes in .NET projects worth flagging during exploration: `*Service` + `*Repository` + `*Mapper` triplets, `I*Provider` interfaces with one implementation, three-layer Endpoint/Service/Repository pass-through, `AutoMapper` profiles for near-identical types, `IOptions<T>` injected into one consumer, NHibernate `IRepository<T>` exposing CRUD 1:1, Aspire `ServiceDefaults` extension methods wrapping a single SDK call.
- **Cross-references** to dotlight skills: `brainstorming` (for new designs), `design-an-interface` (lighter standalone variant of the parallel sub-agent pattern), `grill-me` / `grill-with-docs` (Socratic stress-test of an existing draft), `dotnet-performance-analyst` (delegate measurement when a candidate is performance-driven), `csharp-type-design-performance` (informs the shape of deep .NET modules), `rider-mcp-first` (use Rider semantic ops, not `Grep`, for the exploration step).
- Reference files (`LANGUAGE.md`, `DEEPENING.md`, `INTERFACE-DESIGN.md`) ported verbatim.

#### `superpowers/caveman` — explicit-trigger ultra-compressed mode

Body adapted from [hsmejky/skills/caveman](https://github.com/hsmejky/skills) (MIT, dual-attributed). Bullets-only, ≤8 words/bullet, UTF substitutions (→, ⇒, ∴, ✓, ✗, etc.), persistent across responses until explicitly turned off. Saves ~75% of response tokens for users who want maximally terse Claude.

**Description tightened from upstream:** trigger phrases narrowed to **explicit mode-switches only** — `"caveman mode"`, `"talk like caveman"`, `"use caveman"`, `/caveman`. Upstream description included ambiguous shortcuts like `"be brief"`, `"shorter responses"`, `"less verbose"`, `"be terse"` which risk accidental permanent activation when the user is making a routine conversational request rather than switching modes. Body unchanged.

### Changed

- **`superpowers/grill-me`** gains a cross-reference: when the project has a glossary file or ADR log, prefer `grill-with-docs` instead — it does the same Socratic interrogation but cross-checks terminology against the glossary and writes resolutions back into the docs.
- **`superpowers/design-an-interface`** is preserved (variant A): mattpocock deprecated it upstream because the parallel sub-agent pattern lives on inside `improve-architecture/INTERFACE-DESIGN.md`, but we keep the standalone shortcut in dotlight. Both have legitimate use cases — `design-an-interface` is a lighter standalone invocation, `improve-architecture/INTERFACE-DESIGN.md` is the same idea integrated into a full architectural review.
- `THIRD_PARTY_LICENSES.md` adds **hsmejky/skills as a 4th upstream attribution** — the LICENSE preserves dual copyright (Matt Pocock for original work, Jan Smejkal for fork modifications), both must be preserved in any redistribution.
- `plugin.json` and `marketplace.json` both bumped to `0.5.0` (synchronous as always).
- Workflow skills count: **18** (was 15).

## [0.4.2] — 2026-05-04

### Added — `aspire-mcp-first`

New `dotnet/` skill: `aspire-mcp-first`. When the Aspire CLI MCP server is attached (`mcp__aspire__*` tools available, typically via `<project-root>/.mcp.json` declaring `aspire agent mcp` as a stdio server) AND a .NET Aspire AppHost is running, the skill forces use of Aspire's MCP for runtime queries (resource state, real-time console logs across all services, distributed traces, dynamic endpoints, resource commands) **before** shelling out to `docker logs`, parsing log files, or guessing at AppHost ports.

Framing is **situational**, not always-on: most coding sessions don't touch a running Aspire app. When they do — debugging a service that won't respond, hunting a flaky integration test, investigating a distributed trace — the skill applies hard.

Includes setup instructions (`dotnet tool install -g Aspire.Cli`, `aspire mcp init` or project-scoped `.mcp.json`), a decision table for runtime queries, anti-patterns ("I'll just `docker logs` it", "I'll grep AppHost.cs for the port" — Aspire ports are dynamic), and cooperation notes with `rider-mcp-first` (Rider for source, Aspire for runtime — orthogonal, use both).

### Changed — `rider-mcp-first` invocation framing sharpened

The 0.4.0/0.4.1 skill was correct in body but **passive in description**. Skills auto-invoke based on description, not body — so when the description was informative ("use Rider's semantic operations BEFORE filesystem"), the model could rationalize "I know that, no need to invoke" and the EXTREMELY-IMPORTANT body never reached context. Result: persistent leak to `Grep` / `Read` despite the skill existing.

Fixes:
- **Description rewritten as imperative**: *"MANDATORY before ANY Grep/Read/Glob/Edit on files inside a .NET solution folder ... Skipping this skill in a Rider-attached session wastes 5-10x the tokens on every file operation. Invoke at session start AND at first sign of any .NET file work — not just when 'exploring.'"*
- **Body lead now demands an immediate tool-list scan** (`STOP. Before reading further, scan your current tool list for any tool name starting with mcp__rider__.`) and adds a **per-call gate** (`Before every single Grep/Read/Glob/Edit call, ask: 'Is the target inside the solution folder, and is mcp__rider__* in my tool list?'`) — this catches the reflexive fallback the skill was missing.
- Explicit naming of the failure mode: *"That reflex is the bug this skill exists to suppress."*

### Changed — manifests

- `plugin.json` and `marketplace.json` both bumped to `0.4.2` (synchronous as always)
- `.NET patterns` count: **26** (was 25). Aspire skills count climbs to 4 (configuration, service-defaults, integration-testing, mcp-first).

## [0.4.1] — 2026-05-04

### Fixed — `rider-mcp-first` rationalization loophole

The 0.4.0 skill said *"Rider doesn't index everything; for non-C# files, default to filesystem."* That listing included `.vue`, `.ts`, `.js`, `.scss` — which let the model rationalize **"Rider doesn't index .vue, I'll use `Grep`"** and silently drop back to the filesystem for any non-C# work. Observed in real session: *"Vue soubory Rider neindexuje jako .vue — použiji přímý search pro zbytek."*

The fix splits Rider MCP tools into two layers and clarifies the fallback rule for each:

- **Layer 1 — Semantic ops** (`search_symbol`, `find_references`, `get_symbol_info`, `rename_refactoring`, `move_type_to_namespace`, `generate_psi_tree`): typed and language-aware. C#/F#/Razor always work via ReSharper. TypeScript/JavaScript always work via the bundled JS plugin. Vue requires the JetBrains Vue plugin (pre-installed in newer Rider builds, not guaranteed).
- **Layer 2 — Text/glob ops** (`search_in_files_by_*`, `find_files_by_*`, `read_file`, `replace_text_in_file`, `list_directory_tree`): work on **any file** in the solution folder, regardless of language. Solution-scoped, dedup'd, `node_modules` / `bin` / `obj`-free. **Better than raw `Grep` even for `.vue` / `.ts` / `.scss`.**

Filesystem fallback is now narrowed to: files genuinely outside the solution folder, cross-repo search, and the Rider-not-attached case.

Two new entries in the Red Flags table catch the specific anti-patterns: "Rider doesn't index .vue" and "non-C# file → skill doesn't apply".

### Changed

- `plugin.json` and `marketplace.json` both bumped to `0.4.1` (synchronous as always)

## [0.4.0] — 2026-05-03

### Added — `rider-mcp-first`

One new `dotnet/` skill: `rider-mcp-first`. When the JetBrains Rider MCP server is attached (`mcp__rider__*` tools available in the model's tool list), this skill is `<EXTREMELY-IMPORTANT>`-flagged to force Rider's semantic operations (`search_symbol`, `find_references`, `get_symbol_info`, `rename_refactoring`, `get_project_dependencies`, …) **before** filesystem `Grep` / `Read` / `Edit` for any C# / `.csproj` / `.sln` / `.slnx` work.

**Why this matters:** ReSharper's pre-built semantic index returns a 100-token answer where `Grep` returns 5–30 KB of file contents per call. On a typical "explore the auth flow" session in a 50-class .NET solution, the difference is roughly **120 K tokens (filesystem) vs 15 K tokens (Rider) — a 105 K saving per session**. That's a quarter of a 200 K context window or 10 % of a 1 M window, repeated.

The skill includes:
- A decision table for every `mcp__rider__*` tool vs its filesystem equivalent
- Explicit fall-back rules for non-code files, files outside the solution, and Rider-not-attached sessions
- Setup prerequisite (Rider must be open, JetBrains MCP plugin enabled, endpoint registered)
- The `projectPath` quirk (solution folder, not repo root)
- A "Red Flags" table modeled on `using-superpowers` to break reflexive `Grep`/`Read`

### Changed

- `plugin.json` and `marketplace.json` both bumped to `0.4.0` (synchronous, as always — the v0.2.0 lesson stays learned)
- `.NET patterns` count: **25** (was 24)
- README *.NET patterns* table gains `rider-mcp-first` row

## [0.3.0] — 2026-05-03

### Added — Aspire is back

Six skills and three agents from [Aaronontheweb/dotnet-skills](https://github.com/Aaronontheweb/dotnet-skills) v1.3.2 are now bundled. v0.1.0 explicitly excluded these on the assumption that Aspire users would install the upstream alongside; in practice that meant maintaining two plugins (and missing curation benefits). Real-world projects (e.g. .NET 10 + Aspire + Postgres/TimescaleDB + NHibernate + Vue/Vite) actually use this surface as their primary integration-testing lever, so it belongs in dotlight.

**New `dotnet/` skills:**
- `aspire-configuration` — AppHost as the explicit env-var bridge; app code free of Aspire clients/service-discovery
- `aspire-service-defaults` — shared OpenTelemetry / health checks / resilience / service discovery setup
- `aspire-integration-testing` — `DistributedApplicationTestingBuilder` with xUnit, dynamic ports, parallel isolation; **the primary lever for parallel integration tests** in Aspire projects (with `advanced-patterns.md` + `ci-and-tooling.md` reference files)
- `opentelemetry-instrumentation` — ActivitySource/Meter patterns, semantic conventions, zero-allocation hot paths *(renamed from upstream `opentelementry-dotnet-instrumentation` typo)*
- `ilspy-decompile` — inspect compiled .NET assemblies via `ilspycmd` / `dnx ilspycmd`
- `playwright-blazor-testing` — UI tests for Blazor Server/WASM with Playwright *(renamed from upstream `playwright-blazor`)*

**New `agents/` directory** (Claude Code's standard `agents/` location at the plugin root):
- `dotnet-performance-analyst` — JetBrains profiler + BenchmarkDotNet result interpretation, regression detection, hot-path delegate allocation analysis
- `dotnet-benchmark-designer` — BenchmarkDotNet design patterns and when custom harnesses beat BDN
- `dotnet-concurrency-specialist` — race conditions, async/await pitfalls, synchronization primitives, deadlock diagnosis

### Fixed

- **`brainstorming` and `grill-me` now load `AskUserQuestion` correctly.** In Claude Code 2.x+, `AskUserQuestion` is a *deferred* tool — it's listed in a `<system-reminder>` block but its parameter schema is not loaded by default, so calling it fails with `InputValidationError` and the model silently degrades to text "Option A / B / C" lists. Both skills now instruct the model to call `ToolSearch` with `"select:AskUserQuestion"` once at session start. This was the original motivation for forking from upstream and was previously broken.

### Changed

- `plugin.json` and `marketplace.json` are now both bumped to `0.3.0`. **Both `version` fields must move together at every release** — the marketplace catalog reads `marketplace.json` for `/plugin marketplace update` to detect new versions, while `plugin.json` is read post-install. v0.2.0 only bumped one of them, which silently broke the upgrade flow.
- README updated: removed the "If you're on Aspire, install the full upstream instead" disclaimer; added a *Companion plugins* section recommending [VoltAgent](https://github.com/VoltAgent/awesome-claude-code-subagents) (`voltagent-data-ai` for ML/data agents like `postgres-pro`, `database-optimizer`) and `playwright@claude-plugins-official` for general UI testing.
- Skill counts: workflow stays at 15. .NET patterns: **24** (was 18). Specialized agents: **3** (was 0). Total surface: 42 entries.
- `THIRD_PARTY_LICENSES.md` updated for new dotnet skills/agents counts and the editorial renames.

### Excluded (still)

Same as before, plus newly-noticed agents:

- Superpowers: `subagent-driven-development`
- dotnet-skills (skills): all `akka-*` (5), `aspire-mailpit-integration`, `mjml-email-templates`, `verify-email-snapshots`, `marketplace-publishing`, `skills-index-snippets`
- dotnet-skills (agents): `akka-net-specialist`, `docfx-specialist`, `roslyn-incremental-generator-specialist`

For those, install upstream alongside — they cooperate fine.

## [0.2.0] — 2026-04-27

### Added

- `superpowers/grill-me` — branch-by-branch interrogation of an existing plan or spec. Adapted from [mattpocock/skills/grill-me](https://github.com/mattpocock/skills/tree/main/grill-me) with a domain-first checklist (aggregates, invariants, FK cardinality, idempotency, partial failure, observability), `AskUserQuestion` convention, and explicit boundary against `brainstorming` (which generates designs) and `writing-plans` (which structures them).
- `superpowers/design-an-interface` — generate 3–4 radically different designs for a public surface in parallel via `dispatching-parallel-agents`, then compare on simplicity, depth, and ease of correct use. Adapted from [mattpocock/skills/design-an-interface](https://github.com/mattpocock/skills/tree/main/design-an-interface) with C#/.NET shaping constraints, cross-references to `api-design` / `type-design-performance` / `dependency-injection-patterns` / `csharp-concurrency-patterns`, and a handoff to `grill-me` for further pressure.

### Changed

- README workflow table now shows 15 workflow skills (was 13). Full feature flow gains two opt-in side-trips: `design-an-interface` when the public surface is hard to change later, and `grill-me` when a draft spec or thin domain model needs interrogation.
- `THIRD_PARTY_LICENSES.md` adds Matt Pocock (© 2026) as a third upstream contributor; redistribution rules and attribution list updated accordingly.

## [0.1.0] — 2026-04-24

Initial release.

### Bundled

- 13 workflow skills from [obra/superpowers](https://github.com/obra/superpowers) (v5.0.7 at time of fork)
- 18 .NET pattern skills from [Aaronontheweb/dotnet-skills](https://github.com/Aaronontheweb/dotnet-skills) (v1.3.2 at time of fork)

### Modified from upstream

- `brainstorming` — prefers `AskUserQuestion` tool over text multi-choice; added question budget (5 for small scope, 8 for larger); Domain Model is now the first required design section
- `writing-plans` — requires `## Domain Model` section derived from brainstorming; loops back if missing or vague; default exec sub-skill changed from `subagent-driven-development` to `executing-plans`
- `test-driven-development` — added prerequisite that a domain model must exist in the plan before the first RED-GREEN-REFACTOR cycle; explicit warning against "test-cheating" (satisfying tests by violating invariants)

### Excluded from upstream

- Superpowers: `subagent-driven-development` (performance)
- dotnet-skills: `akka-*` (5 skills), `aspire-*` (4 skills), `playwright-blazor`, `mjml-email-templates`, `verify-email-snapshots`, `opentelementry-dotnet-instrumentation`, `ilspy-decompile`, `marketplace-publishing`, `skills-index-snippets`

### License

- Initial MIT license © 2026 Martin Mudra
- Both upstream MIT licenses (© 2025 Jesse Vincent, © 2025 Aaron Stannard) preserved verbatim in `THIRD_PARTY_LICENSES.md`

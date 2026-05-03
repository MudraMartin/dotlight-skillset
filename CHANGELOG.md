# Changelog

All notable changes to DotLightSkillset will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

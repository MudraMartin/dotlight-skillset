# Changelog

All notable changes to DotLightSkillset will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.9.0] — 2026-07-19

### Fixed — TDD rewired into the deterministic dispatch surface (the "TDD vanished" regression)

Maintainer-reported symptom: since ~0.5, downstream sessions (notably the three-system portal migration) almost never invoke `test-driven-development`, and the README workflow diagrams no longer describe observed behavior. A 34-agent investigation (5 evidence auditors → adversarial two-lens verification → completeness critic) plus a 30-cell RED baseline traced it to **multiple stacked causes, none of them TDD's own description** (byte-identical since 0.1.0):

1. **`executing-plans` never carried TDD** (defect since 0.1.0): README diagram 2 promises `executing-plans → TDD`, but the skill body and its "Required workflow skills" list never named it — the loop existed only in the diagram.
2. **0.6.0 triage rewrite dropped the TDD clauses**: the old `using-superpowers` "Rigid (TDD, debugging): Follow exactly" line was removed, and the new Direct track prescribed "direct edit **+ tests**" — a tests-after recipe for bugfixes, TDD's home turf.
3. **0.6.1 session-context compressed the chain to "brainstorming → writing-plans → executing-plans → review"** — the deterministic carrier itself omitted the TDD node, countermanding TDD's "any feature or bugfix" trigger wherever the hook fired.
4. **On Windows nothing deterministic fired at all until 0.8.2** (exec-form `cat`, see 0.8.2 entry), so 0.5.x–0.8.1 sessions ran purely on probabilistic frontmatter dispatch — where TDD's quiet description was out-competed by newer imperative ones (`rider-mcp-first` et al., 3 more workflow skills at 0.5.0, `lazy-senior-dev` at 0.6.0).

Measured (quiz-format probes, opus, manual read): with 0.8.2 wording, test-before-implementation ordering appeared in **6/15** runs (code-port scenario **0/5**); with the 0.9.0 wording below, **6/6** with low variance.

Changes (fair-reviewed, 1 critical + 4 important findings fixed pre-merge):

- **`hooks/session-context.md` + `using-superpowers` triage**: Direct track now gates on an observable predicate — *touches executable code* (bugfixes and code ports included) → test-first via `test-driven-development` (failing test → minimal change → green), with bugs entering through `systematic-debugging` (root cause before fix); *no executable code* (config/DI value, safe rename, reformat, presentation-only markup/CSS) → direct edit. Persisted-shape changes are never Direct-track. Full workflow names TDD explicitly: every task runs red-green; the domain/persistence model is designed in the plan, never discovered by tests.
- **`executing-plans`**: `test-driven-development` is now a REQUIRED SUB-SKILL per implementation task (a task without a failing-test step is a plan defect — stop, don't improvise tests-after); subagent dispatch points at "The Brief Must Embed the Discipline"; Integration list gains the TDD entry. The diagram-2 loop finally has a carrier.
- **`test-driven-development`**: Direct-track exception for the Domain-Model gate — with no plan by design, the domain model is the existing code's invariants (fixes the fair-review critical: the gate would otherwise STOP-loop every Direct-track bugfix into `writing-plans`, silently escalating all small fixes to the full workflow). The Persistence-Model gate stands unweakened: on the Direct track a schema-touching step escalates to the full workflow.
- **`lazy-senior-dev`**: Direct-track passage aligned — bugfixes/ports run inside TDD's cycle, the ladder shapes the minimal GREEN.
- **Cross-references repaired**: 19 `superpowers:` prefixes → `dotlight-skillset:` (the plugin's actual namespace; the old prefixes resolved to nothing).
- **Orchestration rule (new, hook + README)**: Workflow-tool/ultracode/parallel-subagent execution changes *who* executes, not the track — design stays in the main loop; every implementation brief embeds the discipline (subagents inherit no skills).
- **README**: diagram 1 gains the executable-code gate node; triage prose and the recommended project `CLAUDE.md` snippet updated (incl. new `## Orchestration` section). Diagrams 2 and 3 now describe wiring that actually exists.

### Changed

- Both manifests bumped to `0.9.0`.

## [0.8.2] — 2026-07-12

### Fixed — SessionStart hook never fired on Windows (exec-form `cat`)

The 0.6.1 "deterministic composition wiring" was not actually deployed on Windows. Debug-log evidence (`claude --debug`): *"Hook command failed to spawn (SessionStart:startup): Executable not found in $PATH: \"cat\""*. Root cause: the hook used **exec form** (`"command": "cat"` + `args` array), which per the hooks docs spawns the executable directly via PATH lookup with no shell — and `cat.exe` lives only in Git's `usr\bin`, which is not on the native Windows PATH (only `Git\cmd` is). The 0.6.1 changelog called exec form "Windows-safe"; it was exactly backwards. **Shell form** (a single command string, no `args`) runs via `sh -c` on macOS/Linux and **Git Bash on Windows** (PowerShell fallback, where `cat` is an alias) — so the hook now reads:

```json
{ "type": "command", "command": "cat \"${CLAUDE_PLUGIN_ROOT}/hooks/session-context.md\"" }
```

Net effect: `session-context.md` had never been injected into any Windows session; the triage/discipline/gate rules reached sessions only probabilistically via the `using-superpowers` skill.

### Fixed — triage wording suppressed idea-proposing on ordinary planning turns (the 0.8.x planning regression)

Maintainer-reported symptom: since 0.6.x, sessions "stopped proposing ideas and approaches — they just tersely state what's happening." A 14-agent audit (6 candidate mechanisms, adversarial two-lens verification each, installed-copy check, coverage critic) traced it to the **triage rule added in 0.6.0** (`using-superpowers` "## Triage" section, echoed into `hooks/session-context.md` in 0.6.1 and `brainstorming`'s "Triage first" line). Three wordings did the damage:

1. *"No brainstorming, no plan documents"* — written as bare English, not "don't invoke the brainstorming **skill**", so models read it as "don't volunteer ideas" on every Direct-track turn.
2. *"Full workflow … **only** for new features touching 3+ files…"* — the entire middle band of ordinary work (a bug thought out loud, a small change, ambiguous scope) was excluded from the one skill that mandates "Propose 2-3 approaches with trade-offs and your recommendation".
3. *"When in doubt, ask the user which track"* — converted what used to be a proactive proposal turn into a bare procedural routing question.

Adversarially cleared as non-causes: the brainstorming rebuild (propose-2-3-approaches and its description are byte-identical to 0.5.3), `lazy-senior-dev` (self-scoped to post-design implementation; refuted by both verifiers), the trigger-first description rewrites (no planning-skill description changed), and `caveman` (auto-invocation disabled in 0.6.0 — opposite direction).

Rewritten in all three places so minimalism governs artifacts, never ideation:

- Direct track now reads *"Skip the brainstorming skill and plan documents — not the thinking: still open with your intended approach, and name real alternatives when they exist."*
- New triage clause: *"Approach-shaped turns — the user asks how to tackle something, weighs options, or thinks out loud — get 2-3 proposed approaches with a recommendation, on either track; task size never cancels ideation."*
- *"When in doubt about the track, lead with your recommended approach and the track it implies, and let the user steer — don't just ask which track."*
- Dropped the *"only"* from the Full-workflow trigger; `brainstorming`'s "skip this skill entirely" echo softened the same way.

### Changed

- Both manifests bumped to `0.8.2` (synchronous as always).

## [0.8.1] — 2026-07-11

### Fixed — duplicate hook registration broke plugin load

`/plugin marketplace update` on 0.8.0 reported: *"Duplicate hooks file detected: ./hooks/hooks.json resolves to already-loaded file … The standard hooks/hooks.json is loaded automatically, so manifest.hooks should only reference additional hook files."* Root cause: `hooks/hooks.json` at the plugin root is auto-discovered by convention, and 0.6.1 *also* registered it explicitly via `plugin.json`'s `"hooks"` key — a belt-and-suspenders choice that Claude Code treats as a duplicate, not a no-op. Removed the manifest key; the conventional file remains and loads automatically.

### Changed

- Both manifests bumped to `0.8.1` (synchronous as always).

## [0.8.0] — 2026-07-11

### Changed — every .NET pattern description rewritten trigger-first (the dispatch surface fix)

**Why this matters (the mechanism, precisely):** in Claude Code, only a skill's `name` + `description` are loaded at session start; the body loads *after* the model decides to invoke — and that decision is made from the description alone. A description like *"Entity Framework Core best practices including…"* is a **topic label**: it tells the model what the skill contains, not *when to reach for it*, so the model — which writes C# constantly and never pauses to invoke a "write good C#" skill — simply never fires it. The 0.6.x fair review (dispatch lens) identified this as failure cause #3: **the plugin's headline promise ("dotnet-skills supply the patterns") rested on ~18 skills with the weakest possible dispatch.** The workflow layer got trigger-first descriptions in 0.6.0; this release finishes the job on the pattern layer.

**What exactly changed — all 18 rewritten descriptions** (form: passive topic label → `Use when <situation>` with front-loaded trigger keywords):

| Skill | Old opening (passive) | New trigger |
|---|---|---|
| `aspire-configuration` | "Configure Aspire AppHost to emit…" | Use when wiring configuration between an Aspire AppHost and its services |
| `aspire-integration-testing` | "Write integration tests using…" | Use when writing **or debugging** integration tests on an Aspire project |
| `aspire-service-defaults` | "Create a shared ServiceDefaults project…" | Use when setting up or changing an Aspire ServiceDefaults project |
| `crap-analysis` | "Analyze code coverage and CRAP scores…" | Use when running the CRAP quality gate at review time or auditing coverage risk |
| `api-design` | "Design stable, compatible public APIs…" | Use when designing a public API shipped as a NuGet package or versioned wire contract — **explicitly "not about Minimal API endpoint design"** |
| `modern-csharp-coding-standards` | "Write modern, high-performance C# code…" | Use when writing or reviewing C# code |
| `type-design-performance` | "Design .NET types for performance…" | Use when designing .NET types with performance in mind |
| `database-performance` | "Database access patterns for performance…" | Use when designing data access **or diagnosing slow queries** |
| `dotnet-devcert-trust` | "Diagnose and fix .NET HTTPS dev certificate…" | Use when HTTPS dev-certificate trust fails on Linux or WSL2 |
| `efcore-patterns` | "Entity Framework Core best practices…" | Use when working with EF Core (the EF Core project only — NH projects → nhibernate-patterns) |
| `ilspy-decompile` | "Understand implementation details… Use when…" (trigger buried mid-text) | Use when you need to see inside a compiled .NET assembly (front-loaded) |
| `dotnet-local-tools` | "Managing local .NET tools with…" | Use when installing or managing local .NET CLI tools |
| `microsoft-extensions-configuration` | "Microsoft.Extensions.Options patterns including…" (no verb of use at all) | Use when wiring application configuration |
| `dependency-injection-patterns` | "Organize DI registrations using…" | Use when organizing DI registrations |
| `opentelemetry-instrumentation` | "Implement OpenTelemetry instrumentation…" | Use when adding or reviewing OpenTelemetry instrumentation |
| `package-management` | "Manage NuGet packages using CPM…" | Use when adding, updating, or consolidating NuGet packages |
| `playwright-blazor-testing` | "Write UI tests for Blazor applications…" | Use when writing **or debugging** Playwright UI tests for Blazor |
| `playwright-ci-caching` | "Cache Playwright browser binaries…" | Use when Playwright re-downloads browsers on every CI run |
| `dotnet-project-structure` | "Modern .NET project structure including…" | Use when creating or restructuring a .NET solution |
| `serialization` | "Choose the right serialization format…" | Use when choosing or implementing serialization in .NET |
| `testcontainers-integration-tests` | "Write integration tests using TestContainers…" | Use when writing **or debugging** container-based integration tests |

### Changed — maintenance-track triggers (create-scoped descriptions were the review's failure cause #3b)

The scenario traces showed the pattern skills firing only on *creation*-shaped tasks while daily work is *maintenance*-shaped — a stale-price bug on a versioned table never loaded the temporal knowledge because "designing or changing a schema" doesn't match "this query returns wrong data". Broadened:

- **`database-design-conventions`** — now also fires "when debugging query or data defects on versioned/temporal tables" (the as-of predicate and close-and-insert rules ARE the fix for most such bugs)
- **`testcontainers-integration-tests`**, **`aspire-integration-testing`**, **`playwright-blazor-testing`** — "writing **or debugging**" (flaky-test diagnosis previously matched nothing)

### Fixed — honest relabeling of `api-design`

README sold it as "Minimal API extend-only design" — the skill is actually NuGet/binary/wire-contract compatibility discipline and contains zero Minimal API endpoint content (no MapGroup/TypedResults). README row and description now say exactly that, including the explicit negative trigger ("not about Minimal API endpoint design") so it stops false-firing on endpoint work. Real Minimal API endpoint coverage remains an open gap (tracked from the fair review).

### Budget accounting (honest numbers)

Always-loaded metadata after this release: **9,949 chars ≈ ~2,490 tokens across 50 entries** (49 loaded + caveman disabled). The rewrites saved ~240 chars net while 0.7.0 added nhibernate-patterns (+290). This remains above the ~2,000-token default 1%-budget on 200K-context models — the README's `skillListingBudgetFraction: 0.02` guidance stands, and the SessionStart hook (0.6.1) keeps the load-bearing triage/discipline rules out of the drop-risk pool entirely.

### Changed

- Both manifests bumped to `0.8.0` (synchronous as always).

## [0.7.0] — 2026-07-11

### Added — `nhibernate-patterns`: NH as a first-class runtime citizen

Maintainer fact the stack-fit review surfaced: **most dotlight projects run NHibernate; only one runs EF Core** — yet ORM runtime coverage was EF-only, and several EF habits *invert* under NH into bugs (EF-NoTracking mental model → NH's accidental-UPDATE-by-dirty-check; spurious `session.Update()` calls → `NonUniqueObjectException`; `Include`/`AsSplitQuery` → nonexistent).

New `dotnet/nhibernate-patterns` (SKILL.md + reference.md), sibling of `efcore-patterns`:

- Core principles framed as EF-habit inversions; session-per-request DI (`ISessionFactory` singleton / `ISession` scoped, no `AddDbContext`), flush modes
- `ISession` vs `IStatelessSession` decision table (the "AsNoTracking" question), writes without `Update()`
- Fetch strategies (`batch-size` as default, `Fetch`/`FetchMany`, Futures, `subselect`), the multiple-bags trap
- HQL/LINQ bulk DML + cache/event-listener bypass warnings; `adonet.batch_size` + the identity-generator batching trap (sequence + pooled-lo for batch-heavy tables)
- LINQ-provider limits → QueryOver/HQL fallbacks; `LazyInitializationException` fixes; Polly instead of ExecutionStrategy
- reference.md: mapping-by-code catalog, Npgsql `IUserType` for jsonb/arrays + `EnumStringType`, audit-column event listeners (and their non-firing under stateless/bulk paths), second-level + query cache rules, QueryOver cookbook
- Boundaries: temporal mapping stays owned by `database-design-conventions` (this skill wires only the session-level `currentOnly` filter discipline); access patterns stay in `database-performance`

### Fixed — existing skills no longer mislead NH projects (9 small edits)

- `efcore-patterns` — explicit scope note: EF Core only, guidance does not transfer to NH
- `database-performance` — description + Principle 6 + 4 inline NH annotations (Fetch/batch-size for `Include`, Futures for `AsSplitQuery`, mapping-by-code for `IEntityTypeConfiguration`, quick-ref rows)
- `database-design-conventions` — Boundaries route NH schema evolution to FluentMigrator/DbUp (no NH migration CLI exists; `SchemaUpdate` is not a production migration path); Keys section notes the identity-vs-batching trap; `temporal-versioning.md` NH mapping gains `Precision(19)/Scale(4)` so it actually reproduces `numeric(19,4)`
- `testcontainers` — NH note on the migration test (`SchemaExport`/runner instead of `MigrateAsync`); Respawn ignore-table note (FluentMigrator `VersionInfo` / DbUp `SchemaVersions`, not `__EFMigrationsHistory`)

### Changed

- Both manifests bumped to `0.7.0` (synchronous as always). .NET patterns count: **29**.

## [0.6.1] — 2026-07-11

### Fixed — composition wiring (top findings of the 5-lens fair review)

A five-reviewer audit (coherence, dispatch reality, scenario traces, stack fit, self-consistency) found the plugin's intermittent failures were **wiring, not architecture**: the connective tissue lived in the README (never loaded) or in probabilistic description-firing. 0.6.1 moves it into deterministic carriers:

- **SessionStart hook (NEW — first hook in the plugin).** `hooks/hooks.json` + `hooks/session-context.md` inject the triage rule, skill-discipline law, review-gate list, and AskUserQuestion preload pointer as literal text every session (startup/resume/clear/compact). Exec-form `cat` via `${CLAUDE_PLUGIN_ROOT}` — no shell interpretation, Windows-safe, ~250 tokens, does not count against the skill-listing budget. This restores the guarantee upstream obra provides via its own SessionStart hook and closes the #1 root cause: the entry gate (triage + "1% chance → invoke the skill") was itself only probabilistically loaded, so identical tasks took a clean or ceremony-heavy path depending on one un-forced invocation.
- **Review chain wired into skill bodies** (was README-only): `executing-plans` checkpoints now REQUIRE `requesting-code-review` and name all three .NET quality gates, reconciling the per-batch driver-run gate from writing-plans with the per-task reviewer dispatch; `requesting-code-review` now names `database-review` (the 0.6.0 flagship gate was absent from the canonical "also run" line — schema diffs bypassed it) and defines the severity mapping onto the merge gate (slopwatch Error / CRAP > 30 = Critical; Warning / CRAP 20–30 = Important); `code-reviewer.md` gains a gate-presence check (missing gate results for a diff that needs them → Important finding).
- **Subagent briefs carry the discipline**: `dispatching-parallel-agents` gains "The Brief Must Embed the Discipline" — Rider projectPath, the governing Persistence Model excerpt, minimalism rules, and the gates the parent will run. Generalizes rider-mcp-first's proven subagent rule to all dispatch (subagents inherit no skills; a brief without the rules produces work that silently violates every guarantee).
- **Design side-trips integrated, not deleted** (maintainer decision — grill-me/grill-with-docs/design-an-interface are actively used): `brainstorming`'s terminal rule no longer suppresses them; both are sanctioned pre-lock side-trips that loop back, and the user-review gate offers grilling explicitly. This fixes the contradiction where the README flow routed to skills the brainstorming body forbade invoking.

### Changed

- `plugin.json` registers `"hooks": "./hooks/hooks.json"`; both manifests bumped to `0.6.1` (synchronous as always).

## [0.6.0] — 2026-07-11

The largest release since 0.1.0: full upstream sync, a repaired foundation defect, an anti-overengineering layer, a designed-persistence layer, and an input-token diet. A 5th upstream attribution (DietrichGebert/ponytail) joins `THIRD_PARTY_LICENSES.md`.

### Fixed — three core skills shipped TRUNCATED since v0.1.0

`superpowers/brainstorming/SKILL.md`, `superpowers/writing-plans/SKILL.md`, and `superpowers/test-driven-development/SKILL.md` were cut mid-sentence in the initial fork commit and every release 0.1.0–0.5.3 shipped them broken — brainstorming lost its Visual Companion guidance, writing-plans lost the entire Self-Review checklist and Execution Handoff (the section the README claimed we modified), TDD lost When Stuck / Debugging Integration / the testing-anti-patterns link (orphaning that file) / the Final Rule. All three are rebuilt complete on the upstream v6.1.1 base with dotlight modifications re-applied. New guard: `scripts/check-md-integrity.js` (trailing newline + frontmatter closure + minimum size on every bundled .md) — run before every release.

### Changed — superpowers re-forked onto v6.1.1 (was v5.0.7)

- **`requesting-code-review`** — dotlight shipped a dispatch to a `superpowers:code-reviewer` agent that was never bundled (silent failure). Adopted upstream's self-contained general-purpose-subagent version + read-only-review rules + calibration section.
- **`writing-plans`** — gains upstream's Task Right-Sizing (caps per-task diff at what a reviewer can gate), Global Constraints block, and per-task Interfaces block.
- **`using-git-worktrees` / `finishing-a-development-branch`** — v6 rewrites: native EnterWorktree preference, consent before creating, merge-verified-before-cleanup, provenance-based cleanup, forge-neutral push.
- **`using-superpowers`** — 43%-compressed v6.1.1 body; now hosts the AskUserQuestion-preload rationale once (other skills carry a one-line pointer); per-harness reference files (codex/copilot/gemini) deleted.
- **`systematic-debugging`** — upstream fix for the literal "Ultrathink" keyword that silently forced extended thinking on every load (live token/latency leak in 0.1.0–0.5.3).
- **`writing-skills`** — v6.1.1 "Match the Form to the Failure" + "Micro-Test Wording" + new description-budget subsection.
- **`dispatching-parallel-agents`** — cheapest-adequate-model dispatch rule (harvested from upstream SDD's lesson).
- **`executing-plans`** — no longer recommends the excluded subagent-driven-development over itself (!); checkpoint diff-stat reporting against the plan.
- **`receiving-code-review`, `verification-before-completion`** — minor upstream syncs.
- **Removed: brainstorming visual companion** (scripts/, visual-companion.md) — broken in dotlight since fork (the truncation cut its section), shipped upstream's pre-auth server with a known security hole, token-heavy and Windows-fragile. Orphaned `spec-document-reviewer-prompt.md` / `plan-document-reviewer-prompt.md` also removed (upstream replaced subagent review loops with inline self-review in v5.0.6).

### Changed — dotnet-skills synced to v1.4.1

`opentelemetry-instrumentation` adopted the v1.4.1 rewrite (fixes fabricated APIs, compile errors, wrong span hierarchy present in our v1.3.2 copy) + its 3 progressive-disclosure reference files. The other 25 bundled skills and all 3 agents are byte-identical between tags — nothing else to sync. New upstream skill `r3-reactive-extensions` deliberately excluded.

### Added — anti-overengineering layer (goal: code reviewable by senior humans)

- **`superpowers/lazy-senior-dev`** — adapted from [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail) (MIT): the 7-rung ladder (does it need to exist → reuse → BCL → platform feature → installed dep → one line → minimum code), root-cause-over-symptom bug fixes, `// lazy:` debt comments with named ceiling + upgrade path, safety carve-outs (never simplify validation at trust boundaries, data-loss handling, security). Reconciled with the design-first flow: **the ladder governs implementation of the agreed design, never the design itself** — approved plans are rung-1-exempt. Subsequently hardened via a 5-scenario adversarial red-team: **KISS holds simultaneously with high cohesion and low coupling** — cohesion defined as depth (one deep module behind a small interface), so God-class dumps, copy-paste-as-smallest-diff, internals-reaching "reuse", designed-boundary erosion, AND file-count over-splitting all fail the same criterion; 5 Red Flags rows name the exact rationalizations, and the code-reviewer Reviewability section gained the symmetric structure-damage checks.
- **`brainstorming`** — one of the 2-3 proposed approaches MUST be the minimal version, presented first, recommended by default; "Reviewability is a design constraint" key principle; triage escape-hatch (small tasks skip brainstorming entirely, per the new using-superpowers triage rule).
- **`writing-plans` Minimalism Gate** — mandatory `## Non-Goals / Deliberately Not Built`; every file names its forcing requirement (deletion test via improve-architecture's shallow-module catalog); Self-Review reverse coverage (task with no requirement is deleted); No-Placeholders relaxed for repeated patterns ("as in Task N's block") to keep plans human-reviewable; per-batch review gates + Final review (hsmejky v0.2.0).
- **`requesting-code-review`/code-reviewer.md Reviewability section** — diff-stat with ~400-changed-lines-per-task budget flag, single-implementation-interface deletion test, unused-generality check, "Extra: unrequested features / over-engineering" as spec-compliance findings (implementer "YAGNI" rationales never downgrade findings); unforced scope creep is Important/Critical.
- **README `CLAUDE.md` snippet** — Anthropic's official anti-overeagerness block verbatim, with the "minimize scope, never correctness" carve-out.
- **TDD** — pre-agreed seams (caps test volume at human review capacity), no-speculation line, tautological-test anti-pattern (mattpocock back-ports).
- **`improve-architecture`** — one-adapter/two-adapter rule, Strong/Worth-exploring/Speculative badges, Top-recommendation closer.
- **`grill-me`/`grill-with-docs`** — enact stop-gate + facts-vs-decisions split (decisions are the user's) from upstream /grilling.

### Added — designed persistence layer (goal: DB navržená, ne vyrostlá z testů)

- **`dotnet/database-design-conventions`** (+ `temporal-versioning.md`, `normalization-check.md`) — the house dialect: lifecycle-pattern catalog with a decision test (plain mutable / soft delete / in-table temporal `active_from`/`active_to` with NULL = current / side history table / append-only fact); **one schema, one dialect** meta-rule (mechanisms may differ per need, but each concept has exactly ONE canonical spelling — no `ValidFrom`/`StartFrom` synonyms); 11 rules incl. the constraint trio (partial unique index + btree_gist exclusion + period check), two-keys FK strategy with anchor tables, soft-delete XOR versioning, 5-step normalization gate, hypertables-never-versioned, expand-contract migrations; EF Core query-filter pitfalls + NHibernate filter-def/auxiliary-object mappings. Defers generic Postgres/Timescale mechanics to the **pg-aiguide** companion plugin (new README recommendation).
- **`dotnet/database-review`** — quality gate alongside slopwatch/crap-analysis for schema diffs: dialect fingerprinting + uniformity rules (DBR1xx), test-shaped schema smells (DBR2xx: test-only columns, nullable-everything, missing FKs, fixture mirrors, God-table accretion), design basics (DBR3xx: missing unique constraints, unindexed FKs, broken temporal mechanics, version-row FK pins). Critical findings block merge; closes the blind spot where crap-analysis excludes `**/Migrations/**`.
- **Persistence-First Rule** in `writing-plans` — every plan MUST have `## Persistence Model` (sentinel `None — no schema changes` allowed); derived from the Domain Model BEFORE task steps.
- **TDD persistence gate** — any migration/entity/mapping change not covered by the plan's Persistence Model → STOP, loop back; a test never justifies a schema deviation.

### Changed — input-token diet (goal B)

- Always-loaded metadata cut from ~10,996 to ~9,900 chars **despite adding 3 skills**: 13 worst descriptions rewritten trigger-first (improve-architecture 513→252, caveman 481→0, aspire-mcp-first 411→211, grill-with-docs 390→215, rider-mcp-first 379→281, agents −430, …).
- **`caveman`** gains `disable-model-invocation: true` — zero context cost, explicit `/caveman` only (verified against current Claude Code docs; the `invocable:` field carried by dotnet skills is non-standard and ignored — removed everywhere).
- **`rider-mcp-first`** body split: gates, decision table, and Red Flags stay in SKILL.md (~11K chars, was 19K); setup, projectPath examples, multi-project diagnosis, token math, and cooperation notes moved to `reference.md`. Saves ~2K tokens on every .NET session.
- AskUserQuestion preload rationale deduplicated (5 copies → 1 in using-superpowers + one-line pointers).
- README gains a Token-budget hygiene section (`/doctor`, `/context`, `skillListingBudgetFraction`, project-scoped `.mcp.json` for MCP schema costs).

### Deferred (documented, not done)

- Progressive-disclosure splits of the 7 largest upstream-derived dotnet skill bodies (efcore-patterns 17.8K … package-management 11.9K) — kept verbatim to preserve a clean upstream-sync surface; upstream is doing its own splits (v1.3.1 PR #48, v1.4.1 OTel).
- Re-evaluating `subagent-driven-development` (v6.0.0 rewrite: ~2x faster, ~50% fewer tokens, per-task over-engineering verdicts) as an opt-in exec mode.
- Micro-tested evals for the new skills per writing-skills v6 guidance.

### Changed

- `plugin.json` and `marketplace.json` both bumped to `0.6.0` (synchronous as always). Skill counts: workflow **19**, .NET patterns **28**, agents 3.

## [0.5.3] — 2026-05-08

### Fixed — `rider-mcp-first` drift recovery (closes two rationalization gaps)

0.5.2 fixed the *front door* (Rider-not-attached gate via `AskUserQuestion`) but the *back door* was still open: even with the skill loaded and Rider attached, the model could drift from semantic operations to filesystem `Grep` / `Read` mid-session, and once drifted, every subsequent call inherited the precedent. Reported failure mode (verbatim from a model self-correction): *"the rationalizations I fell into are exactly what the skill warns against — 'I'll just Read this real quick', 'the modify-time pattern is already established'. That's the leak the skill exists to suppress."*

Two specific gaps in `rider-mcp-first/SKILL.md` allowed the leak:

1. **`Read`-variant of "real quick" wasn't named in Red Flags.** The table had *"I'll just `Grep` this real quick"* but no parallel row for `Read`. The model pattern-matched the `Grep` row and treated `Read` of one file as different. Same trap, just one tool over.
2. **No Red Flag for path-dependence.** Once the first filesystem call slipped through (rationalized as one-off), every subsequent call got justified retroactively as *"I'm already in this mode, switching mid-stream would be inconsistent / churn."* The per-call gate caught the **first** drift but said nothing about **drift recovery** — what to do once you notice you've already drifted. The skill's silence here let sunk-cost reasoning take over and turned one slipped call into a session-long filesystem fallback.

0.5.3 closes both:

- **Per-call gate** (top `EXTREMELY-IMPORTANT` block) now explicitly states the gate keeps running *after* drift, with named-and-shamed sunk-cost language: *"do NOT rationalize 'consistency' or 'let me finish out the current sub-task in filesystem and switch later'. Switch to Rider on the very next call. There is no consistency-tax for switching tools mid-stream; the user pays nothing for that. They do pay, per call, for staying drifted."*
- **Red Flags table** gains two rows: the `Read`-real-quick variant (named separately so the model can't pattern-match its way past it), and the path-dependence rationalization (*"I've already been using filesystem this session — switching is churn / breaks the established pattern"*) — labeled "the leak amplifier and the most expensive rationalization in this skill."

### Changed

- `plugin.json` and `marketplace.json` both bumped to `0.5.3` (synchronous as always).

## [0.5.2] — 2026-05-04

### Fixed — `rider-mcp-first` Rider-not-attached gate

Up through 0.5.1 the skill said *"if `mcp__rider__*` is absent, tell the user once and proceed with filesystem"*. **In practice that's a silent leak**: the user often forgot to open Rider (or had the wrong solution loaded), the model dropped to `Grep` / `Read` immediately, and 30–80K context tokens were spent on filesystem exploration before anyone noticed. One typical .NET feature session = the user paying for one whole "Rider was actually closed" tax without ever being asked whether to proceed.

0.5.2 replaces that with an **explicit gate via `AskUserQuestion`** before any .NET file operation when Rider isn't attached:

1. **(Recommended) "I'll open Rider — give me a moment"** — model waits, re-scans tool list once user confirms, switches to full Rider discipline. *Saves 50–90% of session tokens.*
2. **"Proceed with filesystem (much more expensive)"** — explicit opt-in. Cost estimate stated to user (30–80K tokens vs 5–15K with Rider). Model proceeds without re-asking.
3. **"Skip the .NET work for now"** — graceful exit.

Persistence: choice honored for the whole session, no pestering. Falls back to text question if `AskUserQuestion` is unavailable. **Subagent dispatch case explicitly addressed** — parent must resolve the gate WITH the user before dispatch (subagents have no back-channel and would otherwise silently filesystem-fallback when briefed without the gate decision).

### Changed

- `plugin.json` and `marketplace.json` both bumped to `0.5.2` (synchronous as always).

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

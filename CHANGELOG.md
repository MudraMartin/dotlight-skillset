# Changelog

All notable changes to DotLightSkillset will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

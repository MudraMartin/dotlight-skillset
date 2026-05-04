---
name: improve-architecture
description: Find deepening opportunities in a codebase by reading the code itself. Surface shallow modules, propose refactors that turn shallow modules into deep ones (Ousterhout's "A Philosophy of Software Design" + Feathers' seams). Use when the user wants to improve architecture, clean up code, deepen modules, find shallow modules, audit architecture, do an architecture review, mentions "ball of mud", "messy code", "how can I improve this design", consolidate tightly-coupled modules, or make a codebase more testable.
---

# Improve Architecture

Surface architectural friction and propose **deepening opportunities** — refactors that turn shallow modules into deep ones. Read architecture from the code itself.

**Announce at start:** "I'm using the improve-architecture skill. I'll explore the codebase, surface shallow modules, and propose deepening opportunities — then drill into whichever you want to explore."

## Glossary

Use these terms exactly in every suggestion. Consistent language is the point — don't drift into "component," "service," "API," or "boundary." Full definitions in [LANGUAGE.md](LANGUAGE.md).

- **Module** — anything with an interface and an implementation (function, class, package, slice).
- **Interface** — everything a caller must know to use the module: types, invariants, error modes, ordering, config. Not just the type signature.
- **Implementation** — the code inside.
- **Depth** — leverage at the interface: a lot of behaviour behind a small interface. **Deep** = high leverage. **Shallow** = interface nearly as complex as the implementation.
- **Seam** — where an interface lives; a place behaviour can be altered without editing in place. (Use this, not "boundary.")
- **Adapter** — a concrete thing satisfying an interface at a seam.
- **Leverage** — what callers get from depth.
- **Locality** — what maintainers get from depth: change, bugs, knowledge concentrated in one place.

Key principles (see [LANGUAGE.md](LANGUAGE.md) for the full list):

- **Deletion test**: imagine deleting the module. If complexity vanishes, it was a pass-through. If complexity reappears across N callers, it was earning its keep.
- **The interface is the test surface.**
- **One adapter = hypothetical seam. Two adapters = real seam.**

## AskUserQuestion preload (Claude Code 2.x+)

Step 3 (presenting candidates) and step 4 (grilling loop) ask multi-choice questions. `AskUserQuestion` may be a **deferred** tool — listed in a `<system-reminder>` block but with its parameter schema not loaded by default. If so, calling it directly fails with `InputValidationError` and the skill silently degrades to text "1, 2, 3" lists, defeating the clickable-card UX.

**Before your first multi-choice question (typically the candidate list in step 3), call `ToolSearch` with query `"select:AskUserQuestion"` once per session.** No-op if already loaded or not deferred.

## Process

### 1. Locate the output

Check the invoking prompt and `CLAUDE.md`:

- A **file path** (e.g. `docs/refactors/csv-cleanup.md`) — write proposals there.
- **Inline in the conversation** — print, no file.

If neither is specified, ask once via `AskUserQuestion`:

> Where should the proposals land — a file path, or just print here?

### 2. Explore

Use the Agent tool with `subagent_type=Explore` to walk the codebase. If the `Explore` subagent type isn't available in your environment, fall back to `general-purpose` with an explicit "read-only investigation, do not modify" brief.

In .NET solutions with `mcp__rider__*` attached, prefer Rider semantic ops over filesystem `Grep` (see `rider-mcp-first` skill) — `search_symbol`, `find_references`, `get_solution_projects` give you the project graph without burning context.

Don't follow rigid heuristics — explore organically and note where you experience friction:

- Where does understanding one concept require bouncing between many small modules?
- Where are modules **shallow** — interface nearly as complex as the implementation?
- Where have pure functions been extracted just for testability, but the real bugs hide in how they're called (no **locality**)?
- Where do tightly-coupled modules leak across their seams?
- Which parts of the codebase are untested, or hard to test through their current interface?

Apply the **deletion test** to anything you suspect is shallow: would deleting it concentrate complexity, or just move it? A "yes, concentrates" is the signal you want.

### 3. Present candidates

Present a numbered list of deepening opportunities. For each candidate:

- **Files** — which files / modules are involved
- **Problem** — why the current architecture is causing friction
- **Solution** — plain English description of what would change
- **Benefits** — explained in terms of locality and leverage, and how tests would improve

Use names from the code, plus [LANGUAGE.md](LANGUAGE.md) vocabulary for architecture (Module / Interface / Depth / Seam / etc.).

If the project has a glossary (`CONTEXT.md` / `project_conventions.md` / `Resources/Specifications/V*_Architecture_Definition.md`), **also use the project's domain language** when naming the modules — "Order intake module", not "FooBarHandler", not "the Order service".

If a candidate contradicts an existing ADR, mark it clearly: *"contradicts ADR-007 — but worth reopening because…"*. Don't list every theoretical refactor an ADR forbids.

Do NOT propose interfaces yet. Ask the user via `AskUserQuestion`: "Which of these would you like to explore?" — first option labeled "(Recommended)".

### 4. Grilling loop

Once the user picks a candidate, drop into a grilling conversation. Walk the design tree with them — constraints, dependencies, the shape of the deepened module, what sits behind the seam, what tests survive.

Ask one focused question at a time, always with a recommended answer (`Recommended: X. Reason: Y.`). Use `AskUserQuestion` for choice-shaped questions. Single-question rhythm — never bundle.

Capture the resolved design into the output target picked in step 1: the candidate, the settled design, alternatives rejected, next concrete steps.

If alternative interfaces need parallel exploration, see [INTERFACE-DESIGN.md](INTERFACE-DESIGN.md). For each candidate, the dependency strategy comes from [DEEPENING.md](DEEPENING.md) (in-process / local-substitutable / remote-but-owned / true-external).

## .NET-specific deepening patterns

These are common shallow-module shapes in .NET projects worth flagging during exploration:

- **`*Service` + `*Repository` + `*Mapper` triplets** that all live under a single domain concept and share most fields. Often deepenable into a single aggregate facade. Apply deletion test to the mapper first — it's usually pass-through.
- **`I*Provider` interfaces with one implementation** — single-adapter "seam" that's just indirection. Either delete the interface (no real seam) or add a second adapter (test fake) and make the seam real.
- **Endpoint / Controller / Handler classes that delegate to a `*Service` that delegates to a `*Repository`** — three shallow layers, each adding a method signature for every operation. Often deepenable into one handler that owns the use case end-to-end.
- **`AutoMapper` profiles for type pairs that are 90% structurally identical** — the mapper is shallower than just doing the projection inline. Deletion test: would inlining the projection complicate callers? Often no.
- **Helper classes with one static method** — symptom of "extracted for testability" without locality. The bug is rarely in the helper; it's in how the caller composes things.
- **`IOptions<TFooConfig>` injected into one consumer** — config seam without a second adapter. Either bind directly or genuinely separate config from consumer.
- **NHibernate `IRepository<T>` exposing CRUD methods 1:1** — pass-through over `ISession`. Often deepenable: the deep module owns business operations on the aggregate, not "save / load".
- **Aspire `ServiceDefaults` extension methods that wrap a single SDK call** — wrapper for the wrapper's sake. Apply deletion test rigorously.

## Cross-references

- `brainstorming` — for **new** designs from scratch. `improve-architecture` is for existing code that needs reshape.
- `design-an-interface` — lightweight standalone variant of the parallel sub-agent pattern. `improve-architecture/INTERFACE-DESIGN.md` is the same idea integrated into a full architectural review.
- `grill-me` / `grill-with-docs` — Socratic stress-test of a plan or spec. `improve-architecture` does the same thing but **starts from the code**, not a draft.
- `dotnet-performance-analyst` (agent) — when a deepening candidate is performance-driven (hot path, allocation hot spot), delegate the measurement to this agent before committing.
- `csharp-type-design-performance` — informs the shape of deep modules in .NET (records vs classes, `readonly struct`, `Span<T>`).
- `rider-mcp-first` — for the exploration step in step 2, semantic ops via Rider MCP are dramatically faster than `Grep`.

## Anti-patterns

- **Proposing a "refactor for refactor's sake".** Every candidate must point to concrete friction (locality, leverage, testability). If you can't articulate the friction, drop the candidate.
- **Using "service" / "boundary" / "API" instead of the [LANGUAGE.md](LANGUAGE.md) vocabulary.** Consistency is the whole point.
- **Skipping the deletion test.** It's the cheapest disambiguator between a real candidate and a shallow-but-load-bearing module.
- **Introducing a port/adapter for a single consumer.** That's hypothetical seam — pure indirection, zero leverage.
- **Coupling tests to internal seams.** Tests live at the interface. If a refactor breaks tests that don't go through the public interface, the tests were testing past the interface.

---

*Adapted from [hsmejky/skills/improve-architecture](https://github.com/hsmejky/skills/tree/main/skills/improve-architecture) (MIT, © 2026 Jan Smejkal — fork modifications; © 2026 Matt Pocock — original work). Modifications: `AskUserQuestion` deferred-tool preload, `Explore` subagent fallback note, .NET-specific deepening patterns section, integration with `rider-mcp-first` for exploration, cross-references to dotlight's `brainstorming` / `design-an-interface` / `grill-me` / `grill-with-docs` / `dotnet-performance-analyst` / `csharp-type-design-performance`. Reference files (`LANGUAGE.md`, `DEEPENING.md`, `INTERFACE-DESIGN.md`) ported verbatim with light .NET annotations.*

---
name: grill-with-docs
description: "Stress-test a plan, spec, or design against the project's existing documented language and decisions. Use when the user wants grilling AND the project has any combination of: glossary file (CONTEXT.md / project_conventions.md / docs/architecture.md), ADR log (docs/adr/*.md / Resources/Specifications/*Decisions*.md), domain model document. Updates docs inline as resolutions crystallise."
---

# Grill With Docs

Interview the user relentlessly about an existing plan, spec, or design **with the project's documented language and decisions as your sharpest weapons.** This is the doc-aware sibling of `grill-me`: same Socratic discipline, plus terminology cross-checks and inline doc updates.

**Announce at start:** "I'm using the grill-with-docs skill to stress-test this against your project's docs. I'll ask one focused question at a time, propose an answer with each, and update the glossary / ADRs inline as we resolve things."

## When to use this skill — and when not to

Use this when **all three** are true:

- A draft spec, plan, or design exists (don't grill from a blank slate — that's `brainstorming`)
- The project has at least one of: a glossary file, an ADR log, a domain model document
- You want resolutions to land in the docs, not just in the chat

If the project has **no** documented language or decisions, use `grill-me` instead — it's lighter and doesn't try to write to non-existent files. If you find yourself co-authoring a design rather than pressure-testing one, you've drifted into `brainstorming` — exit and switch.

## AskUserQuestion preload (Claude Code 2.x+)

This skill asks a lot of multi-choice questions. `AskUserQuestion` may be a **deferred** tool — listed in a `<system-reminder>` block but with its parameter schema not loaded by default. If so, calling it directly fails with `InputValidationError` and the skill silently degrades to text "1, 2, 3" lists, which the user has to read instead of clicking.

**Before your first multi-choice question, call `ToolSearch` with query `"select:AskUserQuestion"` once per session.** If `AskUserQuestion` is not in the deferred list (older Claude Code, or already loaded), this is a no-op — proceed normally.

## Document discovery

Don't hardcode mattpocock's `CONTEXT.md` / `docs/adr/` paths — projects vary. **Probe in order, use the first one found.**

### Glossary candidates (project terminology)

Probe these paths from the project root, top to bottom, stop at first hit:

1. `CONTEXT.md` — mattpocock convention
2. `CONTEXT-MAP.md` — multi-context repo (read it to find per-context glossaries)
3. `project_conventions.md` — superseded if richer file exists; common in laisa2-style repos
4. `docs/glossary.md` / `docs/GLOSSARY.md`
5. `docs/architecture.md` — fallback; treat the "Domain" section as the glossary
6. `Resources/Specifications/V*_Architecture_Definition.md` — laisa2-style domain SoT
7. `CLAUDE.md` "Domain" / "Mission" sections — last resort, often dense but project-specific

If none exist and the project is non-trivial, **offer to create `CONTEXT.md` lazily** when the first term is resolved. Don't create it pre-emptively.

### ADR / decision log candidates

Probe in order:

1. `docs/adr/*.md` — sequential `0001-x.md` style
2. `docs/decisions/*.md` — alternate convention
3. `Resources/Specifications/*Decisions*.md` — laisa2-style: one file with ADR-001..ADR-N
4. `docs/architecture/decisions/*.md`

Detect the existing **numbering scheme** before suggesting a new ADR. `0001-slug.md` and `ADR-001` are different formats — match what's already there.

### .NET-specific domain documents

Also check (these complement the glossary, don't replace it):

- `<project>/Domain/` folder structure — entity / aggregate names are part of the language
- `Directory.Build.props` — namespace conventions, target frameworks define vocabulary too
- ADR mentions of "Component", "Sandbox", "Aggregate", "Hypertable" — these are project-specific terms that go in glossary

## How to grill (process)

The flow mirrors `grill-me` with three additions: glossary cross-check, code cross-reference, and inline doc updates.

1. **Read the artifact** — find the spec / plan / message the user is asking you to grill. If it's not obvious, ask which one.
2. **Read the docs** — apply discovery above. Internalize the glossary's terms and the ADR titles. You don't need to memorize every ADR body, but you must know which decisions exist.
3. **Map the decision tree** — list open branches in your head: domain boundaries, aggregate invariants, persistence and concurrency, transactional boundaries, failure modes, idempotency, API contract, security, observability, deployment topology, performance budgets, test strategy. Identify which decisions block which.
4. **Walk the tree top-down** — resolve parents before children.
5. **Ask one question at a time, always with a recommended answer.** *"Recommended: X. Reason: Y."* The user pushes back, accepts, or refines. Never ask open-ended "what do you think?" — that's brainstorming.
6. **Glossary cross-check** — when the user uses a term, check it against the glossary. If conflict: **interrupt the current branch**, resolve terminology first. *"Your glossary defines 'cancellation' as X. You just used it to mean Y. Which is right? (Recommended: rename Y to 'reversal' to keep X for the existing meaning.)"*
7. **Sharpen fuzzy language** — when the user uses overloaded terms (`account`, `user`, `order`), propose a precise canonical term. Add it to the glossary.
8. **Cross-reference with code** — for any "the system does X" claim, check the code. If contradiction, surface it: *"You said partial cancellation is supported, but `OrderService.Cancel()` cancels the whole order — which is right?"* (Use `mcp__rider__search_symbol` / `find_references` if Rider MCP is attached — see `rider-mcp-first` skill.)
9. **Use `AskUserQuestion` for choice-shaped questions** — first option labeled "(Recommended)". Free text only when the answer space is genuinely open (a name, a number, a free-form rationale).
10. **Push back on hand-waving** — "we'll figure it out later" / "it should be fine" are unresolved branches. Mark them and return.
11. **Update the glossary inline** — when a term is resolved, write it to the glossary right there. **Don't batch.** Use the format in [CONTEXT-FORMAT.md](CONTEXT-FORMAT.md).
12. **Offer ADRs sparingly** — only when **all three** are true: hard to reverse + surprising without context + result of a real trade-off. Use the format in [ADR-FORMAT.md](ADR-FORMAT.md). Match the existing numbering scheme. Don't open an ADR for routine choices.
13. **Stop when the tree is resolved**, not when the user gets tired. If they want to stop early, summarize unresolved branches as risks before exiting.

## Domain-first checklist (.NET projects)

Same checklist as `grill-me` — ensure every grilling pass at minimum touches:

- **Aggregates and invariants.** Which type owns the invariant? What rule must hold across the aggregate? What happens on partial update?
- **Identity and references.** Surrogate vs natural keys. FK cardinality and direction. Cascade behavior. Cross-aggregate references via ID, not navigation.
- **Concurrency.** Optimistic or pessimistic? Row version? Conflict resolution policy?
- **Transactions.** Boundary per request, per aggregate, per saga? Rollback story?
- **Idempotency.** Which operations are safe to retry? Where does the dedup key live? TTL?
- **Failure and partial state.** What if the external call succeeds but the local commit fails? What's reconciled, by whom, when?
- **API contract.** Status codes for each branch. Versioning. Append-only vs replaceable fields. Backward-compat.
- **Security and authz.** Who can call this? What does the principal need to assert? Where is that check enforced?
- **Observability.** What's logged at info vs warn vs error? Correlation ID story? Metric proving the feature works in prod?
- **Test strategy.** Unit-tested invariants. Integration-tested boundaries (Testcontainers / Aspire). Snapshot or contract test for wire format?

You don't ask all of these every time — you ask the ones the artifact (and the docs) have **not** answered.

## Output

When the tree is resolved:

- **Spec/plan changes** — write resolutions back into the original artifact, don't keep them in chat.
- **Glossary updates** — already inline; verify the file is consistent.
- **New ADRs** — written to the discovered ADR location with proper numbering.

If grilling produced enough new constraints to invalidate the design, say so and recommend handing back to `brainstorming` — better to redesign than to plan around a broken model.

## Cross-references

- `grill-me` — lighter sibling. Use when no docs exist.
- `brainstorming` — generates a NEW design. Hand off to it if grilling reveals "we don't actually have a design yet".
- `writing-plans` — comes after grilling resolves. Pass the updated spec to it.
- `rider-mcp-first` — for code cross-references in .NET solutions, use Rider MCP semantic ops, not `Grep`.

## Anti-patterns

- **Bulk questionnaire** — a numbered list of ten questions in one message is a brainstorming relapse, not grilling.
- **No recommendation** — asking without proposing forces the user to do your job.
- **Asking what the docs already answer** — read the glossary and ADRs first. Surfacing a decision that's already in ADR-007 is your bug, not the user's.
- **Updating the glossary with implementation noise** — `OrderRepository`, `IFooHandler` are implementation, not domain. Glossary terms are concepts a domain expert would use.
- **ADR spam** — if the decision is easy to reverse, skip the ADR. You'll just reverse it.
- **Co-designing** — grilling pressure-tests an existing design. If you're drafting it with the user, exit to `brainstorming`.

---

*Adapted from [mattpocock/skills/engineering/grill-with-docs](https://github.com/mattpocock/skills/tree/main/skills/engineering/grill-with-docs) (MIT, © 2026 Matt Pocock). Modifications: path discovery (instead of hardcoded `CONTEXT.md` / `docs/adr/`), .NET domain-first checklist, `AskUserQuestion` deferred-tool preload, `rider-mcp-first` integration for code cross-references, explicit boundary against `grill-me` and `brainstorming`.*

---
name: grill-me
description: "Use when the user wants a plan, spec, or design stress-tested — say \"grill me\", \"poke holes\", \"interrogate this design\", or has a draft they're not confident in. Walks the decision tree branch-by-branch, one focused question at a time, with a recommended answer for each."
---

# Grill Me

Interview the user relentlessly about an existing plan, spec, or design until every branch of the decision tree is resolved. **You are attacking the design, not co-authoring it.** Your job is to surface the assumptions, gaps, and unforced choices the user has not yet examined.

**Announce at start:** "I'm using the grill-me skill to stress-test this. I'll ask one focused question at a time and propose an answer with each."

## When to use this skill — and when not to

Use this when the input already exists:

- A draft spec from `brainstorming` that the user wants harder pressure on (the brainstorming cap of 5–8 questions can leave gaps in non-trivial designs).
- A `## Domain Model` section in a `writing-plans` document that feels thin — invariants, FK cardinality, or idempotency aren't pinned down.
- A user-supplied document, ticket, or napkin sketch the user wants challenged before they commit to it.

**Do not use this** to *generate* a design from a blank slate — that's `brainstorming`. If the user has nothing concrete yet, hand off to `brainstorming` first.

**If the project has a glossary file (`CONTEXT.md` / `project_conventions.md` / `Resources/Specifications/V*_Architecture_Definition.md`) OR an ADR log (`docs/adr/*.md` / `Resources/Specifications/*Decisions*.md`), prefer `grill-with-docs`** — it does the same Socratic interrogation but cross-checks user terminology against the glossary, cross-references claims with the code, and writes resolutions back into the docs (inline glossary updates + ADR offers when justified). Use plain `grill-me` only when no documentation infrastructure exists.

## How to grill

1. **Read the artifact.** Find the spec / plan / message the user is asking you to grill. If it's not obvious, ask which one.
2. **Map the decision tree before you ask anything.** List the open branches in your head: domain boundaries, aggregate invariants, persistence and concurrency, transactional boundaries, failure modes, idempotency, API contract (status codes, versioning, breaking changes), security, observability, deployment topology, performance budgets, test strategy. Identify which decisions block other decisions.
3. **Walk the tree top-down.** Resolve parents before children. Don't drill into "should this endpoint return 409 or 422" before you've settled "is this command idempotent."
4. **Ask one question at a time.** Never bundle. Wait for the answer before composing the next question — answers reshape the remaining tree.
5. **Always provide a recommended answer.** Phrase it: *"Recommended: X. Reason: Y."* The user pushes back, accepts, or refines. Never ask an open-ended "what do you think?" — that's brainstorming, not grilling.
6. **Prefer the codebase to the user.** If a question is answerable by reading code, configuration, migrations, recent commits, or referenced docs, **read first, ask only if still ambiguous.** "Does this aggregate already exist?" is a `Grep` away.
7. **Use `AskUserQuestion` for choice-shaped questions** (2–4 distinct options). Free-text only when the answer space is genuinely open (a name, a number, a free-form rationale). The first option in `AskUserQuestion` is your recommendation, labeled "(Recommended)".
   - **Deferred-tool note**: In Claude Code 2.x+, `AskUserQuestion` may appear in a `<system-reminder>` listing deferred tools. If so, call `ToolSearch` with `"select:AskUserQuestion"` once at session start to load its schema — otherwise calls fail with `InputValidationError` and the skill silently degrades to text "1, 2, 3" lists.
8. **Push back on hand-waving.** "We'll figure it out later" and "it should be fine" are not answers — they are unresolved branches. Mark them and return.
9. **Stop when the tree is resolved**, not when the user gets tired. If the user wants to stop early, summarize the *unresolved* branches as risks before exiting.

## What to grill on — domain-first checklist

This skillset assumes domain-first design. Ensure every grilling pass covers at minimum:

- **Aggregates and invariants.** Which type owns the invariant? What rule must hold across the aggregate? What happens on partial update?
- **Identity and references.** Surrogate vs natural keys. FK cardinality and direction. Cascade behavior. Cross-aggregate references via ID, not navigation.
- **Concurrency.** Optimistic or pessimistic? Row version? Conflict resolution policy? What does the user see on conflict?
- **Transactions.** Boundary per request, per aggregate, per saga? What's the rollback story for the multi-step path?
- **Idempotency.** Which operations are safe to retry? Where does the dedup key live? TTL?
- **Failure and partial state.** What if the external call succeeds but the local commit fails? What's reconciled, by whom, when?
- **API contract.** Status codes for each branch. Versioning strategy. Which fields are append-only vs replaceable. Backward-compat for existing callers.
- **Security and authz.** Who can call this? What does the principal need to assert? Where is that check enforced?
- **Observability.** What's logged at info vs warn vs error? What's the correlation ID story? What metric proves the feature works in prod?
- **Test strategy.** Unit-tested invariants. Integration-tested boundaries (Testcontainers). What's the snapshot or contract test for the wire format?

You don't ask all of these — you ask the ones the artifact has *not* answered.

## Output

When the tree is resolved, write the resolutions back into the original artifact (spec or plan), don't keep them in chat. If the user opened with a doc, edit the doc. If the grilling produced enough new constraints to invalidate the design, say so and recommend handing back to `brainstorming` — better to redesign than to plan around a broken model.

## Anti-patterns

- **Bulk questionnaires.** A numbered list of ten questions in one message is a brainstorming relapse, not grilling.
- **No recommendation.** Asking without proposing forces the user to do your job. Always offer an answer.
- **Asking what code can answer.** Read first. The user gets impatient — rightly — when grilled on facts in the repo.
- **Stopping at the first "fine".** "Fine" is not a resolution. Drill until the *reason* is articulated.
- **Co-designing.** Grilling pressure-tests an existing design. If you find yourself drafting the design with the user, you've drifted into `brainstorming` — exit and switch.

---

*Adapted from [mattpocock/skills/grill-me](https://github.com/mattpocock/skills/tree/main/grill-me) (MIT, © 2026 Matt Pocock). Modifications: domain-first checklist, `AskUserQuestion` convention, explicit boundary against `brainstorming` and `writing-plans`.*

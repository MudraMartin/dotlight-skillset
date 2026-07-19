---
name: writing-plans
description: Use when you have a spec or requirements for a multi-step task, before touching code
---

# Writing Plans

## Overview

Write comprehensive implementation plans assuming the engineer has zero context for our codebase and questionable taste. Document everything they need to know: which files to touch for each task, code, testing, docs they might need to check, how to test it. Give them the whole plan as bite-sized tasks. DRY. YAGNI. TDD. Frequent commits.

Assume they are a skilled developer, but know almost nothing about our toolset or problem domain. Assume they don't know good test design very well.

**Announce at start:** "I'm using the writing-plans skill to create the implementation plan."

**Context:** This runs after `brainstorming`. Whether a git worktree is used depends on the size of the feature — for larger features that will span multiple sessions, brainstorming should have already created a worktree via `using-git-worktrees`. For smaller features, work directly on a feature branch. See CLAUDE.md for the rule. The `subagent-driven-development` skill is deliberately excluded; use `executing-plans` instead.

**Save plans to:** `docs/superpowers/plans/YYYY-MM-DD-<feature-name>.md`
- (User preferences for plan location override this default)

## Domain-First Rule (.NET project)

Before defining ANY task steps, the plan MUST have a `## Domain Model` section that lists:
- Every aggregate root and its invariants (the rules that must hold true across the aggregate at all times)
- Every entity and value object with its properties and relationships (FK name, cardinality, cascade behavior)
- Every external integration point and its contract (remote resource identifiers, HTTP status code contract, idempotency requirements)

This section comes from the brainstorming design doc. If it's missing or vague, **STOP** and loop back to brainstorming before proceeding. A plan without a domain model produces entities without relationships — a common failure mode when TDD is done without a designed model. Consult `type-design-performance` and `api-design` when drafting this section.

## Persistence-First Rule (.NET project)

Every plan MUST have a `## Persistence Model` section. If the feature touches no persisted state, it says exactly `None — no schema changes` (absence means "not considered"; `None` means "decided"). If any task will add or alter a table, migration, entity, or mapping, derive the section from the `## Domain Model` BEFORE defining task steps — the schema is designed here, not discovered by tests. A schema accreted from TDD cycles is shaped like the tests, not like the domain. List:

- Every table: columns with types, nullability (nullable is a per-column decision, never a default), defaults
- Keys and constraints: PK strategy, every FK with target and delete behavior, a unique constraint for every domain uniqueness rule, check constraints where the DB can enforce an invariant
- Indexes: every FK column, plus known query paths
- Lifecycle pattern per table: name the chosen pattern from the `database-design-conventions` catalog (e.g. temporal `active_from`/`active_to` with `NULL` = current, side history table, soft delete, plain mutable) and confirm it matches what the existing schema already uses — **one schema, one dialect**. Any deliberate deviation gets a one-line justification here.

Compact per-table format:

```markdown
### Price
| Column | Type | Null | Notes |
|---|---|---|---|
| id | bigint identity | no | PK |
| product_key | uuid | no | FK → products(product_key) ON DELETE RESTRICT |
| amount | numeric(19,4) | no | |
| active_from / active_to | timestamptz | no / yes | temporal pattern, NULL = current |
Constraints: ux_prices_current UNIQUE (product_key) WHERE active_to IS NULL; ck_prices_period
Indexes: ix_prices_product_key
```

If the `## Domain Model` is too thin to derive this section, **STOP** and loop back to brainstorming. Consult `database-design-conventions` for the pattern catalog and `efcore-patterns` for migration mechanics. `database-review` will later check the diff against this section.

## Minimalism Gate

A plan earns every artifact it creates.

- Every plan MUST contain a `## Non-Goals / Deliberately Not Built` section: deliberate omissions, each with a one-line reason ("add when X"). Writing them down keeps the next reader from building them "to be safe".
- Every file in the File Structure section must name the requirement that forces its existence. An interface, mapper, or helper with no forcing requirement is deleted from the plan. (Shallow-module shapes catalog: see `improve-architecture`.)

## Scope Check

If the spec covers multiple independent subsystems, it should have been broken into sub-project specs during brainstorming. If it wasn't, suggest breaking this into separate plans — one per subsystem. Each plan should produce working, testable software on its own.

## File Structure

Before defining tasks, map out which files will be created or modified and what each one is responsible for. This is where decomposition decisions get locked in.

- Design units with clear boundaries and well-defined interfaces. Each file should have one clear responsibility.
- You reason best about code you can hold in context at once, and your edits are more reliable when files are focused. Prefer smaller, focused files over large ones that do too much.
- Files that change together should live together. Split by responsibility, not by technical layer.
- In existing codebases, follow established patterns. If the codebase uses large files, don't unilaterally restructure - but if a file you're modifying has grown unwieldy, including a split in the plan is reasonable.

This structure informs the task decomposition. Each task should produce self-contained changes that make sense independently.

## Task Right-Sizing

A task is the smallest unit that carries its own test cycle and is worth a
fresh reviewer's gate. When drawing task boundaries: fold setup,
configuration, scaffolding, and documentation steps into the task whose
deliverable needs them; split only where a reviewer could meaningfully
reject one task while approving its neighbor. Each task ends with an
independently testable deliverable.

## Bite-Sized Task Granularity

**Each step is one action (2-5 minutes):**
- "Write the failing test" - step
- "Run it to make sure it fails" - step
- "Implement the minimal code to make the test pass" - step
- "Run the tests and make sure they pass" - step
- "Commit" - step

## Plan Document Header

**Every plan MUST start with this header:**

```markdown
# [Feature Name] Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use dotlight-skillset:executing-plans to implement this plan task-by-task. (subagent-driven-development is deliberately excluded in this project — see CLAUDE.md.) Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** [One sentence describing what this builds]

**Architecture:** [2-3 sentences about approach]

**Tech Stack:** [Key technologies/libraries]

## Global Constraints

[The spec's project-wide requirements — version floors, dependency limits,
naming and copy rules, platform requirements — one line each, with exact
values copied verbatim from the spec. Every task's requirements implicitly
include this section.]

Example: "Database schema follows database-design-conventions (temporal versioning, naming, normalization gates)."

## Non-Goals / Deliberately Not Built

[Deliberate omissions, one line each with the reason: "X — add when Y."]

---
```

## Task Structure

````markdown
### Task N: [Component Name]

**Files:**
- Create: `exact/path/to/file.py`
- Modify: `exact/path/to/existing.py:123-145`
- Test: `tests/exact/path/to/test.py`

**Interfaces:**
- Consumes: [what this task uses from earlier tasks — exact signatures]
- Produces: [what later tasks rely on — exact function names, parameter
  and return types. A task's implementer sees only their own task; this
  block is how they learn the names and types neighboring tasks use.]

- [ ] **Step 1: Write the failing test**

```python
def test_specific_behavior():
    result = function(input)
    assert result == expected
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/path/test.py::test_name -v`
Expected: FAIL with "function not defined"

- [ ] **Step 3: Write minimal implementation**

```python
def function(input):
    return expected
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/path/test.py::test_name -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tests/path/test.py src/path/file.py
git commit -m "feat: add specific feature"
```
````

## Review Gates

Group tasks into batches that each end at a natural checkpoint. In the plan, every batch ends with an explicit review-gate step, run by the driver (the session running the plan) — not by whoever implemented the batch's tasks:

```markdown
- [ ] **Review gate — Batch N:** Review the batch's diff against the spec sections it delivers and the Global Constraints. Fix findings and re-run the gate; the batch is complete only when the verdict is clean.
```

The plan's last section is a final review against the full spec:

```markdown
## Final review

- [ ] Review the complete implementation against the full spec, including Global Constraints and the Non-Goals section (nothing listed there crept in). Loop on findings until the verdict is clean.
```

## No Placeholders

Every step must contain the actual content an engineer needs. These are **plan failures** — never write them:
- "TBD", "TODO", "implement later", "fill in details"
- "Add appropriate error handling" / "add validation" / "handle edge cases"
- "Write tests for the above" (without actual test code)
- A vague "similar to Task N" (see the pattern-reference rule below for the precise form)
- Steps that describe what to do without showing how (code blocks required for code steps)
- References to types, functions, or methods not defined in any task

Complete code is required for novel logic. For a repeated pattern, don't repeat the code verbatim — write "as in Task N's code block, applied to `<target>`" and state exactly what differs. Plans must stay reviewable by a human.

## Remember
- Exact file paths always
- Complete code for novel logic; repeated patterns reference the original ("as in Task N's code block, applied to `<target>`")
- Exact commands with expected output
- DRY, YAGNI, TDD, frequent commits

## Self-Review

After writing the complete plan, look at the spec with fresh eyes and check the plan against it. This is a checklist you run yourself — not a subagent dispatch.

**1. Spec coverage:** Skim each section/requirement in the spec. Can you point to a task that implements it? List any gaps.

**2. Reverse coverage:** Every task points at a spec requirement. A task with no requirement is deleted, not kept.

**3. Placeholder scan:** Search your plan for red flags — any of the patterns from the "No Placeholders" section above. Fix them.

**4. Type consistency:** Do the types, method signatures, and property names you used in later tasks match what you defined in earlier tasks? A function called `clearLayers()` in Task 3 but `clearFullLayers()` in Task 7 is a bug.

If you find issues, fix them inline. No need to re-review — just fix and move on. If you find a spec requirement with no task, add the task. If you find a task with no requirement, delete it.

## Execution Handoff

After saving the plan, hand off to execution:

**"Plan complete and saved to `docs/superpowers/plans/<filename>.md`. Ready to execute?"**

- **REQUIRED SUB-SKILL:** Use dotlight-skillset:executing-plans
- Batch execution with checkpoints — each batch ends at its review gate, and the plan closes with the Final review

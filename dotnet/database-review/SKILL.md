---
name: database-review
description: Use when a diff touches migrations, tables, entities, or ORM mappings — schema quality gate alongside dotnet-slopwatch and crap-analysis. Flags dialect deviations, test-shaped schema smells, broken versioning mechanics. Critical findings block merge.
---

# Database Review: Schema Quality Gate

## When to Use This Skill

Run this review at `requesting-code-review` time, in the same pass as `dotnet-slopwatch` and `crap-analysis`, whenever the diff touches persisted state:

| Diff contains | Typical paths |
|---|---|
| Migrations | `**/Migrations/**`, `*.sql` schema scripts |
| EF Core model | `IEntityTypeConfiguration<>` classes, `OnModelCreating`, `*ModelSnapshot.cs` |
| NHibernate mappings | `*.hbm.xml`, FluentNHibernate `*Map.cs`, mapping-by-code classes |
| Persisted entities | new or changed mapped properties |

This closes a real blind spot: `crap-analysis` excludes `**/Migrations/**` from coverage and `slopwatch` only checks C#/csproj shortcuts. Without this skill, schema changes ship unreviewed.

---

## What is a Test-Shaped Schema?

TDD discovers behavior. It does not design persistence. Applied literally, "minimal code to pass" accretes a schema tailor-made for the tests — one nullable column per assertion — instead of a coherent persistence layer derived from the domain model. Reviewing code without reviewing the schema lets this debt through, and schema debt is the most expensive kind: it survives refactors and requires migrations to undo.

| Smell | Example | Why it's bad |
|---|---|---|
| Test-only column | Column added in the same diff as the only test asserting it | Schema becomes a test fixture, not a model |
| Nullable-everything | Every non-key column nullable "to make inserts easy" | DB enforces nothing; invariants live only in tests |
| Missing FK | `CustomerId bigint` with no constraint | Orphans possible; the relationship exists only in C# |
| Fixture mirror | Table shaped exactly like a test's arrange block | Accidental structure, not design |
| God-table accretion | One more column per user story on the same wide table | Unbounded coupling, no aggregate boundary |

**The fix is upstream:** the plan's `## Persistence Model` section designs the schema before TDD starts. This review verifies the diff matches that design — and matches the rest of the schema.

---

## The Supreme Value: One Schema, One Dialect

Every schema speaks a dialect: versioning patterns, a naming style, a key strategy, an audit-column set, a soft-delete convention. **This review checks consistency with THIS schema's dialect, not conformance to a universal standard.**

Different tables may legitimately use different persistence patterns — the right tool for the right thing. One entity keeps in-table temporal versions, another copies history to a side table, a third is plain mutable state. What is never legitimate is a second dialect of the same concept: once date-range versioning is spelled `ActiveFrom`/`ActiveTo` with `NULL` = current, a sibling table inventing `ValidFrom`/`ValidUntil` or an `IsCurrent` flag for the same concept is a Critical finding, regardless of which spelling is "better". Each pattern in the schema has exactly one canonical realization — same column names, same semantics, same constraint mechanics.

---

## Review Procedure

**Step 1 — Gather the schema diff:**

```bash
git diff --name-only $BASE_SHA..$HEAD_SHA -- '*Migrations*' '*.sql' '*.hbm.xml' '*Map.cs' '*Configuration*.cs' '*ModelSnapshot.cs'
git diff $BASE_SHA..$HEAD_SHA -- <those files>
```

**Step 2 — Fingerprint the incumbent dialect.** Read the CURRENT full model, not just the diff (EF Core: the `*ModelSnapshot.cs` is the whole schema in one file; NHibernate: the mappings directory; otherwise the migrations history). In Rider-attached sessions use `mcp__rider__*` per `rider-mcp-first`. Record:

- Naming: table case and plurality, `Id` form, FK/index/constraint name templates
- Key strategy: identity/bigserial vs Guid (v4/v7) vs natural keys
- Versioning pattern(s): which ones exist, which column names, what marks "current"
- Audit columns: the established set and exact names
- Soft delete: mechanism, or none
- Type dialect: `timestamptz` vs `timestamp`, `text` vs `varchar(n)`, money precision, enum storage (string/int/pg enum)

**Precedence:** the plan's `## Persistence Model` and any project conventions doc are authoritative; the inferred fingerprint is the fallback. Greenfield schema (no incumbent): the plan's declared conventions are the fingerprint, and uniformity rules run between the new tables themselves.

**Step 3 — Load the plan's `## Persistence Model`.** Every table/column in the diff must appear there (or the section says `None` and the diff should contain no schema change at all — that is drift, report it).

**Step 4 — Run the rules below** against each new or altered table, column, constraint, and mapping.

---

## Detection Rules

### Pattern Uniformity (DBR1xx) — consistent with THIS schema's dialect

| Rule | Severity | What It Catches |
|------|----------|-----------------|
| DBR101 | Critical | Second dialect of an established pattern — new/changed table re-spells an existing concept (e.g. schema versions via `ActiveFrom`/`ActiveTo` with `NULL` = current; diff introduces `ValidFrom`/`ValidUntil`, an `IsCurrent` flag, or a `Status` enum for the same concern). Choosing a *different pattern* for a different need is fine when the plan says so; re-spelling the *same pattern* never is |
| DBR102 | Important | Naming deviation — table/column/index/FK/constraint names break the established templates (case style, plurality, `Id` form). Trivial to fix now; a migration to fix after merge |
| DBR103 | Critical | Key-strategy deviation — PK type/generation differs from the established strategy (e.g. Guid PK in an identity-PK schema). FKs propagate the wrong type schema-wide |
| DBR104 | Critical | Audit-column deviation — established audit set (`CreatedAtUtc`, `CreatedBy`, …) omitted on a new table, or variant names invented (`InsertedOn`) |
| DBR105 | Critical | Soft-delete deviation — mixing `IsDeleted` flag, `DeletedAt`, and hard delete across sibling tables; queries that forget one filter style return ghosts |
| DBR106 | Important | Type-dialect deviation for the same semantic — `timestamp` where the schema uses `timestamptz`, `float` for money where the schema uses `numeric(19,4)`, enum stored as int where siblings store string |

Pattern-level breaks (a second dialect of the same concept) are Critical; style-level breaks (how a name is spelled) are Important. A deviation the plan's `## Persistence Model` explicitly justifies is not a finding — an *undocumented* deviation always is.

### Test-Shaped Schema Smells (DBR2xx)

| Rule | Severity | What It Catches |
|------|----------|-----------------|
| DBR201 | Critical | Test-only column — introduced in the same diff as the only test asserting it, absent from the `## Domain Model` / `## Persistence Model`, unused by any production code path |
| DBR202 | Critical | Nullable-everything entity — nullability does not match domain optionality; majority of non-key columns nullable with no justification |
| DBR203 | Critical | Missing FK or constraint the domain model implies — plan states a relationship or invariant; schema has a bare `*Id` column with no FK, or no unique/check where the DB could enforce the invariant |
| DBR204 | Important | Fixture-mirror table — structure matches a test's arrange block 1:1 rather than a normalized entity |
| DBR205 | Important | No DB-enforced invariants at all — new table with nothing beyond a PK (no NOT NULL, no unique, no check, no FK): persistence as a property bag |
| DBR206 | Important | God-table accretion — an already-wide table gains another loosely related column instead of a related table; one-column-per-user-story history is the tell |

### Design Basics (DBR3xx)

| Rule | Severity | What It Catches |
|------|----------|-----------------|
| DBR301 | Important | 3NF violation without documented reason — repeating groups, CSV-in-a-column, transitive-dependency duplication. Deliberate denormalization (e.g. TimescaleDB ingest columns, read models) is fine when the plan says so |
| DBR302 | Critical | Missing unique constraint for a domain uniqueness rule — "email unique per tenant" needs a composite unique index, not a C# check |
| DBR303 | Important | FK column without an index — Postgres does not auto-index FK columns |
| DBR304 | Critical | Broken temporal-versioning mechanics — for date-range versioned tables, all three guards must hold: (1) a partial unique index enforcing exactly one current row per entity, (2) an overlap guard on validity periods (btree_gist exclusion constraint or an equally strong guarded write path), (3) a period sanity check (`ActiveTo` NULL or > `ActiveFrom`). Canonical DDL per pattern: `database-design-conventions` → temporal-versioning |
| DBR305 | Critical | FK targets a version-row PK where the domain means the durable entity — references silently go stale when a new version row is written; point FKs at the durable entity key |
| DBR306 | Important | Delete behavior unspecified or wrong — cascade crossing an aggregate boundary, or cascade from a version table |

---

## Severity and Gating

| Severity | Meaning | Gate |
|---|---|---|
| Critical | Schema integrity or dialect consistency compromised | **Blocks merge.** Same loop as slopwatch/crap criticals: `receiving-code-review` → `executing-plans`, fix, re-review |
| Important | Design debt that compounds; cheap now, a migration later | Fix before `finishing-a-development-branch`, or human explicitly waives with a recorded reason |
| Minor | Style and polish | Note in the review output |

---

## Output Format

Report in the same shape as the code-reviewer output so findings merge into one review:

```
### Schema Dialect (fingerprint)
Versioning: ActiveFrom/ActiveTo, NULL = current. Keys: bigint identity.
Audit: CreatedAtUtc/CreatedBy on all tables. Soft delete: none. Naming: PascalCase singular.

### Findings

#### Critical
1. DBR101 — Discount versioned via ValidFrom/ValidUntil
   - File: Migrations/20260711_AddDiscount.cs:18
   - Schema dialect is ActiveFrom/ActiveTo (see Price, Contract). Rename and follow the pattern.
2. DBR304 — Discount has no partial unique index on "current"
   - Two current rows per product possible under concurrent writes.
   - Fix: CREATE UNIQUE INDEX ... WHERE "ActiveTo" IS NULL (see database-design-conventions → temporal).

#### Important
1. DBR303 — Discount.ProductId FK has no index (Migrations/20260711_AddDiscount.cs:24)

### Assessment
**Ready to merge:** No — two Critical schema findings. Loop back via receiving-code-review.
```

---

## When a Deviation Is Justified (Rare)

| Scenario | Action | Required |
|----------|--------|----------|
| TimescaleDB hypertable (FK limitations, deliberate time-series denormalization) | Allow | Named in the plan's `## Persistence Model` |
| Integrating a third-party or legacy table contract | Allow | Documented in plan; deviation quarantined to that table |
| Measured performance denormalization | Allow DBR301 | Query-plan or benchmark evidence in the PR |
| Schema mid-migration between dialects | Allow temporarily | Conventions doc states the target dialect and the migration plan |

**Invalid reasons:** "the test needed it" (that IS the smell) · "it's just one column" · "we'll unify the patterns later" (without a written plan) · "that's what the ORM scaffolded".

---

## Relationship to Other Skills

- **`database-design-conventions`** (pattern catalog + decision framework) — owns *which* pattern to choose and *how each is built correctly*. This review never recommends patterns; it flags inconsistency and broken mechanics, and its remediation text points there.
- **`writing-plans` → `## Persistence Model`** — the design this review verifies the diff against. No section, or a schema diff under a `None` section, is itself a finding (process drift).
- **`dotnet-slopwatch` / `crap-analysis`** — sibling gates in the same `requesting-code-review` pass; identical Critical-blocks-merge semantics.

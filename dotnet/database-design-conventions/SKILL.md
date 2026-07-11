---
name: database-design-conventions
description: Use when designing or changing a database schema — tables, entities, mappings, migrations — on Postgres/TimescaleDB with EF Core or NHibernate. Lifecycle-pattern catalog (incl. ActiveFrom/ActiveTo versioning), naming, keys, normalization gate. One schema = one dialect.
---

# Database Design Conventions

The house dialect for persistence design. Consumed at design time — when `brainstorming` touches persistence and when `writing-plans` authors the `## Persistence Model` section. `database-review` later checks diffs against this catalog.

## The Meta-Rule: One Schema, One Dialect

Different tables may use different persistence patterns — the right tool for the right thing. What is never allowed is a second spelling of the same concept. Each pattern below has exactly ONE canonical realization (names, semantics, constraints). If the schema versions by date range, it is spelled `active_from`/`active_to` everywhere — a sibling table inventing `valid_from`/`valid_until` or `start_from`/`start_to` for the same concept is a defect, regardless of taste. New schema element → detect what dialect the schema already speaks → follow it, or justify the deviation in the plan's `## Persistence Model`.

## Lifecycle Pattern Catalog

Choose deliberately, per table, at design time:

| Pattern | Choose when | Canonical realization |
|---|---|---|
| Plain mutable | No history questions, no deletion-integrity needs | Ordinary columns; `updated_at`/`updated_by` allowed |
| Soft delete | Rows must vanish from lists but FKs/history must survive | `deleted_at timestamptz NULL` (never boolean `is_deleted` — the timestamp carries *when*) |
| In-table temporal versioning | Business asks "what was it on date X?"; versions are queried/joined like current data | `active_from`/`active_to`, `NULL` `active_to` = current (SCD Type 2). See below |
| Side history table | History kept for audit, read rarely, never joined in hot paths | `<table>_history`: mirror of columns + `archived_at timestamptz NOT NULL DEFAULT now()`, `archived_by text NOT NULL`, `operation char(1)` (U/D); filled in the same transaction as the change |
| Append-only fact | Immutable measurements/events | Insert-only; TimescaleDB hypertable candidate; no `updated_at` ever |

Decision test in order: immutable fact → append-only. "What was it on date X?" answered by queries/joins → in-table temporal. History for audits only → side history table. Must disappear but referential integrity survives → soft delete. Otherwise → plain mutable.

## The Rules

**RULE 1 — One schema, one dialect.** Mechanisms may differ per need; names and semantics for the same concept never do (see Meta-Rule).

**RULE 2 — Version what has history, with the canonical pair.** A table chosen for in-table versioning gets `active_from timestamptz NOT NULL` and `active_to timestamptz NULL`. `active_to IS NULL` marks the current version. Ranges are half-open `[)`: successor `active_from` equals predecessor `active_to`.

**RULE 3 — Two constraints or it is not versioned.** Every versioned table carries BOTH: a partial unique index (`CREATE UNIQUE INDEX ux_<table>_current ON <table> (<entity_key>) WHERE active_to IS NULL`) and an overlap guard (`EXCLUDE USING gist (<entity_key> WITH =, tstzrange(active_from, active_to, '[)') WITH &&)`, requires `btree_gist`), plus `CHECK (active_to IS NULL OR active_to > active_from)`. Application-only enforcement WILL be violated by concurrent writers.

**RULE 4 — Never UPDATE a business attribute on a versioned row.** Close the current row (`SET active_to = now()`) and INSERT the successor in the same transaction — a repository/store method, never an entity setter.

**RULE 5 — As-of queries use `active_from <= :at AND (active_to > :at OR active_to IS NULL)`.** Never `BETWEEN`, never `<=` on both ends.

**RULE 6 — Two keys per versioned entity.** Surrogate `id` identifies the version row; the durable entity key identifies the entity across versions. FKs reference the durable key by default (via a slim anchor table when a DB-level FK is needed); reference the version-row `id` only to pin a record to an exact historical version (invoice line → the price version billed) and say so in the migration.

**RULE 7 — Soft delete XOR versioning.** `deleted_at` only on unversioned tables; a versioned entity is deleted by closing its final version with no successor. Never both on one table without a written justification.

**RULE 8 — 3NF by default; every denormalization is written down.** Run the normalization gate (below) before DDL. Sanctioned targets: hypertable ingest columns and read models (see `database-performance`). Each duplicated fact names its source of truth and refresh strategy in a migration comment.

**RULE 9 — No speculative columns.** Every column traces to a requirement in the plan's `## Domain Model`. "We might need it later" is not a requirement; adding a column later is one expand migration.

**RULE 10 — Hypertables are never versioned tables.** Unique indexes on hypertables must include the partitioning column, so the one-current-row index is impossible, and FKs cannot reference hypertables. Measurements are append-only facts; version the metadata in plain tables; hypertable rows carry the durable entity key and join as-of by the measurement timestamp.

**RULE 11 — Migrations are expand-contract.** Expand (add nullable/defaulted) → backfill in batches → tighten (`NOT NULL`, constraints — `NOT VALID` then `VALIDATE` on large tables) → contract (drop old columns in a LATER release). Never rename in place. Every migration reversible or explicitly marked irreversible with a reason.

## Temporal Versioning Core

Canonical DDL for an in-table versioned entity (full walkthrough, anchor-table pattern, transaction template and ORM mappings: [temporal-versioning.md](temporal-versioning.md)):

```sql
CREATE TABLE price (
    id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, -- version-row key
    product_key  uuid        NOT NULL,                            -- durable entity key
    amount       numeric(19,4) NOT NULL,
    active_from  timestamptz NOT NULL,
    active_to    timestamptz NULL,                                -- NULL = current
    created_at   timestamptz NOT NULL DEFAULT now(),
    created_by   text        NOT NULL
);
CREATE UNIQUE INDEX ux_price_current ON price (product_key) WHERE active_to IS NULL;
ALTER TABLE price ADD CONSTRAINT ex_price_no_overlap
  EXCLUDE USING gist (product_key WITH =, tstzrange(active_from, active_to, '[)') WITH &&);
ALTER TABLE price ADD CONSTRAINT ck_price_period CHECK (active_to IS NULL OR active_to > active_from);
```

Distinguish **system time** (`created_at` — when the row was written) from **business validity** (`active_from`/`active_to`). Conflating them is the #1 temporal modeling bug. Versioned tables never get `updated_at` — the version chain IS the update history.

## FK Strategy to Versioned Tables

| Referencing record means | FK target | Example |
|---|---|---|
| "the entity, whatever its current/as-of state" (default) | Durable entity key — via anchor table for DB-level FK | Order line → product |
| "exactly the version that was in force" | Version-row `id`, documented in the migration | Invoice line → the price version billed; audit finding → the config version inspected |

## Naming Conventions

snake_case for all SQL identifiers (PascalCase lives in .NET entities only; use `EFCore.NamingConventions` `UseSnakeCaseNamingConvention()` / an NHibernate naming strategy — see [temporal-versioning.md](temporal-versioning.md)). Tables plural. PK column `id`. FK column `<referenced_entity>_id` (`<entity>_key` for durable-key references). **Always name indexes and constraints explicitly** — never rely on auto-naming, and note EF Core's generated default names must be overridden to match:

| Prefix | Object |
|---|---|
| `pk_` | primary key |
| `fk_<table>_<referenced>` | foreign key (always paired with an `ix_` on the FK column — Postgres does not auto-index FKs) |
| `ix_` / `ux_` | index / unique index |
| `ex_` | exclusion constraint |
| `ck_` | check constraint |

## Keys and Audit Columns

Keys follow pg-aiguide's rule, restated: `bigint GENERATED ALWAYS AS IDENTITY` for internal PKs (never `serial`); `uuid` — generated as UUIDv7 — for externally-exposed identifiers and durable entity keys. Natural keys as `UNIQUE`, rarely as PK. (NH note: the `identity` generator forces a round-trip per INSERT and disables ADO.NET insert batching — batch-heavy NHibernate tables use a Postgres sequence with a pooled/hilo optimizer instead; see `nhibernate-patterns`.)

Audit columns: `created_at timestamptz NOT NULL DEFAULT now()` + `created_by text NOT NULL` on every table. `updated_at`/`updated_by` ONLY on plain-mutable tables — never "everywhere just in case".

## Normalization Gate (run before any DDL)

1. List candidate keys per table.
2. **1NF:** no repeating groups or comma-packed values; `jsonb` only for genuinely schema-free payloads, never for attributes used in `WHERE`/`JOIN`/`ORDER BY`.
3. **2NF:** for composite keys, no column depending on part of the key.
4. **3NF/BCNF:** scan column pairs that always change together (`country_code`/`country_name`, `unit_id`/`unit_symbol`) — a transitive dependency means extract a table; every determinant must be a candidate key.
5. Every deliberately duplicated fact names its source of truth, refresh strategy, and staleness tolerance in a migration comment.

The same pass doubles as the anti-overengineering gate: no speculative columns, no just-in-case tables (RULE 9). Worked violation examples: [normalization-check.md](normalization-check.md).

## TimescaleDB Interaction Rules

- Hypertables hold immutable facts only (RULE 10); anything with a lifecycle (sensor metadata, tariffs, configs, assignments) lives in plain versioned tables.
- Hypertable rows carry the durable entity key; the measurement timestamp selects the metadata version (as-of join — cookbook in [temporal-versioning.md](temporal-versioning.md)).
- Denormalizing a few metadata columns into the hypertable row at ingest is a sanctioned, documented denormalization (avoids the as-of join on hot paths).
- Hypertable mechanics (creation options, compression, chunk sizing, candidate scoring) are owned by the **pg-aiguide** companion plugin — defer, don't restate.

## ORM Mapping Rules

Full code samples in [temporal-versioning.md](temporal-versioning.md); the rules:

1. `active_to` maps as `DateTimeOffset?`; EF Core: `HasQueryFilter(e => e.ActiveTo == null)` so the default view is current-only; history/as-of queries call `IgnoreQueryFilters()` inside dedicated read-store methods.
2. EF Core pitfall — query filters propagate to navigations: a join through a versioned navigation silently drops historical rows; as-of queries must not mix filtered and unfiltered entities.
3. EF Core pitfall — required navigations to a filtered entity can yield unexpectedly empty results; prefer optional navigations or explicit joins for versioned targets.
4. Owned types are NOT the tool for versioning (they share the owner's lifecycle; version rows have independent identity).
5. NHibernate: a parameterized `filter-def` (condition `active_to is null`), enabled by default in the session-factory wrapper and disabled for history queries — never a class-level `where=` clause (unconditional, makes as-of impossible without raw SQL).
6. The close-and-insert write (RULE 4) is a repository/store method; exclusion constraints and `CREATE EXTENSION btree_gist` go through `migrationBuilder.Sql()` in EF Core / `IAuxiliaryDatabaseObject` in NHibernate — no fluent API exists.

## Red Flags — STOP if you catch yourself thinking

| Rationalization | Reality |
|---|---|
| "I'll version every table for consistency" | Versioning is opt-in per the catalog test. Consistency means one *dialect*, not one *pattern* everywhere |
| "I'll add `updated_at` everywhere just in case" | Audit set is per-pattern. Versioned tables never get it |
| "UPDATE the row now, versioning can come later" | Retrofitting history onto overwritten data is impossible — the data is gone |
| "The app enforces one-current-row, no index needed" | Concurrent writers WILL race. RULE 3 exists because this fails in production |
| "It has timestamps, I'll make it a hypertable" | Hypertables are for immutable facts. Lifecycle data in a hypertable can't be versioned or FK-referenced (RULE 10) |
| "I'll name it ValidFrom, it's clearer" | The schema already speaks `active_from`/`active_to`. One schema, one dialect (RULE 1) |
| "The test needs this column" | Columns come from the Domain Model, not from tests. Design it in the plan first (RULE 9) |

## Boundaries

- **Migration CLI mechanics** (commands, migration service): `efcore-patterns` for the EF Core project. NHibernate has no migration CLI — schema evolves via FluentMigrator/DbUp/ordered SQL scripts (see `nhibernate-patterns`); `SchemaExport`/`SchemaUpdate` generate schema, they do not version it. **Lock-safe SQL recipes** (`NOT VALID`/`VALIDATE`, `CREATE INDEX CONCURRENTLY`, batched backfills): pg-aiguide's `postgres-database-migration`.
- **Read-model shape, CQRS, query performance**: `database-performance`.
- **Review-time enforcement** of everything here: `database-review` (this skill owns the catalog; the review flags deviations).
- **Generic Postgres design + TimescaleDB mechanics**: the **pg-aiguide** companion plugin (recommended in README). Where its examples differ in style (`idx_` prefixes, unnamed indexes), the house prefixes above take precedence.
- In Rider-attached sessions inspect the ACTUAL schema via `mcp__rider__*` (per `rider-mcp-first`) before proposing changes.

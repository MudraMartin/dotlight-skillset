# Temporal Versioning — Full Walkthrough

Reference for `database-design-conventions` RULES 2–6. Canonical spelling: `active_from timestamptz NOT NULL`, `active_to timestamptz NULL`, `NULL` = current, half-open `[)` ranges.

## Contents

1. [Complete DDL with anchor table](#1-complete-ddl-with-anchor-table)
2. [Close-and-insert write pattern](#2-close-and-insert-write-pattern)
3. [As-of query cookbook](#3-as-of-query-cookbook)
4. [EF Core mapping](#4-ef-core-mapping)
5. [NHibernate mapping](#5-nhibernate-mapping)
6. [Side history table (canonical shape)](#6-side-history-table-canonical-shape)
7. [Migrations](#7-migrations)

## 1. Complete DDL with anchor table

The anchor table gives DB-level FKs a unique, durable target (the entity key repeats across version rows, so it can't be an FK target itself). Hypertables can also FK to the anchor (plain table) — FKs referencing hypertables are unsupported, the reverse is fine.

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Anchor: one row per entity, ever.
CREATE TABLE products (
    product_key uuid        PRIMARY KEY,           -- UUIDv7, generated in app code
    created_at  timestamptz NOT NULL DEFAULT now(),
    created_by  text        NOT NULL
);

-- Version table: one row per version.
CREATE TABLE prices (
    id          bigint GENERATED ALWAYS AS IDENTITY,
    product_key uuid          NOT NULL,
    amount      numeric(19,4) NOT NULL,
    currency    char(3)       NOT NULL,
    active_from timestamptz   NOT NULL,
    active_to   timestamptz   NULL,                -- NULL = current version
    created_at  timestamptz   NOT NULL DEFAULT now(),
    created_by  text          NOT NULL,
    CONSTRAINT pk_prices PRIMARY KEY (id),
    CONSTRAINT fk_prices_products FOREIGN KEY (product_key)
        REFERENCES products (product_key) ON DELETE RESTRICT,
    CONSTRAINT ck_prices_period CHECK (active_to IS NULL OR active_to > active_from)
);

CREATE INDEX ix_prices_product_key ON prices (product_key);          -- FK columns always indexed
CREATE UNIQUE INDEX ux_prices_current ON prices (product_key)
    WHERE active_to IS NULL;                                          -- exactly one current row
ALTER TABLE prices ADD CONSTRAINT ex_prices_no_overlap
    EXCLUDE USING gist (product_key WITH =,
                        tstzrange(active_from, active_to, '[)') WITH &&);  -- no overlapping validity
```

A transactional table referencing "the product" FKs the anchor; one pinning the exact billed price FKs `prices.id` (RULE 6 — document the pin in the migration):

```sql
CREATE TABLE invoice_lines (
    id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    product_key uuid   NOT NULL REFERENCES products (product_key),   -- the entity
    price_id    bigint NOT NULL REFERENCES prices (id),              -- pinned version (deliberate!)
    quantity    int    NOT NULL
);
```

## 2. Close-and-insert write pattern

Never `UPDATE` business attributes on a version row. One transaction, one timestamp for both sides of the seam:

```sql
BEGIN;
WITH closed AS (
    UPDATE prices
       SET active_to = :ts
     WHERE product_key = :key AND active_to IS NULL
 RETURNING product_key
)
INSERT INTO prices (product_key, amount, currency, active_from, created_by)
SELECT :key, :amount, :currency, :ts, :user
  FROM closed;      -- inserts nothing if there was no current row to close (first version: plain INSERT)
COMMIT;
```

Concurrency: two concurrent writers both try to close the same current row; the partial unique index + exclusion constraint make the loser fail loudly instead of corrupting history. Retry the losing transaction. In application code this lives in ONE store method (e.g. `PriceStore.Supersede(...)`) — never in an entity setter, never inline in handlers.

Deletion of a versioned entity = closing the final version with no successor. Undelete = inserting a new version.

## 3. As-of query cookbook

```sql
-- Current version (hot path — hits ux_prices_current)
SELECT * FROM prices WHERE product_key = :key AND active_to IS NULL;

-- As-of :at  (RULE 5 — never BETWEEN)
SELECT * FROM prices
 WHERE product_key = :key
   AND active_from <= :at AND (active_to > :at OR active_to IS NULL);

-- Full history, newest first
SELECT * FROM prices WHERE product_key = :key ORDER BY active_from DESC;

-- As-of join: hypertable facts × versioned metadata (measurement timestamp selects the version)
SELECT m.time, m.value, p.amount AS price_at_measurement
  FROM measurements m
  JOIN prices p
    ON p.product_key = m.product_key
   AND p.active_from <= m.time AND (p.active_to > m.time OR p.active_to IS NULL);
```

For hot ingest paths, denormalizing selected metadata columns into the hypertable row at write time is the sanctioned alternative to the as-of join (RULE 8 — record source of truth + refresh strategy).

## 4. EF Core mapping

```csharp
public sealed class Price
{
    public long Id { get; private set; }
    public Guid ProductKey { get; private set; }
    public decimal Amount { get; private set; }
    public string Currency { get; private set; } = null!;
    public DateTimeOffset ActiveFrom { get; private set; }
    public DateTimeOffset? ActiveTo { get; private set; }     // null = current
    public DateTimeOffset CreatedAt { get; private set; }
    public string CreatedBy { get; private set; } = null!;
}

public sealed class PriceConfiguration : IEntityTypeConfiguration<Price>
{
    public void Configure(EntityTypeBuilder<Price> b)
    {
        b.ToTable("prices");
        b.HasKey(p => p.Id).HasName("pk_prices");
        b.Property(p => p.Amount).HasColumnType("numeric(19,4)");

        // Default view is current-only. History queries use IgnoreQueryFilters()
        // inside dedicated read-store methods — never scattered through handlers.
        b.HasQueryFilter(p => p.ActiveTo == null);

        b.HasIndex(p => p.ProductKey)
            .HasDatabaseName("ux_prices_current")
            .IsUnique()
            .HasFilter("active_to IS NULL");

        b.HasIndex(p => p.ProductKey).HasDatabaseName("ix_prices_product_key");
    }
}
```

Project-level snake_case (with `EFCore.NamingConventions`):

```csharp
optionsBuilder.UseNpgsql(cs).UseSnakeCaseNamingConvention();
```

UUIDv7 durable keys (in the factory/store, not the DB): `Guid.CreateVersion7()` (.NET 9+).

Pitfalls (rules 2–3 in SKILL.md, restated with the mechanism):

- **Filter propagation:** `HasQueryFilter` applies wherever the entity appears, including navigations and `Include`. An as-of query that joins `Price` must `IgnoreQueryFilters()` for the WHOLE query and re-state the current-only predicate on the entities that need it.
- **Required navigation → filtered entity:** if `Order.Product`'s mapping routes through a filtered versioned entity, rows silently vanish for historical versions. Keep navigations pointing at anchors; reach versions through explicit store methods.

## 5. NHibernate mapping

Mapping-by-code:

```csharp
public sealed class PriceMapping : ClassMapping<Price>
{
    public PriceMapping()
    {
        Table("prices");
        Id(p => p.Id, m => { m.Column("id"); m.Generator(Generators.Identity); });
        Property(p => p.ProductKey, m => m.Column("product_key"));
        Property(p => p.Amount, m => { m.Column("amount"); m.Type(NHibernateUtil.Decimal); m.Precision(19); m.Scale(4); });
        Property(p => p.ActiveFrom, m => m.Column("active_from"));
        Property(p => p.ActiveTo, m => m.Column("active_to"));    // nullable DateTimeOffset?
        Filter("currentOnly", f => { });                          // condition from the filter-def
    }
}
```

Filter definition + session discipline — a `filter-def`, NOT a class-level `where=` (a `where=` is unconditional and makes as-of queries impossible without raw SQL):

```csharp
// at configuration time
cfg.AddFilterDefinition(new FilterDefinition(
    "currentOnly", "active_to is null",
    new Dictionary<string, IType>(), useManyToOne: false));

// session-factory wrapper: enabled by default
var session = factory.OpenSession();
session.EnableFilter("currentOnly");

// history/as-of read store: same wrapper, filter disabled
session.DisableFilter("currentOnly");
```

snake_case via naming strategy (applies to generated names; explicitly mapped columns above already comply):

```csharp
cfg.SetNamingStrategy(SnakeCaseNamingStrategy.Instance); // your INamingStrategy implementation
```

Schema export does not know exclusion constraints or partial indexes — attach them as auxiliary objects so `SchemaExport`/`SchemaUpdate` emits them:

```csharp
cfg.AddAuxiliaryDatabaseObject(new SimpleAuxiliaryDatabaseObject(
    sqlCreateString:
        "CREATE UNIQUE INDEX ux_prices_current ON prices (product_key) WHERE active_to IS NULL; " +
        "ALTER TABLE prices ADD CONSTRAINT ex_prices_no_overlap " +
        "EXCLUDE USING gist (product_key WITH =, tstzrange(active_from, active_to, '[)') WITH &&);",
    sqlDropString:
        "DROP INDEX IF EXISTS ux_prices_current; " +
        "ALTER TABLE prices DROP CONSTRAINT IF EXISTS ex_prices_no_overlap;"));
```

## 6. Side history table (canonical shape)

For entities whose history is audit-only (read rarely, never joined on hot paths). ONE canonical shape — do not invent per-table variants (RULE 1):

```sql
CREATE TABLE contracts_history (
    LIKE contracts,                                       -- mirror of the source columns
    archived_at timestamptz NOT NULL DEFAULT now(),
    archived_by text        NOT NULL,
    operation   char(1)     NOT NULL CHECK (operation IN ('U','D'))
);
CREATE INDEX ix_contracts_history_id ON contracts_history (id);
```

Filled in the same transaction as the change — either by the store method or a trigger (pick ONE mechanism schema-wide and record it in the conventions doc). The source table stays plain mutable (`updated_at`/`updated_by` allowed). Do not combine with in-table versioning on the same table.

## 7. Migrations

EF Core — the constraint pair has no fluent API; ship it via SQL in the migration:

```csharp
migrationBuilder.Sql("CREATE EXTENSION IF NOT EXISTS btree_gist;");
migrationBuilder.Sql(
    "ALTER TABLE prices ADD CONSTRAINT ex_prices_no_overlap " +
    "EXCLUDE USING gist (product_key WITH =, tstzrange(active_from, active_to, '[)') WITH &&);");
```

(The partial unique index DOES have a fluent API — `HasFilter`, see §4 — and migrates normally.)

TimescaleDB hypertable creation in a migration (the fact table, never the versioned one):

```csharp
migrationBuilder.Sql("SELECT create_hypertable('measurements', by_range('time'));");
```

Retrofit onto an existing mutable table (expand-contract, RULE 11): add the pair nullable → backfill `active_from` from the best available source (`created_at` if nothing better; document the approximation) → add the constraint trio with `NOT VALID`/`VALIDATE` where applicable → switch writes to close-and-insert → only then drop `updated_at`. Lock-safe recipes for each step: pg-aiguide `postgres-database-migration`.

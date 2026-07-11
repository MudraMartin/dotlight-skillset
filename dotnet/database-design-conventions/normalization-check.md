# Normalization Gate — Worked Examples

Reference for `database-design-conventions` RULE 8 and the 5-step gate. Each example shows the violation as an agent typically generates it, why it fails, and the fix.

## 1NF — repeating groups / packed values

```sql
-- VIOLATION: comma-packed value the app will split
CREATE TABLE sensors ( id bigint, alert_emails text );          -- 'a@x.cz,b@x.cz'

-- FIX
CREATE TABLE sensor_alert_recipients (
    sensor_id bigint NOT NULL REFERENCES sensors (id),
    email     text   NOT NULL,
    CONSTRAINT pk_sensor_alert_recipients PRIMARY KEY (sensor_id, email)
);
```

`jsonb` is 1NF-acceptable ONLY for genuinely schema-free payloads (device-specific config blobs, webhook bodies). The tell that it isn't: the payload's fields appear in `WHERE`, `JOIN`, or `ORDER BY` — those are columns.

## 2NF — partial dependency on a composite key

```sql
-- VIOLATION: product_name depends on product_key alone, not the full key
CREATE TABLE order_items (
    order_id     bigint,
    product_key  uuid,
    product_name text,           -- depends only on product_key
    quantity     int,
    CONSTRAINT pk_order_items PRIMARY KEY (order_id, product_key)
);
```

Fix: `product_name` lives on the product (or its version table); `order_items` keeps only the key. If the name-as-ordered must be preserved, that is a *pin to a version* (RULE 6) — reference the version row, don't copy the column.

## 3NF — transitive dependency

```sql
-- VIOLATION: unit_symbol always changes together with unit_id
CREATE TABLE measurements_meta (
    id          bigint PRIMARY KEY,
    unit_id     int  NOT NULL,
    unit_symbol text NOT NULL    -- determined by unit_id, not by id
);

-- FIX: extract
CREATE TABLE units ( id int PRIMARY KEY, symbol text NOT NULL UNIQUE );
```

Detection heuristic (step 4 of the gate): scan column pairs that always change together — `country_code`/`country_name`, `unit_id`/`unit_symbol`, `status_id`/`status_label`. Every determinant must be a candidate key.

## Speculative columns (RULE 9 — the anti-overengineering face of the gate)

```sql
-- VIOLATION: nothing in the Domain Model requires these
CREATE TABLE tariffs (
    id          bigint PRIMARY KEY,
    name        text NOT NULL,
    external_id text NULL,         -- "in case we integrate later"
    metadata    jsonb NULL,        -- "for flexibility"
    priority    int  NULL          -- "might need ordering"
);
```

Every column must trace to a requirement in the plan's `## Domain Model`. Adding a column later is one expand migration — cheaper than carrying dead columns that reviewers must reason about forever.

## Sanctioned denormalization — the record template

Every deliberate duplication carries a comment at the point of duplication:

```sql
-- DENORMALIZED: sensor_name copied from sensors (source of truth).
-- Refresh: ingest-time copy; stale names acceptable (display only).
-- Reason: avoids as-of join on the hot ingest path (measured: 4x throughput).
ALTER TABLE measurements ADD COLUMN sensor_name text NOT NULL;
```

Required fields: source of truth · refresh strategy · staleness tolerance · reason (measured where possible). A denormalization without this record is a DBR301 finding in `database-review`.

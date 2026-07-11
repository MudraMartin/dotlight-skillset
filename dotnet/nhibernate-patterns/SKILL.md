---
name: nhibernate-patterns
description: Use for NHibernate data access — session-per-request DI, ISession vs IStatelessSession, dirty-checking writes (no Update call), N+1 fetch strategies (Fetch/batch-size/Futures), HQL bulk operations, LINQ→QueryOver fallbacks, Npgsql jsonb/enum mapping, schema evolution without EF migrations.
---

# NHibernate Patterns

The NHibernate sibling of `efcore-patterns` — NH projects are the plugin default; the one EF Core project keeps `efcore-patterns`. **NH is not "EF with different spelling": several EF habits invert here and become bugs.** The six principles below are framed as those inversions.

## When to Use This Skill

- Setting up NHibernate in a new project (session factory, DI, mappings)
- Writing or reviewing any ISession-based data access
- Diagnosing N+1, LazyInitializationException, accidental UPDATEs, or stale first-level-cache reads
- Bulk operations, batching, or ETL over NHibernate
- Mapping Postgres-specific types (jsonb, arrays, enums)
- Schema evolution on an NH project (no EF migration CLI exists)

## Core Principles (EF habits that invert)

1. **ISession always tracks — there is no NoTracking.** Read-only work uses `IStatelessSession`, `SetReadOnly`, or DTO projection.
2. **Writes persist by dirty checking, not by calling `Update()`.** Load, mutate, commit — done. The NH failure mode is the *accidental* UPDATE, not the silent no-op.
3. **Everything is lazy by default — fetch deliberately or get N+1.**
4. **`ISessionFactory` is a singleton; `ISession` is scoped and NOT thread-safe.**
5. **There is no migration CLI and no `MigrateAsync`.** Schema evolves via FluentMigrator/DbUp/ordered SQL.
6. **Bulk DML bypasses the session, the second-level cache, and event listeners.**

---

## Session & Unit of Work

**`ISessionFactory`** — expensive, thread-safe, built ONCE from `Configuration`: application singleton. **`ISession`** — cheap, stateful, NOT thread-safe: one per request/unit-of-work. There is no `AddDbContext` helper; register by hand:

```csharp
builder.Services.AddSingleton<ISessionFactory>(_ =>
{
    var cfg = new Configuration();
    cfg.DataBaseIntegration(db =>
    {
        db.ConnectionString = builder.Configuration.GetConnectionString("appdb"); // Aspire injects this
        db.Dialect<PostgreSQL83Dialect>();
        db.Driver<NpgsqlDriver>();
        db.BatchSize = 50;                       // adonet.batch_size — see Batching below
    });
    var mapper = new ModelMapper();
    mapper.AddMappings(typeof(Program).Assembly.GetExportedTypes());
    cfg.AddMapping(mapper.CompileMappingForAllExplicitlyAddedEntities());
    return cfg.BuildSessionFactory();
});

builder.Services.AddScoped(sp =>
    sp.GetRequiredService<ISessionFactory>().OpenSession());
```

One `ITransaction` per unit of work: `using var tx = session.BeginTransaction(); ...; await tx.CommitAsync();`. Background services and actors: inject `ISessionFactory`, `OpenSession()` per message, dispose. Never share a session across threads or cache one in a singleton.

**Flush modes.** Default `FlushMode.Auto` flushes pending changes *before any query they could affect* — that's why an UPDATE fires "in the middle" of your read code. `Commit` (flush only on commit) is the predictable choice for request pipelines; `Manual` for read-heavy sessions where you flush explicitly. Auto-flush ordering also interacts with the temporal close-and-insert write — keep that write inside one explicit transaction (it already is a store method per `database-design-conventions` RULE 4).

## ISession vs IStatelessSession (the "AsNoTracking" decision)

| Need | Use |
|---|---|
| Normal domain reads that may lead to writes | `ISession` (tracking is the point) |
| Read-only queries on a hot path | DTO projection (`Select(...)` — entities never enter the dirty-check set) |
| Large read-only sweeps of entities | `IStatelessSession` — no L1 cache, no dirty check, no lazy loading, no cascades, **no event listeners** |
| Keep an entity in session but never write it | `session.SetReadOnly(entity, true)` / `query.SetReadOnly(true)` |
| ETL / bulk import | `IStatelessSession` + batching (audit listeners will NOT fire — set audit columns explicitly) |

## Writes Without Update()

```csharp
using var tx = session.BeginTransaction();
var order = await session.GetAsync<Order>(id);   // tracked
order.MarkShipped(clock.UtcNow);                  // just mutate
await tx.CommitAsync();                           // dirty check persists it — no Update() call
```

- `Save`/`Persist` — new entities. `Delete` — removal (`session.Delete(session.Load<Order>(id))` deletes by proxy without a SELECT).
- `Update()` / `SaveOrUpdate()` — **reattach a DETACHED instance only.** On an already-attached entity it's a no-op at best; if another instance with the same id is already in the session it throws `NonUniqueObjectException`. For detached graphs prefer `Merge()` (returns the managed copy; keep using that).
- Detach: `session.Evict(entity)`; nuke the whole L1 cache: `session.Clear()`. Stale long-lived session: `session.Refresh(entity)`.
- **Watch for accidental UPDATEs**: any mutation of a tracked entity persists on commit. "I only changed it for display" is a write. Use projection or `SetReadOnly` for display paths.

## N+1 and Fetch Strategies (the biggest daily decision)

Lazy-by-default proxies make N+1 the default outcome. Choose per query:

| Strategy | When | How |
|---|---|---|
| **`batch-size` on the mapping** | Best *default* for collections — turns N+1 into ⌈N/size⌉ `WHERE ... IN` queries | `Set(x => x.Items, m => { m.BatchSize(20); ... })` (also on classes for proxy batching) |
| **Eager fetch (join)** | One entity + one collection needed now | LINQ: `.FetchMany(o => o.Items)` (`.Fetch` for many-to-one, `ThenFetch*` to chain); QueryOver: `.Fetch(SelectMode.Fetch, o => o.Items)` |
| **Futures** | Several independent queries — batch them into ONE round trip | `.ToFuture()` / `.ToFutureValue()` (QueryOver: `.Future()` / `.FutureValue()`); all execute on first enumeration |
| **`subselect`** | Load one collection for ALL entities from the previous query | `m.Fetch(CollectionFetchMode.Subselect)` |

**The multiple-bags trap:** eager-fetching two `<bag>` collections in one query throws *"cannot simultaneously fetch multiple bags"*. Fix: map one as `<set>`/`<idbag>` (sets are the house default anyway), or fetch the second via Futures/batch-size — never two `FetchMany` on bags.

Cartesian explosion (EF's `AsSplitQuery` case): there is no split query — Futures ARE the NH answer (each collection its own query, one round trip).

## Bulk Operations and Batching

HQL/LINQ bulk DML translates to one SQL statement:

```csharp
await session.CreateQuery("update Order o set o.Status = :s where o.PlacedAt < :cutoff")
    .SetParameter("s", OrderStatus.Archived).SetParameter("cutoff", cutoff)
    .ExecuteUpdateAsync();

// or LINQ (NH 5+): session.Query<Order>().Where(...).Update(o => new Order { Status = OrderStatus.Archived });
// delete: session.Query<Order>().Where(...).Delete();
```

**Bulk bypasses everything:** the session (L1 cache now stale — `Evict`/`Clear` affected entities), the second-level cache (evict the region), and event listeners (audit interceptors do NOT fire — set `created_by`-style columns in the statement itself). After bulk-closing temporal versions, invalidate cached current-row queries.

**Insert batching:** set `adonet.batch_size` (config above). **The identity trap:** an `identity`/`native` generator — i.e. the house `GENERATED ALWAYS AS IDENTITY` — forces a round-trip per INSERT to read the key and **disables batching**. Batch-heavy tables map a Postgres sequence with a pooled optimizer instead:

```csharp
Id(x => x.Id, m => m.Generator(Generators.EnhancedSequence, g => g.Params(new
{
    sequence_name = "prices_id_seq", increment_size = 50, optimizer = "pooled-lo"
})));
```

Document the deviation from `database-design-conventions` key rule in the plan's `## Persistence Model` (it sanctions exactly this case).

## Query APIs: LINQ First, Know the Fallbacks

`session.Query<T>()` (LINQ) is the default — but **NH's LINQ provider is thinner than EF's**: complex nested projections, some `GroupBy` shapes, and certain subqueries throw `NotSupportedException` *at runtime* or emit bad SQL. Don't fight it — drop down:

- **QueryOver** — typed criteria; projections via `.SelectList(...)` + `.TransformUsing(Transformers.AliasToBean<OrderSummary>())`; joins via `JoinAlias`/`JoinQueryOver`.
- **HQL** — closest to SQL, full feature surface, the only home of some bulk/DML constructs.
- **Raw SQL** — `session.CreateSQLQuery(...)` with `AddEntity`/`AliasToBean` when the database knows best.

Cookbook: [reference.md](reference.md).

## LazyInitializationException

Thrown when an uninitialized proxy/collection is touched after its session closed — the canonical NH bug. Four fixes, in preference order:

1. **Project to DTOs before the session dies** (best — also kills tracking cost)
2. **Eager-fetch the graph the caller will use** (fetch strategies above)
3. `NHibernateUtil.Initialize(order.Items)` before returning
4. Open-session-in-view middleware — deliberate last resort; it hides N+1 and stretches session lifetime

Never return lazily-mapped entities past the request boundary.

## Retries and Resiliency

No `ExecutionStrategy` exists. Wrap the whole unit of work (session + transaction) in Polly, catching transient Npgsql failures. Retry the entire transaction, never just the statement — and remember the temporal close-and-insert loser (partial unique index + gist exclusion, `database-design-conventions` RULE 3) fails loudly by design and must retry the whole supersede.

## Common Pitfalls

| Pitfall | Reality |
|---|---|
| Calling `session.Update()` after mutating a loaded entity | Dirty check already handles it; `Update` is reattach-only → `NonUniqueObjectException` |
| "Read-only" handler mutates an entity for display | That's a write at commit. Project or `SetReadOnly` |
| UPDATE fires "randomly" before a query | `FlushMode.Auto` ordering — use `Commit` flush mode in request pipelines |
| Two `FetchMany` on bag collections | "cannot simultaneously fetch multiple bags" — map `<set>` or split via Futures |
| `GENERATED ALWAYS AS IDENTITY` on a bulk-insert table | Disables ADO.NET batching — sequence + pooled optimizer |
| Entities returned from a disposed session | `LazyInitializationException` — project before the boundary |
| Complex LINQ "works in EF" | NH LINQ is thinner — QueryOver/HQL fallback, don't fight the provider |
| Bulk update, then reading stale entities | Bulk bypasses L1/L2 cache — `Evict`/`Clear` + region invalidation |

## Testing

No InMemory provider exists. House answer: **Testcontainers Postgres** (`testcontainers-integration-tests`) — build the real schema via `new SchemaExport(cfg).Create(...)` for greenfield test DBs, or run the FluentMigrator/DbUp runner against the container. SQLite-in-memory only as a last resort (dialect mismatch: no jsonb/arrays, different SQL). Respawn works unchanged (ADO-level); ignore the migration runner's history table (`VersionInfo` / `SchemaVersions`), not `__EFMigrationsHistory`.

## Schema Evolution (no EF migrations here)

`SchemaExport` (create from mappings) and `SchemaUpdate` (additive sync — never drops, can't rename, can't move data) are dev-time tools, **not production migrations**. Production schema evolves via **FluentMigrator, DbUp, or ordered SQL scripts** run by a startup gate (the *shape* of efcore-patterns' migration service transfers; the internals are the runner's `MigrateUp()`/`PerformUpgrade()`). These migrations are hand-authored — the EF "never edit a migration" rule does not apply. Content discipline (expand-contract, what a migration may contain): `database-design-conventions` RULE 11.

## Boundaries

- **Temporal versioning mapping** (filter-def vs `where=`, `IAuxiliaryDatabaseObject` for constraints, close-and-insert store method): owned by `database-design-conventions` → [temporal-versioning.md](../database-design-conventions/temporal-versioning.md) §5. This skill only wires the session discipline: enable the `currentOnly` filter by default in the session wrapper, disable it inside history/as-of read stores.
- **Access patterns** (CQRS split, row limits, no app-joins, no generic repositories): `database-performance` — this skill supplies the NH *how* for its rules.
- **EF Core project**: `efcore-patterns` (sibling, non-overlapping).
- **Mapping-by-code catalog, Npgsql IUserTypes (jsonb/arrays/enums), second-level cache, audit event listeners, QueryOver cookbook**: [reference.md](reference.md).

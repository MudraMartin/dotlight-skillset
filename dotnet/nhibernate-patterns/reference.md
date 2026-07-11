# NHibernate Patterns — Reference

Code surface behind `SKILL.md`. Load on demand.

## Contents

1. [Mapping-by-code catalog](#1-mapping-by-code-catalog)
2. [Npgsql type mappings: jsonb, arrays, enums](#2-npgsql-type-mappings-jsonb-arrays-enums)
3. [Audit columns via event listeners](#3-audit-columns-via-event-listeners)
4. [Second-level cache and query cache](#4-second-level-cache-and-query-cache)
5. [QueryOver cookbook](#5-queryover-cookbook)

## 1. Mapping-by-code catalog

The `IEntityTypeConfiguration<T>` equivalent is `ClassMapping<T>` registered on a `ModelMapper`:

```csharp
public sealed class OrderMapping : ClassMapping<Order>
{
    public OrderMapping()
    {
        Table("orders");
        BatchSize(20);                                        // proxy batching for this class

        Id(o => o.Id, m => { m.Column("id"); m.Generator(Generators.Identity); });
        // batch-heavy tables: Generators.EnhancedSequence + pooled-lo optimizer — see SKILL.md Batching

        Property(o => o.Number, m => { m.Column("number"); m.Length(40); m.NotNullable(true); });
        Property(o => o.Note, m => { m.Column("note"); m.Column(c => c.SqlType("text")); });
        Property(o => o.Total, m => { m.Column("total"); m.Precision(19); m.Scale(4); m.NotNullable(true); });
        Property(o => o.Status, m => m.Type<EnumStringType<OrderStatus>>());   // enum as string

        ManyToOne(o => o.Customer, m =>
        {
            m.Column("customer_id");
            m.NotNullable(true);
            m.Fetch(FetchKind.Select);
            m.Lazy(LazyRelation.Proxy);
        });

        Set(o => o.Items, m =>                                 // <set>, the house default (bags cause
        {                                                      // "multiple bags" fetch failures)
            m.Key(k => k.Column("order_id"));
            m.Inverse(true);
            m.Cascade(Cascade.All | Cascade.DeleteOrphans);
            m.BatchSize(20);                                   // N+1 → ⌈N/20⌉ IN-queries
            // m.Fetch(CollectionFetchMode.Subselect);        // alternative strategy
        }, r => r.OneToMany());

        Component(o => o.ShippingAddress, c =>                 // value object — no identity
        {
            c.Property(a => a.Street, m => m.Column("shipping_street"));
            c.Property(a => a.City, m => m.Column("shipping_city"));
        });

        Filter("currentOnly", f => { });                       // house temporal filter — def in
    }                                                          // database-design-conventions/temporal-versioning.md
}
```

Registration: `mapper.AddMappings(assembly.GetExportedTypes()); cfg.AddMapping(mapper.CompileMappingForAllExplicitlyAddedEntities());`. snake_case for generated names via `cfg.SetNamingStrategy(...)` (explicit `Column(...)` calls above already comply).

## 2. Npgsql type mappings: jsonb, arrays, enums

Unlike the Npgsql EF provider, NHibernate has no native jsonb/array support — you ship an `IUserType`:

```csharp
public sealed class JsonbType<T> : IUserType where T : class
{
    public SqlType[] SqlTypes => new SqlType[] { new NpgsqlExtendedSqlType(DbType.Object, NpgsqlDbType.Jsonb) };
    public Type ReturnedType => typeof(T);
    public bool IsMutable => false;

    public object? NullSafeGet(DbDataReader rs, string[] names, ISessionImplementor session, object owner)
    {
        var json = rs[names[0]] as string;
        return json is null ? null : JsonSerializer.Deserialize<T>(json);
    }

    public void NullSafeSet(DbCommand cmd, object? value, int index, ISessionImplementor session)
    {
        var p = (NpgsqlParameter)cmd.Parameters[index];
        p.NpgsqlDbType = NpgsqlDbType.Jsonb;
        p.Value = value is null ? DBNull.Value : JsonSerializer.Serialize(value);
    }

    public object? DeepCopy(object? value) => value;           // immutable payload
    public bool Equals(object? x, object? y) => x is null ? y is null : x.Equals(y);
    public int GetHashCode(object x) => x.GetHashCode();
    public object? Assemble(object? cached, object owner) => cached;
    public object? Disassemble(object? value) => value;
    public object? Replace(object? original, object? target, object owner) => original;
}

// usage: Property(x => x.Payload, m => m.Type<JsonbType<DeviceConfig>>());
```

Arrays (`text[]`, `int[]`) follow the same shape with `NpgsqlDbType.Array | NpgsqlDbType.Text`. Enums: `EnumStringType<T>` (string column — readable, survives reordering) or plain int mapping; pg native enums need a custom type and are rarely worth it. **Remember RULE from the normalization gate:** jsonb only for genuinely schema-free payloads, never for columns used in `WHERE`/`JOIN`/`ORDER BY`.

## 3. Audit columns via event listeners

The house `created_at`/`created_by` columns (`database-design-conventions`) fill via a pre-insert listener:

```csharp
public sealed class AuditListener : IPreInsertEventListener
{
    public bool OnPreInsert(PreInsertEvent e)
    {
        if (e.Entity is IAudited a)
        {
            a.CreatedAt = DateTimeOffset.UtcNow;
            a.CreatedBy = CurrentUser.Name;           // your ambient-user accessor
            Set(e.Persister, e.State, nameof(IAudited.CreatedAt), a.CreatedAt);
            Set(e.Persister, e.State, nameof(IAudited.CreatedBy), a.CreatedBy);
        }
        return false;                                  // don't veto

        static void Set(IEntityPersister p, object[] state, string prop, object value)
            => state[Array.IndexOf(p.PropertyNames, prop)] = value;
    }
    public Task<bool> OnPreInsertAsync(PreInsertEvent e, CancellationToken ct)
        => Task.FromResult(OnPreInsert(e));
}

// cfg.EventListeners.PreInsertEventListeners = new IPreInsertEventListener[] { new AuditListener() };
```

**Listeners do NOT fire for `IStatelessSession` or HQL/LINQ bulk DML** — those paths set audit columns explicitly. That asymmetry is the #1 audit-column bug on NH projects.

## 4. Second-level cache and query cache

Off by default; enable deliberately and only for read-mostly reference data:

```csharp
cfg.Cache(c => { c.UseQueryCache = true; c.Provider<CoreDistributedCacheProvider>(); });
// per class: Cache(c => c.Usage(CacheUsage.ReadWrite)); in the ClassMapping
// per query: query.SetCacheable(true).SetCacheRegion("reference");
```

Rules: (1) never cache the versioned tables' *current-row* queries unless you invalidate on supersede; (2) HQL/LINQ bulk DML does NOT touch L2 — evict the region (`sessionFactory.EvictQueries("region")`, `sessionFactory.Evict(typeof(T))`) after bulk ops; (3) query cache without class cache = ids cached, N+1 to hydrate — enable both or neither.

## 5. QueryOver cookbook

For queries NH's LINQ provider can't express:

```csharp
// Projection to DTO
OrderSummary dto = null;
var summaries = await session.QueryOver<Order>()
    .Where(o => o.PlacedAt >= from)
    .SelectList(l => l
        .Select(o => o.Number).WithAlias(() => dto.Number)
        .Select(o => o.Total).WithAlias(() => dto.Total))
    .TransformUsing(Transformers.AliasToBean<OrderSummary>())
    .ListAsync<OrderSummary>();

// Join with alias + filter on the joined entity
Customer c = null;
var orders = await session.QueryOver<Order>()
    .JoinAlias(o => o.Customer, () => c)
    .Where(() => c.Country == "CZ")
    .Fetch(SelectMode.Fetch, o => o.Items)
    .ListAsync();

// Subquery
var big = QueryOver.Of<OrderItem>()
    .Where(i => i.Quantity > 100)
    .Select(i => i.Order.Id);
var result = await session.QueryOver<Order>()
    .WithSubquery.WhereProperty(o => o.Id).In(big)
    .ListAsync();

// Futures — several queries, one round trip
var orders  = session.QueryOver<Order>().Where(...).Future();
var count   = session.QueryOver<Order>().Where(...).ToRowCountQuery().FutureValue<int>();
var list    = orders.ToList();      // both execute here
```

HQL remains the full-surface fallback (`session.CreateQuery("from Order o join fetch o.Items where ...")`) and the only home of bulk `update`/`delete`/`insert into ... select`.

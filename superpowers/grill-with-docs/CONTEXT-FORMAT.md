# CONTEXT.md / Glossary Format

If the project has no glossary file yet, lazily create one in the **first available** location from the discovery list in `SKILL.md`. Default to `CONTEXT.md` at the repo root if no convention exists yet.

## Structure

```md
# {Context Name}

{One or two sentence description of what this context is and why it exists.}

## Language

**Order**:
A concise description of the term.
_Avoid_: Purchase, transaction

**Invoice**:
A request for payment sent to a customer after delivery.
_Avoid_: Bill, payment request

**Customer**:
A person or organization that places orders.
_Avoid_: Client, buyer, account

## Relationships

- An **Order** produces one or more **Invoices**
- An **Invoice** belongs to exactly one **Customer**

## Example dialogue

> **Dev:** "When a **Customer** places an **Order**, do we create the **Invoice** immediately?"
> **Domain expert:** "No — an **Invoice** is only generated once a **Fulfillment** is confirmed."

## Flagged ambiguities

- "account" was used to mean both **Customer** and **User** — resolved: these are distinct concepts.
```

## Rules

- **Be opinionated.** When multiple words exist for the same concept, pick the best one and list the others as aliases to avoid.
- **Flag conflicts explicitly.** If a term is used ambiguously, call it out in "Flagged ambiguities" with a clear resolution.
- **Keep definitions tight.** One sentence max. Define what it IS, not what it does.
- **Show relationships.** Use bold term names and express cardinality where obvious.
- **Only include terms specific to this project's context.** General programming concepts (timeouts, error types, utility patterns) don't belong even if the project uses them extensively. Before adding a term, ask: *is this a concept unique to this context, or a general programming concept?* Only the former belongs.
- **Group terms under subheadings** when natural clusters emerge. If all terms belong to a single cohesive area, a flat list is fine.
- **Write an example dialogue.** A conversation between a dev and a domain expert that demonstrates how the terms interact naturally and clarifies boundaries between related concepts.

## Single vs multi-context repos

**Single context (most repos):** One `CONTEXT.md` at the repo root.

**Multiple contexts (large repos with bounded contexts):** A `CONTEXT-MAP.md` at the repo root lists the contexts, where they live, and how they relate:

```md
# Context Map

## Contexts

- [Ordering](./src/ordering/CONTEXT.md) — receives and tracks customer orders
- [Billing](./src/billing/CONTEXT.md) — generates invoices and processes payments
- [Fulfillment](./src/fulfillment/CONTEXT.md) — manages warehouse picking and shipping

## Relationships

- **Ordering → Fulfillment**: Ordering emits `OrderPlaced` events; Fulfillment consumes them to start picking
- **Fulfillment → Billing**: Fulfillment emits `ShipmentDispatched` events; Billing consumes them to generate invoices
- **Ordering ↔ Billing**: Shared types for `CustomerId` and `Money`
```

The skill infers which structure applies:

- If `CONTEXT-MAP.md` exists, read it to find per-context glossaries
- If only a root `CONTEXT.md` exists, single context
- If neither exists and the project is non-trivial, create a root `CONTEXT.md` lazily when the first term is resolved
- If the project follows a different convention (`project_conventions.md`, `Resources/Specifications/V*_Architecture_Definition.md` — laisa2-style), **append to that file** rather than creating a parallel `CONTEXT.md`. Match the existing pattern; don't fragment.

When multiple contexts exist, infer which one the current topic relates to. If unclear, ask.

## .NET project caveat

A glossary is **conceptual**, not structural. Don't include:

- C# project names (`Acme.Api`, `Acme.Domain`) — those live in `.sln` / `Directory.Build.props`
- Class names that are pure implementation (`OrderRepository`, `IFooHandler`) — implementation detail
- Framework / library terms (`IOptions`, `IHttpClientFactory`) — general programming, not domain

Do include:

- Aggregate / entity names that have business meaning (`Order`, `Customer`, `Trade`, `Position`)
- Domain events (`OrderPlaced`, `TradeExecuted`)
- Project-specific patterns with non-obvious names (`Component` in laisa2's sandbox-by-default ADR, `Hypertable` for TimescaleDB tables — these need definitions because they overload general terms)

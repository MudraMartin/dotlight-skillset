# ADR Format

ADRs (Architecture Decision Records) live in the project's discovered ADR location. Match the **existing numbering scheme** in the repo — don't invent your own.

Common conventions:
- `docs/adr/0001-slug.md`, `0002-slug.md` — sequential 4-digit, mattpocock and many open-source projects
- `docs/decisions/0001-slug.md` — same shape, different folder
- `Resources/Specifications/V3_Decisions.md` containing `## ADR-001`, `## ADR-002` — single-file log, common in spec-heavy projects (laisa2-style)
- `docs/architecture/decisions/adr-001.md` — variant

Create the ADR location lazily — only when the first ADR is needed and the user agrees.

## Template

```md
# {Short title of the decision}

{1-3 sentences: what's the context, what did we decide, and why.}
```

That's it. An ADR can be a single paragraph. The value is in recording *that* a decision was made and *why* — not in filling out sections.

## Optional sections

Only include these when they add genuine value. Most ADRs won't need them.

- **Status** frontmatter (`proposed | accepted | deprecated | superseded by ADR-NNNN`) — useful when decisions are revisited.
- **Considered Options** — only when the rejected alternatives are worth remembering. Include them when "why not X?" is a question someone will ask in 6 months.
- **Consequences** — only when non-obvious downstream effects need to be called out. Skip if the consequences are obvious from the decision itself.
- **Constraints** — when the decision is forced by an external constraint (compliance, partner contract, hardware), record it explicitly so future readers don't try to "fix" it.

## Numbering

- For folder-based ADRs (`docs/adr/`, `docs/decisions/`): scan the folder for the highest existing number and increment by one. Pad to the existing width (`0001`, not `1`, if the convention is 4 digits).
- For single-file ADR logs (laisa2-style `V3_Decisions.md`): scan the file for `## ADR-NNN` headings, find the highest, increment.
- Match the existing prefix style: `ADR-006`, `0006-x.md`, or whatever the repo already uses.

## When to offer an ADR

**All three** of these must be true:

1. **Hard to reverse** — the cost of changing your mind later is meaningful. If a decision is easy to reverse, skip the ADR — you'll just reverse it.
2. **Surprising without context** — a future reader will look at the code and wonder "why on earth did they do it this way?" If it's not surprising, nobody will wonder.
3. **The result of a real trade-off** — there were genuine alternatives and you picked one for specific reasons. If there was no real alternative, there's nothing to record beyond "we did the obvious thing."

If any one is missing, skip the ADR. Don't open an ADR for routine choices — that's noise that buries the decisions that actually matter.

### What qualifies

- **Architectural shape.** "Monorepo." "Write model is event-sourced, read model projected into Postgres." ".NET Aspire orchestrates processes (no containers in dev loop)."
- **Integration patterns between contexts.** "Ordering and Billing communicate via domain events, not synchronous HTTP."
- **Technology choices that carry lock-in.** Database, message bus, ORM, auth provider, deployment target. Not every library — only the ones that would take a quarter to swap out.
- **Boundary and scope decisions.** "Customer data is owned by the Customer context; other contexts reference it by ID only." Explicit no-s are as valuable as the yes-s.
- **Deliberate deviations from the obvious path.** "Manual SQL instead of ORM because X." "NHibernate over EF Core because Y." Anything where a reasonable reader would assume the opposite. Stops the next engineer from "fixing" something that was deliberate.
- **Constraints not visible in the code.** "Can't use AWS — compliance." "Response times must be under 200ms — partner API contract." "Permissive licenses only — laisa2 ADR-002."
- **Rejected alternatives when the rejection is non-obvious.** If you considered GraphQL and picked REST for subtle reasons, record it — otherwise someone will suggest GraphQL again in six months.

### What does NOT qualify

- "We use `IServiceCollection.AddSingleton<T>` for stateless services." — convention, not architecture.
- "Method names are PascalCase." — coding style, lives in `.editorconfig` or `project_conventions.md`.
- "We picked Serilog over NLog." — usually easy to reverse, not surprising. Unless there's a deeper reason (structured logging contract, sink lock-in), skip.
- Anything that an engineer can figure out by reading the code in 5 minutes.

## .NET project specifics

For .NET projects with rich ADR practice (laisa2-style), the existing decisions log is often canonical and **must** be matched:

- Use the existing prefix (`ADR-001`, not `0001-` or `adr-1-`)
- Place the new ADR in the same file, not a parallel folder
- Match the existing section structure (some logs have a tabular index at top, append to it)
- Match heading depth (`##` vs `###`)

If the project has both `docs/adr/` AND `Resources/Specifications/*Decisions*.md`, ask which is canonical — don't guess.

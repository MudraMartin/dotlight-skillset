---
name: design-an-interface
description: "Use before committing to the public surface of a module, library, Minimal API endpoint group, or aggregate root — especially when the first design \"feels obvious\" or when the type is hard to change later. Generates 3+ radically different designs in parallel, then compares them on simplicity, depth, and ease of correct use."
---

# Design an Interface

Based on **"Design It Twice"** from John Ousterhout's *A Philosophy of Software Design*: your first idea is unlikely to be the best. Generate several radically different designs, then compare. The cost of designing a second time is small. The cost of shipping the wrong shape is large — especially for public surfaces (NuGet packages, persisted contracts, Minimal API routes) where breaking changes are expensive.

**Announce at start:** "I'm using the design-an-interface skill. I'll gather requirements, then dispatch parallel agents to generate 3–4 radically different designs."

## When to use this skill

Use when designing a surface that is **hard to change later** or **load-bearing for many callers**:

- A new public C# type whose shape constrains its callers (sealed record, abstract class, interface).
- A library / NuGet package public API (`api-design` extend-only rules apply downstream).
- A Minimal API endpoint group — request/response contract, status code surface, route shape.
- An aggregate root's public methods (the verbs that mutate it).
- A `IServiceCollection` extension method's options surface.
- A protocol boundary — message envelope, event payload, channel item.

**Don't use this for** internal helpers, private methods, or single-caller utilities — the cost of three parallel designs outweighs the benefit. Use it when getting the shape right matters more than getting it fast.

## Workflow

### 1. Gather requirements

Before designing, pin down:

- **Problem.** What does this surface let callers accomplish?
- **Callers.** Other modules in this solution? External NuGet consumers? Frontend over HTTP? Tests? Each caller class has different ergonomic needs.
- **Key operations.** The verbs. List them; flag which are common-case vs rare.
- **Constraints.** Performance budget, AOT-compat, allocation budget, existing convention in the codebase, persistence shape, wire compat for already-shipped consumers.
- **What stays inside.** What complexity must this surface *hide*? (Hidden complexity = depth = good.)

Use `AskUserQuestion` for choice-shaped requirement decisions (e.g., "Is this exposed over HTTP, in-process, or both?"). For genuinely open requirements, free text.

### 2. Generate designs in parallel

Dispatch 3–4 agents simultaneously using `dispatching-parallel-agents`. **Each must produce a radically different shape.** If two come back similar, dispatch a replacement with a sharper differentiator.

Assign each agent a distinct shaping constraint. Pick from this menu (or invent equivalents) — the goal is *radical* divergence:

- **Minimal surface.** "Aim for 1–3 methods, no options object. Cut everything that isn't load-bearing."
- **Maximum flexibility.** "Support every plausible use case. Options pattern, optional callbacks, extension points."
- **Optimize the common case.** "Make the 90% path one line; rare cases can be verbose."
- **Functional / immutable.** "Static functions on a `record`. No mutation. No internal state."
- **Fluent builder.** "Chained calls that read like English. Build phase separate from execute phase."
- **Channel / async-stream-shaped.** "The producer/consumer is the abstraction; expose `IAsyncEnumerable<T>` or `ChannelReader<T>`."
- **Inspired by a known library.** "Take inspiration from MediatR / Polly / Serilog / EF Core — pick whichever fits the problem."

Each agent's prompt should ask for **exactly this output**:

```
Design an interface for: <module description>

Requirements: <copy from step 1>

Constraint for THIS design: <one of the options above>

Return:
1. Type signatures — interface, class, record, method shapes (C# syntax).
2. Usage example — 5–15 lines of caller code showing the common case.
3. What this design hides internally — the depth.
4. Trade-offs — what does this shape make easy? What does it make hard?
5. .NET-specific notes — sealed/record/struct choice, allocation, async shape, AOT-compat.

Do NOT implement. Do NOT discuss alternatives. Commit to this one shape.
```

Keep agent context isolated — they should not see each other's designs. Divergence comes from the constraint, not from negotiation.

### 3. Present designs

Show each design to the user **sequentially**, not as a side-by-side table. Reading order: simplest first, most flexible last. For each:

1. Type signatures.
2. Usage example (the common case, in real code).
3. What it hides internally.

Wait for the user to read each before moving to the next. After the last design, move to comparison.

### 4. Compare

Discuss in prose, not a table. Highlight where designs **diverge most** — that's where the real decision lives. Evaluate each on:

- **Interface simplicity.** Fewer methods, simpler parameters → easier to learn, harder to misuse.
- **Depth.** Small public surface hiding significant complexity → *deep* (good). Large public surface delegating to thin internals → *shallow* (avoid). This is the most important criterion.
- **General-purpose vs. specialized.** Can it absorb the next plausible feature without a breaking change? Or is it focused so tightly that the focus itself is the value?
- **Implementation efficiency.** Does the shape *allow* an efficient implementation? Or does it force allocation, double-iteration, awkward state machines?
- **Ease of correct use vs. ease of misuse.** What's the "pit of success"? What's the foot-gun? What invariant *can't* the caller break by construction?
- **Cost of getting it wrong.** If shipped to NuGet, what's the breaking-change cost in 6 months? See `csharp-api-design` for extend-only rules.

Cross-reference relevant pattern skills when the comparison touches them:
- Sealed/struct/record choice → `type-design-performance`.
- DI registration shape → `dependency-injection-patterns`.
- Options surface → `microsoft-extensions-configuration`.
- Wire compat / extend-only / versioning → `api-design`.
- Async shape (Task vs Channel vs IAsyncEnumerable) → `csharp-concurrency-patterns`.

### 5. Synthesize

The best design is often a **hybrid**. After comparison, ask:

- "Which design's *shape* fits the primary use case best?"
- "Are there elements from the others worth grafting on?"
- "Anything in any of these that you'd like grilled harder before we commit?" (If yes → hand to `grill-me`.)

Land on a single chosen shape. Write its signatures and one usage example into the brainstorming spec or directly into the plan's `## Domain Model` / `## Public Surface` section. Don't leave the choice in chat.

## Evaluation criteria, condensed

From *A Philosophy of Software Design*:

> "Modules should be deep. The best modules provide powerful functionality through a simple interface. A small interface that hides significant complexity is the ideal."

Concretely, in C#/.NET terms:
- **Deep** — `IMediator.Send(request)` hiding pipeline, retry, validation, dispatch.
- **Shallow** — five-method interface that just forwards to five repository methods.

Prefer deep. Reject shallow.

## Anti-patterns

- **Designs that look the same.** If two parallel agents return variations of the same shape, the constraint wasn't sharp enough — re-dispatch.
- **Skipping comparison.** The value of this skill is the contrast. Generating three designs and picking the first one wastes the other two.
- **Implementing during design.** This skill is about shape only. No bodies, no internals, no tests. If the user asks for implementation, exit to `executing-plans` / `test-driven-development`.
- **Evaluating on implementation effort.** "Which is easiest to build?" is the wrong question. "Which is easiest to *use correctly* and *change later*?" is the right one.
- **One-and-done.** If the chosen design later proves wrong in implementation, come back and re-design — don't patch a bad shape.

---

*Adapted from [mattpocock/skills/design-an-interface](https://github.com/mattpocock/skills/tree/main/design-an-interface) (MIT, © 2026 Matt Pocock). Modifications: C#/.NET shaping constraints, integration with `dispatching-parallel-agents`, cross-references to `api-design` / `type-design-performance` / `dependency-injection-patterns` / `csharp-concurrency-patterns`, handoff to `grill-me`.*

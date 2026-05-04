# Third-Party Licenses

DotLightSkillset is built from **modified forks** of four upstream libraries. All are MIT-licensed and any redistribution (private or public) **must keep this file with the plugin**. This is what the MIT License requires — the copyright notice and license text must be preserved in distributions.

---

## 1. obra/superpowers

Content of the `superpowers/` directory (13 of 15 skills — the other two are from mattpocock/skills, see section 3) originates from this library. Several `SKILL.md` files have been modified — see the "Modified from upstream" section in `CHANGELOG.md` and `README.md`.

**Repository:** https://github.com/obra/superpowers
**Upstream license file:** https://github.com/obra/superpowers/blob/main/LICENSE

```
MIT License

Copyright (c) 2025 Jesse Vincent

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 2. Aaronontheweb/dotnet-skills

Content of the `dotnet/` directory (24 skills) and `agents/` directory (3 agents) originates from this library. The content has been mostly preserved verbatim with light editorial changes (renaming `opentelementry-dotnet-instrumentation` → `opentelemetry-instrumentation`, `playwright-blazor` → `playwright-blazor-testing`, fixing internal cross-references). Several upstream skills are still excluded — all `akka-*` (5), `aspire-mailpit-integration`, `mjml-email-templates`, `verify-email-snapshots`, `marketplace-publishing`, `skills-index-snippets`. Excluded agents: `akka-net-specialist`, `docfx-specialist`, `roslyn-incremental-generator-specialist`. See `CHANGELOG.md` for the version-by-version delta.

**Repository:** https://github.com/Aaronontheweb/dotnet-skills
**Upstream license file:** https://github.com/Aaronontheweb/dotnet-skills/blob/master/LICENSE

```
MIT License

Copyright (c) 2025 Aaron Stannard <https://aaronstannard.com/>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 3. mattpocock/skills

Three skills in `superpowers/` originate as adaptations from this library:

- `superpowers/grill-me/` — adapted from upstream `grill-me`. Modifications: domain-first checklist, `AskUserQuestion` convention with deferred-tool preload (0.3.0), explicit boundary against `brainstorming` / `writing-plans`, cross-reference to `grill-with-docs` (0.5.0).
- `superpowers/design-an-interface/` — adapted from upstream `design-an-interface` (now in upstream's `deprecated/` folder; the parallel sub-agent pattern lives on in `improve-architecture/INTERFACE-DESIGN.md`). Modifications: C#/.NET shaping constraints, integration with `dispatching-parallel-agents`, cross-references to `api-design` / `type-design-performance` / `dependency-injection-patterns` / `csharp-concurrency-patterns`, handoff to `grill-me`.
- `superpowers/grill-with-docs/` — adapted from upstream `engineering/grill-with-docs` (0.5.0). Modifications: path discovery (probe `CONTEXT.md` ∨ `project_conventions.md` ∨ `Resources/Specifications/V*_Architecture_Definition.md` ∨ `docs/glossary.md` ∨ ADR variants instead of hardcoded mattpocock paths), .NET domain-first checklist, `AskUserQuestion` deferred-tool preload, integration with `rider-mcp-first` for code cross-references, explicit boundary against `grill-me` and `brainstorming`. Reference files (`CONTEXT-FORMAT.md`, `ADR-FORMAT.md`) ported with .NET annotations and multi-file ADR-log support (laisa2-style).

**Repository:** https://github.com/mattpocock/skills
**Upstream license file:** https://github.com/mattpocock/skills/blob/main/LICENSE

```
MIT License

Copyright (c) 2026 Matt Pocock

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

---

## 4. hsmejky/skills

Two skills in `superpowers/` originate from this fork of mattpocock/skills (which preserves the upstream Matt Pocock copyright and adds Jan Smejkal's fork-modification copyright):

- `superpowers/caveman/` — body adapted from upstream `skills/caveman` (0.5.0). **Body verbatim** (bullets-only, ≤8 words/bullet, UTF substitutions, persistence rules, auto-clarity exception). **Description tightened**: trigger phrases narrowed to explicit mode-switches only (`"caveman mode"`, `"talk like caveman"`, `"use caveman"`, `/caveman`). The upstream description included ambiguous shortcuts like `"be brief"`, `"shorter responses"`, `"less verbose"`, `"be terse"` which risk accidental permanent activation when the user is asking a routine conversational request rather than switching modes.
- `superpowers/improve-architecture/` — adapted from upstream `skills/improve-architecture` (0.5.0). The skill builds on Ousterhout's *A Philosophy of Software Design* (deep vs shallow modules) and Feathers' seam terminology. Modifications: `AskUserQuestion` deferred-tool preload, `Explore` subagent fallback note, .NET-specific deepening patterns section (NHibernate / EF Core / MinimalAPI / IOptions / Aspire shapes), integration with `rider-mcp-first` for the exploration step, cross-references to dotlight's `brainstorming` / `design-an-interface` / `grill-me` / `grill-with-docs` / `dotnet-performance-analyst` / `csharp-type-design-performance`. Reference files (`LANGUAGE.md`, `DEEPENING.md`, `INTERFACE-DESIGN.md`) ported verbatim.

**Repository:** https://github.com/hsmejky/skills
**Upstream license file:** https://github.com/hsmejky/skills/blob/main/LICENSE

The hsmejky LICENSE preserves dual copyright — Matt Pocock for original work, Jan Smejkal for fork modifications. Both must be preserved in any redistribution.

```
MIT License

Copyright (c) 2026 Matt Pocock (original work, https://github.com/mattpocock/skills)
Copyright (c) 2026 Jan Smejkal (fork modifications)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## Redistribution summary

The MIT License imposes only two obligations:

1. **Preserve the copyright notice and license text** — exactly what this file does.
2. **Nothing else.** MIT is one of the most permissive OSS licenses — it allows private and commercial use, modifications, redistribution, and sublicensing.

**What this means for redistributors:**

- ✅ Private mirrors (Bitbucket, internal Git) — fine. Keep this file with the plugin.
- ✅ Public GitHub / forks — fine. Same rule.
- ✅ Commercial use — fine.
- ✅ Modifying the skills — allowed. Documenting the changes in README (as done here) is a good-faith practice, not a legal requirement.

**What would not be OK:**

- ❌ Removing this `THIRD_PARTY_LICENSES.md` file when redistributing.
- ❌ Removing the Jesse Vincent / Aaron Stannard / Matt Pocock / Jan Smejkal attributions.
- ❌ Claiming authorship of the whole library rather than of the modifications.

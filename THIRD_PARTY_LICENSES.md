# Third-Party Licenses

DotLightSkillset is built from **modified forks** of two upstream libraries. Both are MIT-licensed and any redistribution (private or public) **must keep this file with the plugin**. This is what the MIT License requires — the copyright notice and license text must be preserved in distributions.

---

## 1. obra/superpowers

Content of the `superpowers/` directory (13 skills) originates from this library. Some `SKILL.md` files have been modified — see the "Modified from upstream" section in `CHANGELOG.md` and `README.md`.

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

Content of the `dotnet/` directory (18 skills) originates from this library. The skills themselves have not been modified, only selected (several upstream skills were excluded — Akka.NET, Aspire, Blazor-Playwright, and others). See `CHANGELOG.md` for the full list of exclusions.

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
- ❌ Removing the Jesse Vincent / Aaron Stannard attributions.
- ❌ Claiming authorship of the whole library rather than of the modifications.

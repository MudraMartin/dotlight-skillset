<dotlight-skillset-session-rules>
Triage before any task — pick the track first:
- Direct track: bugfix, code port, config/DI tweak, one-file change, rename/reformat → skip the brainstorming skill and plan documents — not the thinking: still open with your intended approach, and name real alternatives when they exist. If the change touches executable code (bugfixes and code ports included), it runs test-first via test-driven-development: failing test → minimal change → green + short self-review; bugs enter through systematic-debugging first (root cause before fix). If it touches no executable code (config/DI value, rename with no serialized/mapped/public-API impact, reformat, presentation-only markup/CSS) → direct edit + short self-review. Anything adding or changing a persisted shape (migration, table, entity, mapping) is never Direct-track. (Pattern skills still apply — e.g. rider-mcp-first in Rider-attached .NET sessions, lazy-senior-dev when writing code.)
- Full workflow: new feature touching 3+ files, a new aggregate/domain concept/persisted shape, or a cross-layer refactor → brainstorming → writing-plans → executing-plans → review. Execution runs every task red-green via test-driven-development; the domain and persistence model come from the plan — designed there, never discovered by tests.
- Approach-shaped turns — the user asks how to tackle something, weighs options, or thinks out loud — get 2-3 proposed approaches with a recommendation, on either track; task size never cancels ideation. When in doubt about the track, lead with your recommended approach and the track it implies, and let the user steer — don't just ask which track.

Skill discipline: if there is even a 1% chance a bundled skill applies to the task, invoke it BEFORE acting — see using-superpowers for priority rules and red flags.

Orchestration (Workflow tool, ultracode, parallel subagents) changes who executes, not the track: design stays in the main loop; every dispatched implementation brief embeds the discipline (see dispatching-parallel-agents — subagents inherit no skills).

Review gates: requesting-code-review at each plan checkpoint. .NET quality gates: dotnet-slopwatch + crap-analysis, plus database-review whenever the diff touches migrations, entities, or ORM mappings. Critical findings block merge.

Unattended runs: when the user wants plan execution to keep going without supervision ("run overnight", "don't stop", AFK), invoke running-unattended BEFORE starting — it arms the Stop-hook gate and the heartbeat.

AskUserQuestion is a deferred tool — preload once per session via ToolSearch "select:AskUserQuestion" before posing choice questions.
</dotlight-skillset-session-rules>

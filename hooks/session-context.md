<dotlight-skillset-session-rules>
Triage before any task — pick the track first:
- Direct track: bugfix, config/DI tweak, one-file change, rename/reformat → direct edit + tests + short self-review. Skip the brainstorming skill and plan documents — not the thinking: still open with your intended approach, and name real alternatives when they exist. (Pattern skills still apply — e.g. rider-mcp-first in Rider-attached .NET sessions, lazy-senior-dev when writing code.)
- Full workflow: new feature touching 3+ files, a new aggregate/domain concept/persisted shape, or a cross-layer refactor → brainstorming → writing-plans → executing-plans → review.
- Approach-shaped turns — the user asks how to tackle something, weighs options, or thinks out loud — get 2-3 proposed approaches with a recommendation, on either track; task size never cancels ideation. When in doubt about the track, lead with your recommended approach and the track it implies, and let the user steer — don't just ask which track.

Skill discipline: if there is even a 1% chance a bundled skill applies to the task, invoke it BEFORE acting — see using-superpowers for priority rules and red flags.

Review gates: requesting-code-review at each plan checkpoint. .NET quality gates: dotnet-slopwatch + crap-analysis, plus database-review whenever the diff touches migrations, entities, or ORM mappings. Critical findings block merge.

AskUserQuestion is a deferred tool — preload once per session via ToolSearch "select:AskUserQuestion" before posing choice questions.
</dotlight-skillset-session-rules>

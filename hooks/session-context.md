<dotlight-skillset-session-rules>
Triage before any task — pick the track first:
- Direct track: bugfix, config/DI tweak, one-file change, rename/reformat → direct edit + tests + short self-review. No brainstorming, no plan documents. (Pattern skills still apply — e.g. rider-mcp-first in Rider-attached .NET sessions, lazy-senior-dev when writing code.)
- Full workflow: new feature touching 3+ files, a new aggregate/domain concept/persisted shape, or a cross-layer refactor → brainstorming → writing-plans → executing-plans → review. When in doubt, ask the user which track.

Skill discipline: if there is even a 1% chance a bundled skill applies to the task, invoke it BEFORE acting — see using-superpowers for priority rules and red flags.

Review gates: requesting-code-review at each plan checkpoint. .NET quality gates: dotnet-slopwatch + crap-analysis, plus database-review whenever the diff touches migrations, entities, or ORM mappings. Critical findings block merge.

AskUserQuestion is a deferred tool — preload once per session via ToolSearch "select:AskUserQuestion" before posing choice questions.
</dotlight-skillset-session-rules>

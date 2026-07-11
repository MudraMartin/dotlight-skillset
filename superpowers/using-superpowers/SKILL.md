---
name: using-superpowers
description: Use when starting any conversation - establishes how to find and use skills, requiring Skill tool invocation before ANY response including clarifying questions
---

<SUBAGENT-STOP>
If you were dispatched as a subagent to execute a specific task, ignore this skill.
</SUBAGENT-STOP>

<EXTREMELY-IMPORTANT>
If you think there is even a 1% chance a skill might apply to what you are doing, you ABSOLUTELY MUST invoke the skill.

IF A SKILL APPLIES TO YOUR TASK, YOU DO NOT HAVE A CHOICE. YOU MUST USE IT.

This is not negotiable. You cannot rationalize your way out of this.
</EXTREMELY-IMPORTANT>

## Triage: not every task takes the full workflow

Pick the track before reaching for workflow skills:

- **Direct track** — bugfix, config or DI tweak, one-file change, rename/reformat: direct edit + tests + short self-review. No brainstorming, no plan documents.
- **Full workflow** — brainstorming → plan → TDD → review: only for new features touching 3+ files, a new aggregate, or cross-layer refactors.

When in doubt, ask the user which track. Triage picks the track; the skill rule below still applies within it (systematic-debugging for bugs, TDD for new code).

## The Rule

**Invoke relevant or requested skills BEFORE any response or action** — including clarifying questions, exploring the codebase, or checking files. If it turns out wrong for the situation, you don't have to use it.

**Before entering plan mode:** if you haven't already brainstormed, invoke the brainstorming skill first.

Then announce "Using [skill] to [purpose]" and follow the skill exactly. If it has a checklist, create a todo per item.

## Skill Priority

When multiple skills apply, process skills come first — they set the approach, then implementation skills (frontend-design, etc.) carry it out. Brainstorming and systematic-debugging are Superpowers' most common process skills, but the rule holds for any of them.

- "Let's build X" → superpowers:brainstorming first, then implementation skills.
- "Fix this bug" → superpowers:systematic-debugging first, then domain skills.

## Red Flags

These thoughts mean STOP—you're rationalizing:

| Thought | Reality |
|---------|---------|
| "This is just a simple question" | Questions are tasks. Check for skills. |
| "I need more context first" | Skill check comes BEFORE clarifying questions. |
| "Let me explore the codebase first" | Skills tell you HOW to explore. Check first. |
| "I can check git/files quickly" | Files lack conversation context. Check for skills. |
| "Let me gather information first" | Skills tell you HOW to gather information. |
| "This doesn't need a formal skill" | If a skill exists, use it. |
| "I remember this skill" | Skills evolve. Read current version. |
| "This doesn't count as a task" | Action = task. Check for skills. |
| "The skill is overkill" | For tasks above the triage bar, use it — overkill feelings don't exempt full-workflow tasks. |
| "I'll just do this one thing first" | Check BEFORE doing anything. |
| "This feels productive" | Undisciplined action wastes time. Skills prevent this. |
| "I know what that means" | Knowing the concept ≠ using the skill. Invoke it. |

## AskUserQuestion Preload

AskUserQuestion is a deferred tool in Claude Code 2.x — its schema is not loaded until you fetch it. Any skill that poses a multiple-choice question to the user must first load it via ToolSearch `"select:AskUserQuestion"` (once per session). Degrading to numbered text lists loses clickable answer cards — fall back to them only if the tool is genuinely unavailable. Other skills carry a one-line pointer to this rule; this paragraph is the rationale.

## User Instructions

User instructions (CLAUDE.md, AGENTS.md, direct requests) take precedence over skills, which in turn override default behavior. Only skip skill workflows or instructions when your human partner has explicitly told you to.

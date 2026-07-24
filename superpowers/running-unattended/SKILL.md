---
name: running-unattended
description: Use when the user wants plan execution to continue without supervision — overnight or AFK runs, "don't stop until the plan is done", long sessions that keep stopping right after finishing a step, or when unattended mode (.claude/unattended.json) needs arming, disarming, or troubleshooting.
---

# Running Unattended

## Overview

Three independent layers keep a plan run alive; each covers a failure the others can't:

| Layer | Covers | Mechanism |
|---|---|---|
| Stop-hook gate | turn ended prematurely mid-plan (the common case) | `hooks/unattended-stop-gate.js`, armed by marker file |
| Heartbeat | turn died abnormally (API error, crash) | `/loop` every 20–30 min |
| Checkpointing | 5h-limit reset, context compaction, machine restart | check off + commit after every task |

**Core principle:** the gate drives continuation deterministically; your job is arming it, checkpoint discipline, and stopping only through the legitimate exits.

**Announce at start:** "I'm using the running-unattended skill to arm this run."

**REQUIRED BACKGROUND:** dotlight-skillset:executing-plans is the execution discipline this mode wraps. No written plan yet → dotlight-skillset:writing-plans first; unattended mode without a plan file has nothing to gate on.

## Arming (before the run)

1. Verify the plan file has `- [ ]` tasks (a plan without checkboxes reads as complete — the gate disarms immediately).
2. Create `<project>/.claude/unattended.json`: `{ "plan": "docs/plans/<name>.md" }`. Ensure it is gitignored.
3. Arm the heartbeat fallback: `/loop 30m` (or ScheduleWakeup, 20–30 min) with prompt "continue the plan per running-unattended".
4. Close the permission gap: acceptEdits auto-accepts file edits only — Bash commands (`dotnet test`, `git commit`, …) still prompt, and one prompt stalls the run with no hook or heartbeat able to revive it. Pre-allow every command the plan's steps invoke (project settings allowlist) before leaving.

## During the run

Execute per executing-plans. After **every** finished task: check it off in the plan file and commit. Commits are the durability layer — compaction and limit resets lose everything else. When the gate's injected message reports high context, update the plan file with progress notes **before** continuing (compaction arrives without warning).

## Stopping legitimately

- **Blocked on your human partner:** write `BLOCKED: <what you need>` into the plan file, then stop. The gate lets it through and stays armed for resume.
- **5h window winding down:** the gate orders checkpoint + commit + stop instead of new work. Obey it; the run resumes after the window resets.
- **Plan complete:** no `- [ ]` left → the gate disarms itself (deletes the marker).
- **Pausing manually / returning to interactive work:** delete `.claude/unattended.json`.

## Marker reference

| Key | Default | Meaning |
|---|---|---|
| `plan` | required | plan file path, relative to project root |
| `contextWindow` | 200000 | tokens, for context % telemetry |
| `contextCheckpointPct` | 80 | context % that triggers checkpoint-first instruction |
| `limitWindDownPct` | 90 | 5h-window % that triggers wind-down |
| `maxStalledContinues` | 3 | stops with no newly checked task before the gate gives up |

`lastCheckedCount` / `stalledContinues` are hook-managed state — don't set them.

## Common mistakes

- Arming without checking permissions → run stalls on the first prompt, silently.
- Marker left armed during interactive work → every turn-end gets "continue" until the stall guard trips. Disarm when pausing.
- Trusting the heartbeat for durability → the heartbeat restarts work; only commits preserve it.
- `node` missing on PATH → the gate fails open: session behaves as un-armed. Nothing breaks, nothing continues.

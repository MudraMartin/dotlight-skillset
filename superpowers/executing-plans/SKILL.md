---
name: executing-plans
description: Use when you have a written implementation plan to execute in a separate session with review checkpoints
---

# Executing Plans

## Overview

Load plan, review critically, execute all tasks, report when complete.

**Announce at start:** "I'm using the executing-plans skill to implement this plan."

**Note:** This skill IS the execution mode for this plugin — use it whenever you have a written plan to implement. Dispatch subagents for independent tasks where that helps (see superpowers:dispatching-parallel-agents), but plan execution itself runs here.

## The Process

### Step 1: Load and Review Plan
1. Read plan file
2. Review critically - identify any questions or concerns about the plan
3. If concerns: Raise them with your human partner before starting
4. If no concerns: Create todos for the plan items and proceed

### Step 2: Execute Tasks

For each task:
1. Mark as in_progress
2. Follow each step exactly (plan has bite-sized steps)
3. Run verifications as specified
4. Mark as completed

At each checkpoint, report `git diff --stat` against the plan's expected file list; flag unexpected files or outsized diffs to your human partner before continuing.

**Review gate at each checkpoint (this IS the plan's per-batch review gate):**
- **REQUIRED SUB-SKILL:** Use superpowers:requesting-code-review — dispatch the reviewer subagent per that skill AND run the .NET quality gates it names (`dotnet-slopwatch`, `crap-analysis`, and `database-review` when the batch touched migrations/entities/mappings) in this session.
- The gate is run by you, the driver — not delegated to whoever implemented the batch. Loop on Critical findings (`receiving-code-review` → fix → re-review) until clean, then continue.

### Step 3: Complete Development

After all tasks complete and verified (including the plan's `## Final review` against the full spec):
- Announce: "I'm using the finishing-a-development-branch skill to complete this work."
- **REQUIRED SUB-SKILL:** Use superpowers:finishing-a-development-branch
- Follow that skill to verify tests, present options, execute choice

## When to Stop and Ask for Help

**STOP executing immediately when:**
- Hit a blocker (missing dependency, test fails, instruction unclear)
- Plan has critical gaps preventing starting
- You don't understand an instruction
- Verification fails repeatedly

**Ask for clarification rather than guessing.**

## When to Revisit Earlier Steps

**Return to Review (Step 1) when:**
- Partner updates the plan based on your feedback
- Fundamental approach needs rethinking

**Don't force through blockers** - stop and ask.

## Remember
- Review plan critically first
- Follow plan steps exactly
- Don't skip verifications
- Reference skills when plan says to
- Stop when blocked, don't guess
- Never start implementation on main/master branch without explicit user consent

## Integration

**Required workflow skills:**
- **superpowers:using-git-worktrees** - Ensures isolated workspace (creates one or verifies existing)
- **superpowers:writing-plans** - Creates the plan this skill executes
- **superpowers:requesting-code-review** - The checkpoint review gate (plus dotnet-slopwatch / crap-analysis / database-review quality gates)
- **superpowers:finishing-a-development-branch** - Complete development after all tasks

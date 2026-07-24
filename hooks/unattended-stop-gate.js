#!/usr/bin/env node
// Stop-hook gate for unattended plan execution (running-unattended skill).
// Armed by <project>/.claude/unattended.json pointing at a plan file with
// `- [ ]` checkboxes; blocks premature turn-ends until the plan is done,
// a BLOCKED: line appears, progress stalls, or the 5h usage window winds down.
// Fail-open by design: any error must allow the stop — never trap a session.
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const OPEN_BOX = /^\s*[-*] \[ \]/gm;
const CHECKED_BOX = /^\s*[-*] \[[xX]\]/gm;
const count = (text, re) => (text.match(re) || []).length;

function lastUsage(transcriptPath) {
  const lines = fs.readFileSync(transcriptPath, 'utf8').split('\n');
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (!line) continue;
    try {
      const usage = JSON.parse(line)?.message?.usage;
      if (usage && typeof usage.input_tokens === 'number') return usage;
    } catch { /* non-JSON or shape mismatch — keep scanning */ }
  }
  return null;
}

function contextPct(input, windowSize) {
  try {
    if (!input.transcript_path) return null;
    const u = lastUsage(input.transcript_path);
    if (!u) return null;
    const used = (u.input_tokens || 0) + (u.cache_read_input_tokens || 0)
      + (u.cache_creation_input_tokens || 0) + (u.output_tokens || 0);
    return Math.round((100 * used) / windowSize);
  } catch {
    return null;
  }
}

function block(reason) {
  process.stdout.write(JSON.stringify({ decision: 'block', reason }));
}

function main() {
  const input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}');
  const cwd = input.cwd || process.cwd();
  const markerPath = path.join(cwd, '.claude', 'unattended.json');
  if (!fs.existsSync(markerPath)) return;

  let marker;
  try { marker = JSON.parse(fs.readFileSync(markerPath, 'utf8')); } catch { return; }
  if (!marker || typeof marker.plan !== 'string') return;

  const planPath = path.isAbsolute(marker.plan) ? marker.plan : path.join(cwd, marker.plan);
  let planText;
  try { planText = fs.readFileSync(planPath, 'utf8'); } catch { return; }

  // Legitimate stop: the model declared itself blocked on its human partner.
  if (/^\s*(>\s*)?BLOCKED:/m.test(planText)) return;

  const open = count(planText, OPEN_BOX);
  if (open === 0) {
    try { fs.unlinkSync(markerPath); } catch { /* disarm is best-effort */ }
    return;
  }

  const fiveH = input.rate_limits?.five_hour?.used_percentage ?? null;
  const sevenD = input.rate_limits?.seven_day?.used_percentage ?? null;
  const ctx = contextPct(input, marker.contextWindow || 200000);

  // 5h usage window winding down: grant exactly one wrap-up continuation
  // (checkpoint + commit), then let the session rest until the window resets.
  if (fiveH !== null && fiveH >= (marker.limitWindDownPct ?? 90)) {
    if (input.stop_hook_active) return;
    block(
      `UNATTENDED PLAN MODE — the 5-hour usage window is at ${fiveH}%. ` +
      `Wind down instead of picking up more work: checkpoint current progress into the plan file ` +
      `"${marker.plan}", commit what is done, then stop. The run resumes when the window resets.`,
    );
    return;
  }

  // Stall guard: progress = a task got checked off since the last block.
  // Without progress for maxStalledContinues consecutive stops, give up
  // (the /loop heartbeat remains as the fallback re-driver).
  const checked = count(planText, CHECKED_BOX);
  const stalled = (marker.lastCheckedCount != null && checked <= marker.lastCheckedCount)
    ? (marker.stalledContinues || 0) + 1
    : 0;
  const nextMarker = { ...marker, lastCheckedCount: checked, stalledContinues: stalled };
  try { fs.writeFileSync(markerPath, JSON.stringify(nextMarker, null, 2)); } catch { /* best-effort */ }
  if (stalled >= (marker.maxStalledContinues ?? 3)) {
    process.stderr.write(`unattended: no progress after ${stalled} continuations — allowing stop\n`);
    return;
  }

  const telemetry = [
    ctx !== null ? `context ~${ctx}%` : null,
    fiveH !== null ? `5h window ${fiveH}%` : null,
    sevenD !== null ? `7d window ${sevenD}%` : null,
  ].filter(Boolean).join(' | ');

  const lines = [`UNATTENDED PLAN MODE — plan "${marker.plan}" has ${open} open task(s).`];
  if (ctx !== null && ctx >= (marker.contextCheckpointPct ?? 80)) {
    lines.push(
      `Context is at ${ctx}% and may be compacted without warning — ` +
      `first update the plan file with current progress notes, then continue.`,
    );
  }
  lines.push(
    'Continue with the next unchecked task now. ' +
    'After each finished task: check it off in the plan file and commit.',
  );
  lines.push(
    'If you are genuinely blocked on something only your human partner can resolve, ' +
    'write a line "BLOCKED: <what you need>" into the plan file, then stop.',
  );
  if (telemetry) lines.push(`[${telemetry}]`);
  block(lines.join('\n'));
}

try {
  main();
} catch (e) {
  try { process.stderr.write(`unattended stop-gate failed open: ${e.message}\n`); } catch { /* ignore */ }
}
process.exit(0);

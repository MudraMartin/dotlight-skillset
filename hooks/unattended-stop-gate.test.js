// Contract tests for the unattended Stop-hook gate (running-unattended skill).
// Seam under test: the CLI contract — stdin hook JSON + project filesystem state
// (marker, plan file, transcript) → stdout decision JSON / exit 0 + marker mutations.
// Run: node --test hooks/
'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const SCRIPT = path.join(__dirname, 'unattended-stop-gate.js');
const MARKER = path.join('.claude', 'unattended.json');
const PLAN = path.join('docs', 'plans', 'demo-plan.md');

function makeProject(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'unattended-gate-'));
  for (const [rel, content] of Object.entries(files)) {
    const p = path.join(dir, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, content);
  }
  return dir;
}

function runGate(cwd, input = {}) {
  const res = spawnSync(process.execPath, [SCRIPT], {
    input: JSON.stringify({ hook_event_name: 'Stop', cwd, stop_hook_active: false, ...input }),
    encoding: 'utf8',
  });
  let json = null;
  try { json = JSON.parse(res.stdout); } catch { /* allow = empty stdout */ }
  return { ...res, json };
}

function plan(open, done = 0) {
  const openLines = Array.from({ length: open }, (_, i) => `- [ ] **Step ${i + 1}: do thing ${i + 1}**`);
  const doneLines = Array.from({ length: done }, (_, i) => `- [x] **Step D${i + 1}: already done**`);
  return `# Demo Plan\n\n## Tasks\n${doneLines.concat(openLines).join('\n')}\n`;
}

const marker = (extra = {}) => JSON.stringify({ plan: 'docs/plans/demo-plan.md', ...extra });
const readMarker = (dir) => JSON.parse(fs.readFileSync(path.join(dir, MARKER), 'utf8'));

test('no marker file → allows stop silently', () => {
  const dir = makeProject({ [PLAN]: plan(3) });
  const res = runGate(dir);
  assert.strictEqual(res.status, 0);
  assert.strictEqual(res.json, null);
});

test('armed + open tasks → blocks with continue/checkoff/BLOCKED instructions', () => {
  const dir = makeProject({ [PLAN]: plan(3, 1), [MARKER]: marker() });
  const res = runGate(dir);
  assert.strictEqual(res.status, 0);
  assert.strictEqual(res.json?.decision, 'block');
  assert.match(res.json.reason, /docs\/plans\/demo-plan\.md/);
  assert.match(res.json.reason, /3 open task/);
  assert.match(res.json.reason, /check it off .* commit/i);
  assert.match(res.json.reason, /BLOCKED:/);
});

test('armed + all tasks checked → allows stop and disarms (marker deleted)', () => {
  const dir = makeProject({ [PLAN]: plan(0, 4), [MARKER]: marker() });
  const res = runGate(dir);
  assert.strictEqual(res.status, 0);
  assert.strictEqual(res.json, null);
  assert.ok(!fs.existsSync(path.join(dir, MARKER)), 'marker should be deleted when plan is complete');
});

test('BLOCKED line in plan → allows stop, stays armed', () => {
  const dir = makeProject({
    [PLAN]: plan(2) + '\nBLOCKED: need Martin to choose the auth provider\n',
    [MARKER]: marker(),
  });
  const res = runGate(dir);
  assert.strictEqual(res.status, 0);
  assert.strictEqual(res.json, null);
  assert.ok(fs.existsSync(path.join(dir, MARKER)), 'marker should survive a BLOCKED stop');
});

test('missing plan file → fails open (allows stop)', () => {
  const dir = makeProject({ [MARKER]: marker() });
  const res = runGate(dir);
  assert.strictEqual(res.status, 0);
  assert.strictEqual(res.json, null);
});

test('invalid marker JSON → fails open (allows stop)', () => {
  const dir = makeProject({ [PLAN]: plan(2), [MARKER]: '{not json' });
  const res = runGate(dir);
  assert.strictEqual(res.status, 0);
  assert.strictEqual(res.json, null);
});

test('5h window over threshold → wind-down block: checkpoint + commit, no new task', () => {
  const dir = makeProject({ [PLAN]: plan(3), [MARKER]: marker({ limitWindDownPct: 90 }) });
  const res = runGate(dir, { rate_limits: { five_hour: { used_percentage: 93 } } });
  assert.strictEqual(res.json?.decision, 'block');
  assert.match(res.json.reason, /93\s*%/);
  assert.match(res.json.reason, /checkpoint/i);
  assert.match(res.json.reason, /commit/i);
  assert.doesNotMatch(res.json.reason, /next unchecked task/i);
});

test('5h over threshold + stop_hook_active → allows stop (wrap-up already granted)', () => {
  const dir = makeProject({ [PLAN]: plan(3), [MARKER]: marker({ limitWindDownPct: 90 }) });
  const res = runGate(dir, {
    rate_limits: { five_hour: { used_percentage: 93 } },
    stop_hook_active: true,
  });
  assert.strictEqual(res.status, 0);
  assert.strictEqual(res.json, null);
});

test('no progress across continues → gives up after maxStalledContinues', () => {
  const dir = makeProject({ [PLAN]: plan(3, 1), [MARKER]: marker({ maxStalledContinues: 1 }) });
  const first = runGate(dir);
  assert.strictEqual(first.json?.decision, 'block', 'first stop should block');
  const second = runGate(dir); // plan unchanged → no progress
  assert.strictEqual(second.status, 0);
  assert.strictEqual(second.json, null, 'second stop without progress should be allowed');
});

test('progress (newly checked task) resets the stalled counter', () => {
  const dir = makeProject({
    [PLAN]: plan(3, 2), // 2 checked now…
    [MARKER]: marker({ lastCheckedCount: 1, stalledContinues: 2, maxStalledContinues: 3 }),
  });
  const res = runGate(dir);
  assert.strictEqual(res.json?.decision, 'block');
  const m = readMarker(dir);
  assert.strictEqual(m.stalledContinues, 0);
  assert.strictEqual(m.lastCheckedCount, 2);
});

test('context above checkpoint threshold → orders plan-file checkpoint before continuing', () => {
  const transcript = path.join(os.tmpdir(), `unattended-transcript-${process.pid}.jsonl`);
  const usageEntry = {
    message: {
      usage: {
        input_tokens: 2,
        cache_read_input_tokens: 165000,
        cache_creation_input_tokens: 5000,
        output_tokens: 2000,
      },
    },
  };
  fs.writeFileSync(transcript, JSON.stringify({ type: 'other' }) + '\n' + JSON.stringify(usageEntry) + '\n');
  const dir = makeProject({ [PLAN]: plan(3), [MARKER]: marker({ contextCheckpointPct: 80 }) });
  const res = runGate(dir, { transcript_path: transcript });
  assert.strictEqual(res.json?.decision, 'block');
  assert.match(res.json.reason, /update the plan file/i);
  assert.match(res.json.reason, /86\s*%/); // (2+165000+5000+2000)/200000
});

test('telemetry line reports rate-limit percentages when present', () => {
  const dir = makeProject({ [PLAN]: plan(2), [MARKER]: marker() });
  const res = runGate(dir, {
    rate_limits: { five_hour: { used_percentage: 41 }, seven_day: { used_percentage: 12 } },
  });
  assert.strictEqual(res.json?.decision, 'block');
  assert.match(res.json.reason, /5h window 41%/);
  assert.match(res.json.reason, /7d window 12%/);
});

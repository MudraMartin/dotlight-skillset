#!/usr/bin/env node
// Guards against the pre-0.6.0 truncation defect (three SKILL.md files shipped
// cut mid-sentence from v0.1.0 to v0.5.3). Run before every release:
//   node scripts/check-md-integrity.js
const { execSync } = require('node:child_process');
const { readFileSync } = require('node:fs');

const files = execSync('git ls-files "*.md"', { encoding: 'utf8' }).split('\n').filter(Boolean);
let failed = 0;

for (const f of files) {
  const text = readFileSync(f, 'utf8');
  if (!text.endsWith('\n')) {
    console.error(`${f}: missing trailing newline (truncation?)`);
    failed++;
  }
  if (f.endsWith('SKILL.md')) {
    if (!/^---\r?\n[\s\S]+?\r?\n---/.test(text)) {
      console.error(`${f}: frontmatter does not close`);
      failed++;
    }
    if (text.length < 500) {
      console.error(`${f}: suspiciously small (${text.length} B)`);
      failed++;
    }
  }
}

if (failed) {
  console.error(`\n${failed} problem(s) found.`);
  process.exit(1);
}
console.log(`OK — ${files.length} markdown files checked.`);

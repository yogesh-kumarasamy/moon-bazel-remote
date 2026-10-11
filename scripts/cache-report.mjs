#!/usr/bin/env node
// Summarises where each task result came from in moon's last run.
//
//   node scripts/cache-report.mjs [--label name] [--expect remote|cached] [--out dir]
//
// --expect remote  exit 1 unless every task was restored from the remote cache
// --expect cached  exit 1 unless every task was a local or remote cache hit
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

const { values } = parseArgs({
  options: {
    label: { type: 'string', default: 'run' },
    expect: { type: 'string' },
    out: { type: 'string' },
    report: { type: 'string', default: '.moon/cache/runReport.json' },
  },
});

const SOURCES = {
  'cached-from-remote': 'remote hit',
  cached: 'local hit',
  passed: 'executed',
};

const report = JSON.parse(readFileSync(values.report, 'utf8'));
const tasks = report.actions
  .filter((action) => action.node?.action === 'run-task')
  .map((action) => ({
    target: action.node.params.target,
    status: action.status,
    source: SOURCES[action.status] ?? action.status,
    ms: Math.round(action.duration.secs * 1000 + action.duration.nanos / 1e6),
    hash: action.operations.find((op) => op.meta?.type === 'hash-generation')?.meta.hash ?? '',
  }));

const counts = Object.groupBy(tasks, (task) => task.source);
const summary = {
  label: values.label,
  at: new Date().toISOString(),
  host: process.env.GITHUB_ACTIONS ? `github-actions:${process.env.RUNNER_OS}` : `dev:${process.platform}`,
  totalMs: Math.round(report.duration.secs * 1000 + report.duration.nanos / 1e6),
  counts: Object.fromEntries(Object.entries(counts).map(([source, items]) => [source, items.length])),
  tasks,
};

const width = Math.max(...tasks.map((task) => task.target.length));
console.log(`\n${summary.label} on ${summary.host}: ${tasks.length} tasks in ${summary.totalMs}ms`);
for (const task of tasks) {
  console.log(`  ${task.target.padEnd(width)}  ${task.source.padEnd(10)}  ${String(task.ms).padStart(6)}ms  ${task.hash.slice(0, 12)}`);
}
console.log(`  => ${Object.entries(summary.counts).map(([source, n]) => `${n} ${source}`).join(', ')}`);

if (process.env.GITHUB_STEP_SUMMARY) {
  const rows = tasks.map((task) => `| ${task.target} | ${task.source} | ${task.ms} | \`${task.hash.slice(0, 12)}\` |`);
  writeFileSync(
    process.env.GITHUB_STEP_SUMMARY,
    [`### ${summary.label}`, '', '| task | source | ms | hash |', '| --- | --- | --- | --- |', ...rows, ''].join('\n'),
    { flag: 'a' },
  );
}

if (values.out) {
  mkdirSync(values.out, { recursive: true });
  const file = join(values.out, `${summary.at.replace(/[:.]/g, '-')}-${values.label}.json`);
  writeFileSync(file, `${JSON.stringify(summary, null, 2)}\n`);
  console.log(`  saved ${file}`);
}

const allowed = { remote: ['cached-from-remote'], cached: ['cached-from-remote', 'cached'] }[values.expect ?? ''];
if (allowed) {
  const misses = tasks.filter((task) => !allowed.includes(task.status));
  if (misses.length > 0) {
    console.error(`\nExpected every task to be a ${values.expect} hit; missed: ${misses.map((t) => t.target).join(', ')}`);
    process.exit(1);
  }
}

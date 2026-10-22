#!/usr/bin/env node
// Builds a per-release contribution report from `Agent-Role:` commit trailers.
// Usage: node scripts/contributions.mjs <from-ref> <to-ref> [version]
import { execFileSync } from "node:child_process";
import { readdirSync } from "node:fs";

const [from, to = "HEAD", version = to] = process.argv.slice(2);
if (!from) {
  console.error("Usage: node scripts/contributions.mjs <from-ref> <to-ref> [version]");
  process.exit(1);
}

const knownRoles = new Set(
  readdirSync(new URL("../.claude/agents/", import.meta.url))
    .filter((f) => f.endsWith(".md"))
    .map((f) => f.slice(0, -3)),
);

const SEP = "\u001e";
const log = execFileSync(
  "git",
  ["log", "--no-merges", `${from}..${to}`, `--format=%H%x1f%s%x1f%(trailers:key=Agent-Role,valueonly,separator=%x2C)${SEP}`, "--shortstat"],
  { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 },
);

const roles = new Map();
const unknown = new Set();
let commit = null;
for (const chunk of log.split("\n")) {
  const line = chunk.trim();
  if (!line) continue;
  if (line.endsWith(SEP)) {
    const [hash, subject, trailer] = line.slice(0, -1).split("\x1f");
    const names = [...new Set(trailer.split(",").map((r) => r.trim().toLowerCase()).filter(Boolean))];
    for (const n of names) if (!knownRoles.has(n)) unknown.add(`${n} (${hash.slice(0, 7)})`);
    commit = { hash, subject, names: names.length ? names : ["unattributed"] };
    for (const name of commit.names) {
      const r = roles.get(name) ?? { commits: 0, added: 0, removed: 0, subjects: [] };
      r.commits += 1;
      r.subjects.push(subject);
      roles.set(name, r);
    }
  } else if (commit && line.includes("changed")) {
    // A commit shared by several roles splits its lines between them.
    const share = commit.names.length;
    const added = Number(line.match(/(\d+) insertion/)?.[1] ?? 0) / share;
    const removed = Number(line.match(/(\d+) deletion/)?.[1] ?? 0) / share;
    for (const name of commit.names) {
      const r = roles.get(name);
      r.added += added;
      r.removed += removed;
    }
  }
}

if (unknown.size) console.error(`Warning: unknown Agent-Role values: ${[...unknown].join(", ")}`);

const rows = [...roles.entries()].sort((a, b) => b[1].commits - a[1].commits);
const out = [
  `# Contributions — ${version}`,
  "",
  `Range: \`${from}..${to}\` (merge commits excluded; lines of a shared commit are split between its roles)`,
  "",
  "| Role | Commits | Lines + | Lines − |",
  "|---|---:|---:|---:|",
  ...rows.map(([n, r]) => `| ${n} | ${r.commits} | ${Math.round(r.added)} | ${Math.round(r.removed)} |`),
  "",
  ...rows.flatMap(([n, r]) => [`## ${n}`, ...r.subjects.map((s) => `- ${s}`), ""]),
];
console.log(out.join("\n"));

# 0003. Review and merge policy

- Status: accepted
- Date: 2026-10-22
- Owner: tech-lead
- Approved by: Liran

## Context
Liran sets direction and does not approve PRs by hand. Contribution per role must survive merges.

## Decision
- `tech-lead` reviews every PR (full diff, correctness first) and merges it when CI is green, there is no conflict and no blocking finding remains.
- Merge commits only, never squash, so each commit's `Agent-Role:` trailer stays readable.
- Escalate instead of merging when a PR changes scope, spends money, touches production or payments, carries legal or privacy risk, or publishes outside the project.
- Merge permission is granted by Liran in `.claude/settings.json` (merge and PR comments on this repo only).

## Alternatives rejected
- Squash merges: cleaner history but lose role trailers.
- Liran approves each PR: slows the team; he chose full autonomy.

## Consequences
- No human sees code before merge; CI and the tech-lead review are the gate, so tests must stay strong.

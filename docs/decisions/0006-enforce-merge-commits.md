# 0006. Enforce merge commits in repository settings

- Status: proposed
- Date: 2026-10-22
- Owner: tech-lead
- Approved by: Liran (needs a repository settings change only he can make)

## Context
0003 says merge commits only, and states that the permission rule enforces it. It does not: the rule's trailing wildcard also matches a command that passes a second `merge_method`. Claude cannot change repository settings.

## Decision
Turn off "Allow squash merging" and "Allow rebase merging" in the repository's GitHub settings (Settings, General, Pull Requests), leaving "Allow merge commits" on. This becomes accepted once Liran has changed the settings.

## Alternatives rejected
- A stricter permission pattern: wildcards cannot exclude extra arguments.

## Consequences
- GitHub rejects any squash or rebase merge, so `Agent-Role:` trailers always survive.

# Makeat — working rules

## Language
- Talk to Liran (product owner) in Hebrew.
- Everything in this repository is in English: code, comments, docs, commit messages, PRs, agent definitions, reports.
- The app UI is Hebrew-first (RTL). Arabic, Russian and English come later, so never hard-code user-facing strings; always go through i18n.

## Repository layout (target)
```
apps/mobile/        Expo + React Native + TypeScript app (Android + iOS)
services/prices/    Price ingestion (Python), hourly, from Israeli price-transparency feeds
supabase/           Database schema, migrations, row-level security, edge functions
packages/shared/    Shared TypeScript types (recipe schema, units, allergens)
content/recipes/    Structured recipe source files
docs/               Plan, architecture, decisions, release stories
.claude/agents/     One definition per team role
```

## Team roles
Work is done by roles defined in `.claude/agents/`. Before working, pick the role that owns the task and follow its definition. A task touching several areas has one lead role; the others review.

## Reviews and merging
- Liran does not approve PRs by hand. The `tech-lead` role reviews every PR and decides: merge, request changes, or escalate to Liran.
- Escalate (do not merge) anything that changes product scope, spends money, touches production or payments, carries legal/privacy risk, or publishes outside the project.
- Nothing merges with red CI, a conflict, or an open blocking finding.

## Contribution tracking (required)
- Every commit ends with a role trailer, e.g. `Agent-Role: mobile-dev` (several allowed, one per line), in the same final block as any other trailers (no blank line between them), or git will not read it.
- Every issue and PR carries a matching label `agent/<role>`.
- `node scripts/contributions.mjs <from-ref> <to-ref>` builds the per-release contribution report from those trailers.

## Product rules that code must never break
- Allergen and kashrut filtering is deterministic code. An LLM may suggest recipes or substitutions, but its output always passes the hard rules before the user sees it.
- Recipes are our own adaptations in our own words, with our own photos. Never copy recipe text or photos from another source as-is.
- Prices: show the last-update time on every quote, and re-price the basket right before checkout. Default quote is online delivery, delivery fee included.
- Loyalty-club promos apply only if the user said they are a member.
- Collect the minimum personal data. Allergies and children's data are sensitive.
- Baby-feeding content requires dietitian sign-off before release.

## Releases
- Versions: `v0.1` internal alpha, `v0.2` closed beta, `v1.0` Hebrew launch.
- At each release the `chronicler` role writes `docs/releases/<version>.en.md` (source of truth) and `docs/releases/<version>.he.md` (Hebrew translation sent to Liran).

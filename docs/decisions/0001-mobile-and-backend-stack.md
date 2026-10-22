# 0001. Mobile and backend stack

- Status: accepted
- Date: 2026-10-22
- Owner: tech-lead
- Approved by: Liran

## Context
One small team ships Android and iOS from day one, Hebrew-first with RTL, and later adds Arabic, Russian and English. Budget at start is zero.

## Decision
- App: Expo (SDK 58) + React Native + TypeScript (strict), Expo Router, i18next. One codebase for Android and iOS; web build used for end-to-end tests.
- Backend: Supabase (Postgres, auth, storage, row-level security, edge functions).
- Shared types in `packages/shared`; price ingestion as a separate Python service (see 0002).

## Alternatives rejected
- Flutter: strong RTL, but a second language (Dart) next to the TypeScript and Python we need anyway.
- Native Kotlin + Swift: two codebases for one small team.
- Firebase: weaker relational modeling for recipes, products and baskets; Postgres fits better.

## Consequences
- Over-the-air updates without store review for JS changes.
- Libraries with native code need a development build, not Expo Go.
- Supabase free tier until growth; about $25/month after.

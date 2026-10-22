# Plan

The full team and architecture plan is published at https://claude.ai/artifact/LuANBgKKNq7DA6cZbJGqkZ (private to Liran).

## Decisions (2026-10-22)
| Topic | Decision |
|---|---|
| Name | Makeat |
| Stack | Expo + React Native + TypeScript; Supabase (Postgres, auth, storage); Python price ingestion |
| Pricing | First month free, then a symbolic monthly price with a discounted annual plan |
| Default quote | Online order with home delivery, delivery fee included |
| Price freshness | Hourly pulls, re-price before checkout, update time shown on every quote |
| Recipes | Own recipes adapted from broad research, own photos, no paid creators |
| Loyalty clubs | Asked in onboarding; club promos only for members |
| Legal | No outside lawyer for now; `legal` role flags risks to Liran |
| Store accounts | None until closed beta; Google Play first, Apple later |
| Language | Chat with Liran in Hebrew; everything in the repo in English |

## First price-validation targets
Liran's own chains: Rami Levy (Petah Tikva), Osher Ad (Kiryat Ono), Haviv (Givat Shmuel, check whether it publishes feeds).
Test device: Samsung Galaxy S24 (Android).

## Roadmap
- **Phase 0 (~2 weeks):** validate price feeds with 2 chains; recipe schema + first 20 recipes; brand direction and design system; repo, roles, routines.
- **v0.1 internal alpha:** full journey end to end on Liran's phone.
- **v0.2 closed beta:** 30-50 households; measure real savings.
- **v1.0:** Hebrew launch.
- **v1.5:** Arabic, Russian; pantry and expiry; baby track.
- **v2.0:** English; butchers and fish via partners; in-app ordering.

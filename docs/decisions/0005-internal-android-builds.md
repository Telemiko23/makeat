# 0005. Internal Android builds

- Status: accepted
- Date: 2026-10-22
- Owner: tech-lead
- Approved by: Liran (zero cost; Android install without a store account)

## Context
Liran tests on a Samsung Galaxy S24 and wants to spend nothing before the closed beta. Expo Go needs a computer running a dev server; EAS Build needs an Expo account.

## Decision
- GitHub Actions builds a release APK on every PR that touches the app (artifact) and on every merge to main.
- Main builds are published to one rolling pre-release, `android-latest`, so the download link never changes.
- `expo prebuild` generates the native project in CI only; `android/` is never committed (Continuous Native Generation).
- Internal builds are signed with the debug key and built for arm64 only, to keep build time down.

## Alternatives rejected
- EAS Build: needs an Expo account and has free-tier queue limits.
- Expo Go: needs a computer running a dev server; not standalone.

## Consequences
- Android shows "unknown source" and Play Protect prompts on install; acceptable for internal testing.
- A real upload key and Play Store signing are needed before the closed beta (new decision then).

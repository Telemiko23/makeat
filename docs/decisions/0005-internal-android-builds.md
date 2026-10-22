# 0005. Internal Android builds

- Status: accepted
- Date: 2026-10-22
- Owner: tech-lead
- Approved by: Liran (zero cost; Android install without a store account)

## Context
Liran tests on a Samsung Galaxy S24 and wants to spend nothing before the closed beta. Expo Go needs a computer running a dev server; EAS Build needs an Expo account.

## Decision
- GitHub Actions builds a release APK on every merge to main that changes the app or shared packages, and on PRs that change native-relevant files (app config, dependencies, assets, the workflow). PR builds are uploaded as artifacts.
- The build job has read-only repo access; only a separate publish job on main can write releases.
- Main builds replace the asset of one rolling pre-release, `android-latest`, in place (the tag moves to the new commit), so the download link never changes or disappears.
- `expo prebuild` generates the native project in CI only; `android/` is never committed (Continuous Native Generation).
- Internal builds are signed with the debug key and built for arm64 only, to keep build time down.

## Alternatives rejected
- EAS Build: needs an Expo account and has free-tier queue limits.
- Expo Go: needs a computer running a dev server; not standalone.

## Consequences
- Android shows "unknown source" and Play Protect prompts on install; acceptable for internal testing.
- The debug key is public, so anyone could sign an APK that installs as an update over ours. Acceptable while the repo and its releases are private and the app stores no personal data. Switch to a project keystore kept in CI secrets before the app stores any user data, and before the closed beta (new decision then).

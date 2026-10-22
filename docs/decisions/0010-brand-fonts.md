# 0010. Brand fonts bundled in the app

- Status: accepted
- Date: 2026-10-22
- Owner: tech-lead
- Approved by: Liran (picked Fredoka; no cost: both fonts are SIL Open Font License)

## Context
The brand uses Fredoka for headings and Rubik for body text (docs/brand/README.md). Custom fonts need `expo-font`, a module with native code, which 0001 says needs a recorded decision.

## Decision
- Add `expo-font` (SDK-matched via `expo install`) and the font files from `@expo-google-fonts/fredoka` and `@expo-google-fonts/rubik`.
- Load them at runtime with `useBrandFonts()` in the root layout, before the first screen renders. If loading fails, the app renders with system fonts instead of staying blank.
- Font family names live only in `tokens.fontFamily`.

## Alternatives rejected
- Paid Hebrew fonts (e.g. Ploni): about $105 per weight plus a separate app license; Fredoka gives the look Liran wants for free.
- Embedding fonts at build time with the `expo-font` config plugin only: does not cover the web build used by end-to-end tests.

## Consequences
- `expo-font` is in Expo Go and in our CI APK build, so no extra build setup.
- About 0.7 MB of font files in the bundle.
- Fredoka has no Arabic or Cyrillic; those headings fall back to Rubik until a decision for v1.5.

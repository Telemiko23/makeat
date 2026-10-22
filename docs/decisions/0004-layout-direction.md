# 0004. Layout direction (RTL/LTR)

- Status: accepted
- Date: 2026-10-22
- Owner: tech-lead
- Approved by: not required (no cost, vendor or product change)

## Context
Hebrew and Arabic are RTL; Russian and English are LTR. React Native applies native RTL only after an app restart.

## Decision
- The active language is the single source of direction (`isRTL` in `apps/mobile/src/i18n`, base subtag, `iw` treated as Hebrew).
- Native direction follows it via `I18nManager.forceRTL(isRTL(language))`. Today this runs once at startup for the default language (Hebrew). When language switching ships, the switcher must call it again with the new language and restart the app.
- The root view applies the same value as `direction`, so the first launch is correct before native RTL takes effect.
- Text is start-aligned (`textAlign: 'auto'`); never hard-code `left`/`right` for text.
- The expo-localization plugin only declares `supportsRTL`; it does not force a direction.

## Alternatives rejected
- `forcesRTL` in the plugin: conflicts with switching to an LTR language later.

## Consequences
- Switching between RTL and LTR languages needs an app restart; the language switcher must tell the user.

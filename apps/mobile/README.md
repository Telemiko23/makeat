# Makeat mobile app

Expo (SDK 58) + React Native + TypeScript, Expo Router, i18next. Hebrew-first, RTL.

## Run on your phone (no store account needed)
1. Install **Expo Go** from Google Play on the phone.
2. On a computer: `cd apps/mobile && npm install && npx expo start --tunnel`.
3. Scan the QR code with Expo Go.

On first launch the app sets native RTL; layout is also forced RTL in code, so it renders correctly either way.

## Checks
- `npm run typecheck`
- `npx expo export --platform android` (bundles the app)
- `npm run build:web && npm run test:e2e` (Playwright end-to-end, phone size, light and dark)

## Structure
- `src/app/` routes (every file is a screen)
- `src/i18n/` languages; Hebrew strings are the source (`locales/he.ts`), keys are English
- `src/theme/` design tokens (placeholder until the brand-design role delivers the design system)

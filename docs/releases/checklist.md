# Pre-release checklist

Owned by `qa`. Every item is green, or the exception is approved by Liran, before a version ships.

## Automated
- [ ] CI green on the release commit (typecheck, unit, Android bundle, Playwright e2e light + dark)
- [ ] No skipped or disabled tests added since the last release

## Product rules
- [ ] Allergen and kashrut filters tested with positive and negative cases for every changed recipe or rule
- [ ] Every price quote shows its update time; basket re-prices before checkout
- [ ] No hard-coded user-facing strings; Hebrew complete, other shipped locales have no missing keys

## Device
- [ ] Installed and run on the Samsung Galaxy S24: first launch, RTL, back button, offline cooking mode
- [ ] Screenshots of every changed screen in Hebrew, light and dark

## Accessibility and privacy
- [ ] Touch targets, contrast and screen-reader labels on changed screens (Israeli Standard 5568)
- [ ] No sensitive data (allergies, children) in logs or analytics events
- [ ] From v0.2: APK signed with the project keystore, not the debug key (ADR 0009)

## Release docs
- [ ] `CONTRIBUTIONS-<version>.md` generated
- [ ] Chronicler release story written in English and translated to Hebrew

# Makeat brand and UI guidelines

Owner: `brand-design`. Status: **accepted by Liran on 2026-10-22**: "Bitten coin" logo, Pomegranate & Navy palette, Fredoka headings.
Design canvas (concepts, palettes, chosen direction): https://claude.ai/artifact/ARvQrXhb4w1kjNhSMPc52B (private to Liran).

## Idea
Makeat helps an Israeli household plan meals and pay less for the basket. Food and money in one product, said with warmth and a little wit, never with guilt.

## Logo
- **Mark ("Bitten coin")**: a cream coin with a bite taken out of its top-right edge and a lowercase `m` stamped in the middle, on a pomegranate square. Food and money in one shape.
- **Wordmark**: lowercase `makeat`, custom-drawn from circles and round-ended strokes (not a font, so no license and nobody else has it). The `e`, the letter "make" and "eat" share, takes the accent color. In running text write `Makeat`.
- No Hebrew in the logo (Liran's call). The name stays in Latin letters in every language.
- Source vectors: `apps/mobile/assets/brand/` (`app-icon.svg`, `icon-rounded.svg`, `android-foreground.svg`, `android-monochrome.svg`, `lockup-light.svg`, `lockup-dark.svg`). PNG app icons in `apps/mobile/assets/` are rendered from them; re-render, never hand-edit.
- The coin keeps to Android's adaptive-icon safe zone (coin diameter 80% of the visible icon), so circle, squircle and teardrop masks never cut it.
- Clear space: at least half the mark's width on every side. Never stretch, rotate, recolor outside the palette, outline or add effects.
- Lockups: navy wordmark with pomegranate `e` on light grounds; cream wordmark with saffron `e` on navy/dark grounds.

## Color roles
Use roles, never hex values, in code (`apps/mobile/src/theme/tokens.ts`).

| Role | Light | Dark | Use |
|---|---|---|---|
| `background` | #FFF8F2 | #0F1626 | Screen ground |
| `surface` | #FFFFFF | #18213A | Cards, sheets |
| `text` | #14213D | #F4EFEA | Primary text |
| `muted` | #4A5470 | #A9B1C7 | Secondary text, captions |
| `accent` / `onAccent` | #D61F4A / #FFFFFF | #FF5C7F / #14213D | Primary buttons, brand, selection |
| `line` | #F3D9CF | #2A3552 | Borders, dividers |
| `saving` / `onSaving` | #FFB703 / #14213D | same | Money saved, cheapest basket. Only for savings. |
| `highlight` / `onHighlight` | #E4E8F2 / #14213D | #2A3552 / #F4EFEA | Freshness tags ("updated 5 min ago"), light emphasis |
| `danger` / `onDanger` | #A3141F / #FFFFFF | #FF8A80 / #3B0A0A | Errors, allergen warnings |

Rules:
- Text and icons meet WCAG AA: 4.5:1 for body text, 3:1 for text 24px+ and for icons. Every pair above passes in both modes.
- The brand color is red, so `danger` is never shown by color alone: always a warning icon plus text, and allergen warnings use the `danger` role, never `accent`.
- `saving` is reserved for money.

## Typography
- **Fredoka** (`fontFamily.display`, `displayMedium`): headings, buttons, numbers in badges. Rounded and friendly without trying too hard. Hebrew + Latin.
- **Rubik** (`fontFamily.body`, `bodyBold`): body text, prices, lists, forms. Covers Hebrew, Arabic, Cyrillic and Latin.
- Fredoka has no Arabic or Cyrillic. Nothing switches fonts by script yet, so those glyphs would render in the system font. Before those languages ship (v1.5), display text must switch to Rubik Bold for them.
- Both are open-source (SIL Open Font License), bundled through `@expo-google-fonts` and loaded by `useBrandFonts()` before the first screen. See decision 0010.
- Set the family, not `fontWeight`: each weight is its own family name on Android.
- Sizes come from `fontSize` and `lineHeight` tokens: caption 14/20, body 17/26, subtitle 20/28, heading 26/34, title 32/40. Never below 14. Layouts must not clip at 1.3x system font scale.

## Layout and components
- RTL is the default. Use `start`/`end` (never `left`/`right`) for margins, padding and alignment; text is `textAlign: 'auto'` (decision 0004).
- Icons that imply direction (back, next, progress, chevrons) mirror in RTL. Icons that do not (check, plus, search, clock) do not.
- Prices are formatted through i18n (`Intl.NumberFormat` with currency `ILS` for the active locale), never by hand; every price shows its update time next to it.
- Spacing scale: 4, 8, 16, 24, 32, 48 (`spacing`). Radii: 8, 14, 20, pill (`radius`).
- Touch targets at least 48dp (`touchTarget`).
- Text must fit Hebrew, Arabic, Russian and English. Russian runs about 30% longer than Hebrew: no fixed-width buttons, allow two-line labels.
- Every screen designs its empty, loading and error states, not only the happy path.

## Tone of voice
- Short, warm, practical, with a wink. Address the household in plural ("ספרו לנו", "בואו נתחיל").
- Food first, money second; state savings as facts with their source time, never hype.
- No guilt about health, weight or spending. No exclamation-mark stacks, no emoji in core UI.
- Examples: "יש לכם חצי חבילת גבינה? נבשל איתה מחר." / "הסל הזה זול יותר ב־₪[סכום] באושר עד. המחיר עודכן לפני 5 דקות."

## Photo style
- Our own photos only (CLAUDE.md). Natural daylight, home kitchens, real portions, top-down or 45 degrees, light warm backgrounds that sit well next to the blush ground.

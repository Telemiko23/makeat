# Makeat brand and UI guidelines

Owner: `brand-design`. Status: **draft, direction A ("Fresh market") pending Liran's pick.**
Visual comparison of directions A, B and C: https://claude.ai/artifact/3V89BkQvp78AKVekHogm6a (private to Liran).

## Idea
Makeat helps an Israeli household plan meals and pay less for the basket. The brand is a warm neighbor at the market: fresh food, practical savings, no lecturing.

## Name and logo
- Name: **Makeat**, one word. Wordmark is lowercase `makeat`; in running text write `Makeat`.
- The name stays in Latin letters in every language for now. A Hebrew wordmark is an open question for Liran.
- Mark (direction A): a leaf whose vein is a check mark, white on herb green in a rounded square (corner radius ~27% of the side).
- Clear space around the logo: at least the height of the mark's check stroke times 3. Never stretch, recolor outside the palette, or add effects.
- Final logo and app-icon artwork are vector files under `apps/mobile/assets/`; the current icons are Expo placeholders until the direction is picked.

## Color roles
Use roles, never hex values, in code (`apps/mobile/src/theme/tokens.ts`).

| Role | Light | Dark | Use |
|---|---|---|---|
| `background` | #FAF7F0 | #101712 | Screen ground |
| `surface` | #FFFFFF | #18221B | Cards, sheets |
| `text` | #1C2A21 | #E7EEE8 | Primary text |
| `muted` | #4F6156 | #A3B3A8 | Secondary text, captions |
| `accent` / `onAccent` | #2E7D4F / #FFFFFF | #6FCF97 / #0E1A12 | Primary buttons, brand, selection |
| `line` | #E3E0D6 | #2A372E | Borders, dividers |
| `saving` / `onSaving` | #C23B22 / #FFFFFF | #FF8A70 / #1A0E0A | Money saved, cheapest basket. Only for savings. |
| `highlight` / `onHighlight` | #F2C14E / #1C2A21 | same | Freshness tags ("updated 5 min ago"), light emphasis |
| `danger` / `onDanger` | #B3261E / #FFFFFF | #F2B8B5 / #410E0B | Errors, allergen warnings |

Rules:
- Text and icons meet WCAG AA: 4.5:1 for body text, 3:1 for text 24px+ and for icons. Every pair above passes in both modes.
- Allergen and kashrut warnings never rely on color alone: always an icon plus text.
- `saving` is reserved for money. Do not use it for errors (that is `danger`).

## Typography
- Family: **Rubik** for every language. It covers Hebrew, Arabic, Cyrillic and Latin in one family, so all four languages look like one product. Loading it in the app (via `expo-font`) is the next step after the pick.
- Weights: 400 body, 500 labels, 700 headings and buttons, 800 wordmark only.
- Sizes come from `fontSize` and `lineHeight` tokens: caption 14/20, body 17/26, subtitle 20/28, heading 26/34, title 32/40.
- Never set text below 14. Support system font scaling; layouts must not clip at 1.3x.

## Layout and components
- RTL is the default. Use `start`/`end` (never `left`/`right`) for margins, padding and alignment; text is `textAlign: 'auto'` (decision 0004).
- Icons that imply direction (back, next, progress, chevrons) mirror in RTL. Icons that do not (check, plus, search, clock) do not.
- Prices are formatted through i18n (`Intl.NumberFormat` with currency `ILS` for the active locale), never by hand; every price shows its update time next to it.
- Spacing scale: 4, 8, 16, 24, 32, 48 (`spacing`). Radii: 8, 14, 20, pill (`radius`).
- Touch targets at least 48dp (`touchTarget`).
- Text must fit Hebrew, Arabic, Russian and English. Russian runs about 30% longer than Hebrew: no fixed-width buttons, allow two-line labels.
- Every screen designs its empty, loading and error states, not only the happy path.

## Tone of voice
- Short, warm, practical. Address the household in plural ("ספרו לנו", "בואו נתחיל").
- Talk about food first and money second; state savings as facts with their source time, never hype.
- No guilt about health, weight or spending. No exclamation-mark stacks, no emoji in core UI.
- Examples: "יש לכם חצי חבילת גבינה? נבשל איתה מחר." / "הסל הזה זול יותר ב־₪[סכום] באושר עד. המחיר עודכן לפני 5 דקות."

## Photo style
- Our own photos only (CLAUDE.md). Natural daylight, home kitchens, real portions, top-down or 45 degrees, light neutral backgrounds.

// Design tokens: the only source of colors, spacing, radii, type sizes and fonts in the app.
// Brand: "Bitten coin" logo, Pomegranate & Navy palette, Fredoka + Rubik; see docs/brand/README.md.
// Screens never use raw values.
export const colors = {
  light: {
    background: '#FFF8F2', // blush ground
    surface: '#FFFFFF',
    text: '#14213D', // navy
    muted: '#4A5470', // secondary text, 7:1 on background
    accent: '#D61F4A', // pomegranate: primary actions, brand
    onAccent: '#FFFFFF',
    line: '#F3D9CF',
    saving: '#FFB703', // saffron: money saved, best basket
    onSaving: '#14213D',
    highlight: '#E4E8F2', // freshness tags, light emphasis
    onHighlight: '#14213D',
    danger: '#A3141F', // errors and allergen warnings; always with an icon and text
    onDanger: '#FFFFFF',
  },
  dark: {
    background: '#0F1626',
    surface: '#18213A',
    text: '#F4EFEA',
    muted: '#A9B1C7',
    accent: '#FF5C7F',
    onAccent: '#14213D',
    line: '#2A3552',
    saving: '#FFB703',
    onSaving: '#14213D',
    highlight: '#2A3552',
    onHighlight: '#F4EFEA',
    danger: '#FF8A80',
    onDanger: '#3B0A0A',
  },
} as const;

export type Palette = { [K in keyof (typeof colors)['light']]: string };

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 } as const;
export const radius = { sm: 8, md: 14, lg: 20, pill: 999 } as const;
export const fontSize = { caption: 14, body: 17, subtitle: 20, heading: 26, title: 32 } as const;
export const lineHeight = { caption: 20, body: 26, subtitle: 28, heading: 34, title: 40 } as const;
// Font family names as registered by useBrandFonts (src/theme/fonts.ts).
// Fredoka: headings and buttons (Hebrew + Latin). Rubik: body text, prices and lists (all four scripts).
export const fontFamily = {
  display: 'Fredoka_600SemiBold',
  displayMedium: 'Fredoka_500Medium',
  body: 'Rubik_400Regular',
  bodyBold: 'Rubik_700Bold',
} as const;
// Minimum touch target (dp), per Android and iOS guidance.
export const touchTarget = 48;

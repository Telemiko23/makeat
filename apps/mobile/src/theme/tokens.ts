// Design tokens: the only source of colors, spacing, radii and type sizes in the app.
// Brand direction A ("Fresh market"); see docs/brand/README.md. Screens never use raw values.
export const colors = {
  light: {
    background: '#FAF7F0', // cream ground
    surface: '#FFFFFF',
    text: '#1C2A21',
    muted: '#4F6156', // secondary text, 6:1 on background
    accent: '#2E7D4F', // herb green: primary actions, brand
    onAccent: '#FFFFFF',
    line: '#E3E0D6',
    saving: '#C23B22', // tomato: money saved, best basket
    onSaving: '#FFFFFF',
    highlight: '#F2C14E', // lemon: freshness tags, light emphasis
    onHighlight: '#1C2A21',
    danger: '#B3261E', // errors and allergen warnings
    onDanger: '#FFFFFF',
  },
  dark: {
    background: '#101712',
    surface: '#18221B',
    text: '#E7EEE8',
    muted: '#A3B3A8',
    accent: '#6FCF97',
    onAccent: '#0E1A12',
    line: '#2A372E',
    saving: '#FF8A70',
    onSaving: '#1A0E0A',
    highlight: '#F2C14E',
    onHighlight: '#1C2A21',
    danger: '#F2B8B5',
    onDanger: '#410E0B',
  },
} as const;

export type Palette = { [K in keyof (typeof colors)['light']]: string };

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 } as const;
export const radius = { sm: 8, md: 14, lg: 20, pill: 999 } as const;
export const fontSize = { caption: 14, body: 17, subtitle: 20, heading: 26, title: 32 } as const;
export const lineHeight = { caption: 20, body: 26, subtitle: 28, heading: 34, title: 40 } as const;
// Minimum touch target (dp), per Android and iOS guidance.
export const touchTarget = 48;

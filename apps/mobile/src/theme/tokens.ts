// Placeholder tokens until the brand-design role delivers the design system.
export const colors = {
  light: {
    background: '#F6F8F5',
    surface: '#FFFFFF',
    text: '#1D2620',
    muted: '#5B6A60',
    accent: '#2F6B4F',
    onAccent: '#FFFFFF',
    line: '#DBE3DC',
  },
  dark: {
    background: '#111613',
    surface: '#1A211C',
    text: '#E5ECE6',
    muted: '#9FB0A4',
    accent: '#7CC39C',
    onAccent: '#111613',
    line: '#2C3830',
  },
} as const;

export type Palette = { [K in keyof (typeof colors)['light']]: string };

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;
export const radius = { sm: 8, md: 12, pill: 999 } as const;
export const fontSize = { body: 17, title: 32, subtitle: 20, caption: 14 } as const;

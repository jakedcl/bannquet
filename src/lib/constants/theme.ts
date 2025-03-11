export const COLORS = {
  brand: {
    green: '#1F3F28',
    greenRGBA: 'rgba(31,63,40,255)',
    greenLight: '#2A5637', // Lighter shade for hover states
    greenDark: '#162B1C',  // Darker shade for active states
  },
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },
  text: {
    primary: '#111827',
    secondary: '#4B5563',
    light: '#F9FAFB',
  },
};

export const FONTS = {
  sans: 'var(--font-helvetica), ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
  mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
};

export const BREAKPOINTS = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
};

export const TRANSITIONS = {
  default: 'all 0.3s ease-in-out',
  fast: 'all 0.15s ease-in-out',
  slow: 'all 0.45s ease-in-out',
};

export const SHADOWS = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
};

export const SIZES = {
  header: '72px',
  maxWidth: '1440px',
  contentWidth: '1200px',
};

export const Z_INDEX = {
  header: 100,
  modal: 200,
  tooltip: 300,
  overlay: 400,
}; 
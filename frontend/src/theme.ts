export const colors = {
  navy: '#2B3A57',
  orange: '#E8832A',
  deepOrange: '#D4691A',
  black: '#000000',
  darkBg: '#1A1A2E',
  white: '#FFFFFF',
  gray: {
    50: '#F8F9FA',
    100: '#F1F3F5',
    200: '#E9ECEF',
    300: '#DEE2E6',
    400: '#CED4DA',
    500: '#ADB5BD',
    600: '#868E96',
    700: '#495057',
    800: '#343A40',
    900: '#212529',
  },
  success: '#2E7D32',
  successBg: '#C8E6C9',
  warning: '#F57F17',
  warningBg: '#FFF9C4',
  error: '#C62828',
  errorBg: '#FFCDD2',
} as const;

export const gradients = {
  phoenix: `linear-gradient(135deg, ${colors.orange} 0%, ${colors.deepOrange} 100%)`,
} as const;

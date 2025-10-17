import { setCssVar } from "quasar";

/**
 * Utility to update quasar's global CSS variable theme colors
 */

// Default quasar theme colors
const defaultThemeColors = Object.freeze({
  primary   : '#1976D2',
  secondary : '#26A69A',
  accent    : '#9C27B0',

  dark      : '#1D1D1D',

  positive  : '#21BA45',
  negative  : '#C10015',
  info      : '#31CCEC',
  warning   : '#F2C037',
})

const themeColorsMap = {
  payhero: Object.freeze({
    primary: '#ffbf00',
    secondary: '#9b8447',
    dark: '#1c2833',
  }),
  'glassmorphic-blue': Object.freeze({
    primary: '#42a5f5',
    secondary: '#1565c0',
    dark: '#1c2833'
  }),
  'glassmorphic-gold': Object.freeze({
    primary: '#ffa726',
    secondary: '#e65100',
    dark: '#332818',
  }),
  'glassmorphic-green': Object.freeze({
    primary: '#4caf50',
    secondary: '#2e7d32',
    dark: '#1c332a',
  }),
  'glassmorphic-red': Object.freeze({
    primary: '#f54270',
    secondary: '#c01543',
    dark: '#332828',
  }),
}

export function updateCssThemeColors(theme) {
  const colorsMap = Object.assign(
    {...defaultThemeColors},
    {...themeColorsMap[theme]}
  );
  for (const name in colorsMap) {
    const color = colorsMap[name];
    if (!color) continue
    setCssVar(name, color, document.body);
  }
}

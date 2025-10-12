/**
 * Called when style used in an element has dark and light css class counterparts
 * (e.g. `.pt-card .dark` and `.pt-card .light`)
 */
export function getDarkModeClass (darkMode, darkModeClass = '', lightModeClass = '') {
  return darkMode ? `dark ${darkModeClass}` : `light ${lightModeClass}`
}

export function isNotDefaultTheme (theme) {
  return theme === 'payhero'
}

export function isHongKong (currentCountry) {
  return currentCountry === 'HK'
}

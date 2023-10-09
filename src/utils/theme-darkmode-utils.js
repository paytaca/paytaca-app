/**
 * Called when style used in an element has dark and light css class counterparts
 * (e.g. `.pt-card .dark` and `.pt-card .light`)
 */
export function getDarkModeClass (darkMode, darkModeClass = '', lightModeClass = '') {
  return darkMode ? `dark ${darkModeClass}` : `light ${lightModeClass}`
}

export function isDefaultTheme (theme) {
  return theme !== 'default'
}

export function isHongKong (currentCountry) {
  return currentCountry === 'HK'
}

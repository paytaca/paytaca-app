import packageInfo from '../../package.json'

export const APP_VERSION = packageInfo.version;
/**
 * Util function for comparing app versions
 * Useful for cases such as:
 *    - A feature is invalid after v0.23.1
 *    - Apps updated to 0.23.4 needs to run a migration function
 * Returns 1 if v1 > v2, -1 if v2 > v1, 0 if versions are equal
 * 
 * @param {String} v1 
 * @param {String} v2 
 * @returns {Number}
 */
export function compareAppVersions(v1, v2) {
  // Remove any suffix like "-xxxxx"
  const cleanV1 = v1.split('-')[0];
  const cleanV2 = v2.split('-')[0];

  // Split into numeric parts
  const parts1 = cleanV1.split('.').map(Number);
  const parts2 = cleanV2.split('.').map(Number);

  // Find the longest length
  const maxLen = Math.max(parts1.length, parts2.length);

  for (let i = 0; i < maxLen; i++) {
    const num1 = parts1[i] || 0;
    const num2 = parts2[i] || 0;

    if (num1 > num2) return 1;   // v1 > v2
    if (num1 < num2) return -1;  // v1 < v2
  }

  return 0; // Versions are equal
}

import axios from 'axios'
import { Store } from 'src/store'
import i18n from 'src/i18n'


export async function getNetworkTimeDiff() {
  // Network Time Protocol (NTP) to determine absolute server time
  // https://stackoverflow.com/questions/1638337/the-best-way-to-synchronize-client-side-javascript-clock-with-server-date
  const { serverTime, requestDuration } = await getServerTime()
  const localTime = new Date()

  const timeDifference = serverTime - localTime
  const adjustedTimeDiff = timeDifference + requestDuration

  const adjustedLocal = new Date(localTime.getTime() + adjustedTimeDiff)
  return {
    localTime,
    serverTime,
    adjustedLocal,

    timeDifference,
  }
}

// NOTE: change source, ideally watchtower
export async function getServerTime() {
  const startRequestTime = Date.now()
//   const response = await axios.get(`https://commercehub.paytaca.com/api/time/`)
  const response = await axios.get(`https://watchtower.cash/api/status/?timestamp_only=true`)
  const endRequestTime = Date.now()
  const requestDuration = startRequestTime - endRequestTime

  const serverTime = new Date(response.data?.timestamp)
  return { serverTime, requestDuration }
}

/**
 * Formats a given date as either a relative time string (e.g., "5 minutes ago")
 * or an absolute timestamp formatted according to the user's locale preferences.
 *
 * - If relative formatting is enabled (`useRelativeTxTimestamp.value` is true), 
 *   displays how long ago or until the date, choosing the most appropriate unit 
 *   (seconds, minutes, hours, days, weeks, months, years).
 * - Otherwise, displays the absolute timestamp, respecting locale settings.
 *
 * This function uses `Intl.RelativeTimeFormat` and `Intl.DateTimeFormat` for accurate, 
 * locale-sensitive formatting. 
 * 
 * @param {string|number|Date} date - The date to be formatted.
 * @param {Date} currentTime - The current datetime
 * @param {Boolean} useRelative - Toggle whether to use relative or absolute formatting (default to true)
 * @returns {string} The formatted date string, or an empty string if input is invalid.
 *
 * @example
 *   // Relative, e.g. "2 minutes ago"
 *   formatDate(new Date(Date.now() - 120000))
 * 
 *   // Absolute, e.g. "Apr 28, 2024, 10:34 AM" depending on locale
 *   formatDate('2024-04-28T10:34:12Z')
 */
export function formatDateLocaleRelative(date, currentTime=new Date(), useRelative=true) {
  const dt = new Date(date);
  if (Number.isNaN(dt.getTime())) return '';

  if (useRelative) {
    // Calculate the time difference from now (in user locale)
    const nowMs = Number(currentTime) || Date.now();
    const diffMs = dt.getTime() - nowMs; // negative means in the past
    const diffSeconds = Math.round(diffMs / 1000);

    const userLocale = () => {
      // Prefer app-selected language; fall back to i18n locale; then browser locale.
      const fromStore = Store.getters['global/language']
      const candidate = fromStore || i18n || globalThis?.navigator?.language || 'en-US'
      return String(candidate).replace('_', '-')
    }

    const absSeconds = Math.abs(diffSeconds);
    const rtf = typeof Intl !== 'undefined' && typeof Intl.RelativeTimeFormat === 'function'
      ? new Intl.RelativeTimeFormat(userLocale(), { numeric: 'auto' })
      : null;

    /**
     * Helper to use Intl.RelativeTimeFormat or fallback.
     * @param {number} value
     * @param {'second'|'minute'|'hour'|'day'|'week'|'month'|'year'} unit
     */
    const format = (value, unit) => {
      if (rtf) return rtf.format(value, unit);
      // Defensive fallback if Intl.RelativeTimeFormat is unavailable
      return new Date(date).toLocaleString();
    };

    if (absSeconds < 60) return format(diffSeconds, 'second');
    const diffMinutes = Math.round(diffSeconds / 60);
    if (Math.abs(diffMinutes) < 60) return format(diffMinutes, 'minute');
    const diffHours = Math.round(diffMinutes / 60);
    if (Math.abs(diffHours) < 24) return format(diffHours, 'hour');
    const diffDays = Math.round(diffHours / 24);
    if (Math.abs(diffDays) < 7) return format(diffDays, 'day');
    const diffWeeks = Math.round(diffDays / 7);
    if (Math.abs(diffWeeks) < 4) return format(diffWeeks, 'week');
    const diffMonths = Math.round(diffDays / 30);
    if (Math.abs(diffMonths) < 12) return format(diffMonths, 'month');
    const diffYears = Math.round(diffDays / 365);
    return format(diffYears, 'year');
  }

  // Absolute timestamp formatted per user's locale.
  try {
    return new Intl.DateTimeFormat(userLocale.value, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(dt)
  } catch {
    // Fallback: still show something useful.
    return dt.toLocaleString()
  }
}
import { Capacitor, registerPlugin } from '@capacitor/core'
import { Clipboard } from '@capacitor/clipboard'

const STORAGE_KEY = 'deferred_referral_code'
const CLIPBOARD_CHECKED_KEY = 'deferred_referral_clipboard_checked'

const REFERRAL_CODE_PATTERN = /([A-Za-z]{2}-[A-Za-z0-9]{1,6}-\d+)/

const DeferredReferral = registerPlugin('DeferredReferral')

export function normalizeReferralCode (input) {
  if (!input) return ''
  const match = String(input).match(REFERRAL_CODE_PATTERN)
  return match ? match[1].toUpperCase() : ''
}

export function getDeferredReferralCode () {
  try {
    return localStorage.getItem(STORAGE_KEY) || ''
  } catch {
    return ''
  }
}

export function clearDeferredReferralCode () {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch { /* ignore */ }
}

function setDeferredReferralCode (code) {
  try {
    localStorage.setItem(STORAGE_KEY, code)
  } catch { /* ignore */ }
}

function hasCheckedClipboard () {
  try {
    return localStorage.getItem(CLIPBOARD_CHECKED_KEY) === '1'
  } catch {
    return false
  }
}

function markClipboardChecked () {
  try {
    localStorage.setItem(CLIPBOARD_CHECKED_KEY, '1')
  } catch { /* ignore */ }
}

async function readPlayInstallReferrer () {
  if (Capacitor.getPlatform() !== 'android') return ''
  try {
    const { referrer } = await DeferredReferral.getInstallReferrer()
    return referrer || ''
  } catch (error) {
    console.error('Failed to read Play install referrer', error)
    return ''
  }
}

async function readIosPasteboardReferrer () {
  if (Capacitor.getPlatform() !== 'ios') return { supported: false, referrer: '' }
  try {
    const { referrer, supported } = await DeferredReferral.getPasteboardReferral()
    return { supported: supported !== false, referrer: referrer || '' }
  } catch (error) {
    console.error('Failed to read iOS pasteboard referral', error)
    return { supported: false, referrer: '' }
  }
}

async function readClipboard () {
  try {
    const { value } = await Clipboard.read()
    return value || ''
  } catch (error) {
    console.error('Failed to read clipboard', error)
    return ''
  }
}

export async function captureDeferredReferralCode () {
  const stored = getDeferredReferralCode()
  if (stored) return stored

  // Only native platforms carry an install referrer / pasteboard handoff; on
  // web we'd otherwise hit the browser clipboard permission prompt.
  if (!Capacitor.isNativePlatform()) return ''

  const platform = Capacitor.getPlatform()
  let code = ''
  let allowClipboardFallback = true

  if (platform === 'android') {
    code = normalizeReferralCode(await readPlayInstallReferrer())
  } else if (platform === 'ios') {
    const { supported, referrer } = await readIosPasteboardReferrer()
    if (supported) {
      code = normalizeReferralCode(referrer)
      allowClipboardFallback = false
    }
  }

  if (!code && allowClipboardFallback && !hasCheckedClipboard()) {
    markClipboardChecked()
    code = normalizeReferralCode(await readClipboard())
  }

  if (code) setDeferredReferralCode(code)
  return code
}

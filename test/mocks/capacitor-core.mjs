export const Capacitor = {
  getPlatform: () => globalThis.__CAP_PLATFORM__ || 'web'
}

// Minimal stand-ins so the real patched package entry (dist/esm/index.js) can
// be imported by the smoke test to assert it re-exports the recovery helpers.
export class WebPlugin {}

export const registerPlugin = (name, config) => ({ name, config })

export default { Capacitor, WebPlugin, registerPlugin }

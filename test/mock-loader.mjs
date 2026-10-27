import { readFile } from 'node:fs/promises'

const MOCKS = {
  '@capacitor/core': new URL('./mocks/capacitor-core.mjs', import.meta.url).href,
  'capacitor-secure-storage-plugin': new URL('./mocks/secure-storage.mjs', import.meta.url).href
}

// `mnemonic-migration.js` imports the wallet hash helper from `./index`, which
// drags in the full wallet/store stack. Redirect it to a pure stub so the
// migration can be exercised under Node.
const WALLET_INDEX_STUB = new URL('./mocks/wallet-index.mjs', import.meta.url).href

export async function resolve (specifier, context, nextResolve) {
  if (MOCKS[specifier]) {
    return { url: MOCKS[specifier], shortCircuit: true }
  }
  if (
    specifier === './index' &&
    context.parentURL &&
    context.parentURL.endsWith('/src/wallet/mnemonic-migration.js')
  ) {
    return { url: WALLET_INDEX_STUB, shortCircuit: true }
  }
  // The plugin's ESM dist and the app sources use extensionless relative
  // imports (bundler-style), which Node ESM cannot resolve; append the
  // extension when needed.
  if (
    specifier.startsWith('.') &&
    !specifier.endsWith('.js') &&
    context.parentURL &&
    (
      context.parentURL.includes('/capacitor-secure-storage-plugin/dist/esm/') ||
      context.parentURL.includes('/src/')
    )
  ) {
    return nextResolve(`${specifier}.js`, context)
  }
  return nextResolve(specifier, context)
}

// The project source is authored as ESM but package.json is not "type": "module",
// so teach Node to load src/**/*.js as ES modules for this smoke test. The same
// applies to the patched plugin's ESM dist (which ships no "type": "module"),
// needed to assert its package-root exports.
// src/ is the project's own, since packages such as debug keep CommonJS in a src/ of theirs.
const ESM_PATHS = [
  new URL('../src/', import.meta.url).href,
  new URL('../node_modules/capacitor-secure-storage-plugin/dist/esm/', import.meta.url).href
]

export async function load (url, context, nextLoad) {
  if (url.endsWith('.js') && ESM_PATHS.some(p => url.startsWith(p))) {
    const source = await readFile(new URL(url), 'utf8')
    return { format: 'module', source, shortCircuit: true }
  }
  return nextLoad(url, context)
}

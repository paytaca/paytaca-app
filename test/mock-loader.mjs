import { readFile } from 'node:fs/promises'

const MOCKS = {
  '@capacitor/core': new URL('./mocks/capacitor-core.mjs', import.meta.url).href,
  'capacitor-secure-storage-plugin': new URL('./mocks/secure-storage.mjs', import.meta.url).href
}

export async function resolve (specifier, context, nextResolve) {
  if (MOCKS[specifier]) {
    return { url: MOCKS[specifier], shortCircuit: true }
  }
  // The plugin's ESM dist uses extensionless relative imports (bundler-style),
  // which Node ESM cannot resolve; append the extension when needed.
  if (
    specifier.startsWith('.') &&
    !specifier.endsWith('.js') &&
    context.parentURL &&
    context.parentURL.includes('/capacitor-secure-storage-plugin/dist/esm/')
  ) {
    return nextResolve(`${specifier}.js`, context)
  }
  return nextResolve(specifier, context)
}

// The project source is authored as ESM but package.json is not "type": "module",
// so teach Node to load src/**/*.js as ES modules for this smoke test. The same
// applies to the patched plugin's ESM dist (which ships no "type": "module"),
// needed to assert its package-root exports.
const ESM_PATHS = ['/src/', '/node_modules/capacitor-secure-storage-plugin/dist/esm/']

export async function load (url, context, nextLoad) {
  if (url.startsWith('file:') && url.endsWith('.js') && ESM_PATHS.some(p => url.includes(p))) {
    const source = await readFile(new URL(url), 'utf8')
    return { format: 'module', source, shortCircuit: true }
  }
  return nextLoad(url, context)
}

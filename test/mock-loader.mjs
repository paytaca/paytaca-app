import { readFile } from 'node:fs/promises'

const MOCKS = {
  '@capacitor/core': new URL('./mocks/capacitor-core.mjs', import.meta.url).href,
  'capacitor-secure-storage-plugin': new URL('./mocks/secure-storage.mjs', import.meta.url).href
}

export async function resolve (specifier, context, nextResolve) {
  if (MOCKS[specifier]) {
    return { url: MOCKS[specifier], shortCircuit: true }
  }
  return nextResolve(specifier, context)
}

// The project source is authored as ESM but package.json is not "type": "module",
// so teach Node to load src/**/*.js as ES modules for this smoke test.
export async function load (url, context, nextLoad) {
  if (url.startsWith('file:') && url.endsWith('.js') && url.includes('/src/')) {
    const source = await readFile(new URL(url), 'utf8')
    return { format: 'module', source, shortCircuit: true }
  }
  return nextLoad(url, context)
}

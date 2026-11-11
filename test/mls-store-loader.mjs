// Redirect the Vuex singleton import used by the MLS mutation module to a stub,
// so invitation bookkeeping can be unit-tested under Node; also add the `.js`
// extension to the module's extensionless relative imports.
const STORE_STUB = new URL('./mocks/store.mjs', import.meta.url).href

export async function resolve (specifier, context, nextResolve) {
  if (specifier === 'src/store') {
    return { url: STORE_STUB, shortCircuit: true }
  }
  if (
    specifier.startsWith('.') &&
    !specifier.endsWith('.js') &&
    context.parentURL?.includes('/src/')
  ) {
    return nextResolve(`${specifier}.js`, context)
  }
  return nextResolve(specifier, context)
}

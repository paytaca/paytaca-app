// Resolve the `src/` path alias and extensionless relative imports so the MLS
// group/module graph can be loaded under plain Node for unit specs.
const ROOT = new URL('../', import.meta.url)

export async function resolve (specifier, context, nextResolve) {
  // `src/store` is stubbed by mls-store-loader; leave it in the chain.
  if (specifier.startsWith('src/') && specifier !== 'src/store') {
    return nextResolve(new URL(specifier + '.js', ROOT).href, context)
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

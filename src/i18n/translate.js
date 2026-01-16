const Translator = require('./translator')

/**
 * 
 *  * To execute this script:
 * 1) go to the directory of this file
 * 2) run "node translate.js"
 *
 * Optional flags:
 * - --lang <code>            translate a single language (e.g. --lang en-us)
 * - --langs <codes>          translate multiple languages (comma-separated)
 *                             (e.g. --langs en-us,de)
 * - --include-existing       DO NOT ignore existing keys (use with care)
 *                             (default: ignore existing keys)
 * 
 * 
 */

const argv = process.argv.slice(2)
const getArgValue = (flag) => {
  const idx = argv.indexOf(flag)
  if (idx === -1) return undefined
  return argv[idx + 1]
}

const lang = getArgValue('--lang')
const langs = getArgValue('--langs')
const supportedLangs = (langs || lang)
  ? (langs || lang).split(',').map(s => s.trim()).filter(Boolean)
  : undefined

const opts = {
  // default: ignore existing keys to avoid re-translation
  ignoreExisting: !argv.includes('--include-existing'),
  supportedLangs,
}

const translator = new Translator()
translator.translate(opts).then(
  () => console.log('\nDone!')
)

const Translator = require('./translator')

/**
 * 
 *  * To execute this script:
 * 1) go to the directory of this file
 * 2) run "node translate.js"                    (translates all languages)
 * 3) run "node translate.js de fr es"           (translates only specified languages: de, fr, es)
 * 4) run "node translate.js --ignore-existing"  (ignores existing translations, retranslates all)
 * 5) run "node translate.js de fr --ignore-existing"  (translates de and fr, ignoring existing)
 * 
 * 
 */

// Parse command line arguments
const args = process.argv.slice(2)
const opts = {
  ignoreExisting: args.includes('--ignore-existing'),
}

// Extract language codes from arguments (exclude flags)
const languageCodes = args.filter(arg => !arg.startsWith('--'))

// If languages are specified, use them; otherwise process all languages
const languagesToProcess = languageCodes.length > 0 ? languageCodes : null

if (languagesToProcess) {
  console.log(`Processing only the following languages: ${languagesToProcess.join(', ')}\n`)
}

const translator = new Translator()
translator.translate({ ...opts, languagesToProcess }).then(
  () => console.log('\nDone!')
).catch(error => {
  console.error('\n❌ Error:', error)
  process.exit(1)
})

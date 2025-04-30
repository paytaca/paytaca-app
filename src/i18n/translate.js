const Translator = require('./translator')

/**
 * 
 *  * To execute this script:
 * 1) go to the directory of this file
 * 2) run "node translate.js"
 * 
 * 
 */

const opts = {
  ignoreExisting: true
}

const translator = new Translator()
translator.translate(opts).then(
  () => console.log('\nDone!')
)

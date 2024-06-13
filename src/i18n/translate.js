const Translator = require('./translator')

/**
 * 
 *  * To execute this script:
 * 1) go to the directory of this file
 * 2) run "node translate.js"
 * 
 * 
 */

const translator = new Translator()

translator.translate().then(
  () => console.log('\nDone!')
)

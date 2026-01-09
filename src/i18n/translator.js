const translate = require('translate-google')
const fs = require('fs')

const words = require('./__texts/words')
const phrases = require('./__texts/phrases')


function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


/**
 * NOTE: YOU ONLY NEED TO UPDATE TEXTS on the words and phrases files and run this script.
 * This script automatically translates and writes the translated
 * objects to the language index files (i18n/{language}/index.js)
 * 
 */
class Translator {

  constructor () {
    this.indexFile = 'index.js'
    this.batchSize = 50 // how many keys to translate in one bulk
    this.texts = [
      ...words,
      ...phrases.static,
      ...phrases.dynamic,
    ]
    this.regex = {
      interpolatedStrRegex: /\{(\w|\p{Script=Han}|\p{Script=Hiragana}|\p{Script=Katakana})+\}|<(.|\p{Script=Han}|\p{Script=Hiragana}|\p{Script=Katakana})+>/gu,
      htmlClassRegex: /[“|"](\s|\w|\p{Script=Han}|\p{Script=Hiragana}|\p{Script=Katakana})+[”|"]/gu,
    }
  }

  async translate (opts = { ignoreExisting: false, languagesToProcess: null }) {
    const ignoreExisting = opts?.ignoreExisting
    const languagesToProcess = opts?.languagesToProcess
    
    /*
      check for supported language codes here
      https://github.com/shikar/NODE_GOOGLE_TRANSLATE/blob/master/languages.js
    */
    const allSupportedLangs = [
      'en-us',
      'es',
      'zh-tw',
      'zh-cn',
      'de',
      'ha',
      'pt',
      'af',
      'nl',
      'id',
      'it',
      'ja',
      'ko',
      'fr',
      'tl',
      'ru',
      'ar',
      /* 
        LANGUAGE BRANCH (variations)

        place the unsupported languages here,
        these langs will just be copied from the main language (e.g. es will be copied to es-ar)
        and be translated by real people

        SYNTAX: {branch-language}:{main-language}
      */

      'es-ar:es',
      'pt-br:pt',
    ]
    
    // Filter languages if specific ones are requested
    let supportedLangs = allSupportedLangs
    if (languagesToProcess && languagesToProcess.length > 0) {
      // Validate that requested languages are supported
      const invalidLangs = languagesToProcess.filter(lang => {
        // Check both direct match and branch language syntax
        const directMatch = allSupportedLangs.includes(lang)
        const isBranchLang = allSupportedLangs.some(supportedLang => {
          if (supportedLang.includes(':')) {
            const [branchLang] = supportedLang.split(':')
            return branchLang === lang
          }
          return false
        })
        return !directMatch && !isBranchLang
      })
      
      if (invalidLangs.length > 0) {
        console.warn(`⚠ Warning: The following language codes are not supported and will be skipped: ${invalidLangs.join(', ')}`)
        console.log(`Supported languages: ${allSupportedLangs.filter(l => !l.includes(':')).join(', ')}, es-ar, pt-br\n`)
      }
      
      // Filter to only requested languages (include branch languages that depend on requested languages)
      supportedLangs = allSupportedLangs.filter(lang => {
        if (lang.includes(':')) {
          const [branchLang, mainLang] = lang.split(':')
          // Include branch language if either branch or main language is requested
          return languagesToProcess.includes(branchLang) || languagesToProcess.includes(mainLang)
        }
        return languagesToProcess.includes(lang)
      })
      
      if (supportedLangs.length === 0) {
        throw new Error(`No valid languages to process. Please check the language codes you provided.`)
      }
    }
    
    const sum = this.getTotalLines()
    console.log('Expected no. of translation keys on i18n files: ', sum)
    if (ignoreExisting) console.log('Will ignore keys with existing translation')
    
    for (let lang of supportedLangs) {
      await this.sleep(1)

      if (lang.includes(":")) {
        const [ branchLang, mainLang ] = lang.split(":")
        await this.copy(mainLang, branchLang)
        continue
      }

      // Load existing translations to check them (for detecting English entries)
      const importedModule = await this.getExistingTranslations(lang)
      // Start with existing translations, but we'll rebuild jsonData with only valid ones
      const allExistingData = importedModule || {}
      let jsonData = {}

      const manualTranslationsData = (await this.getManualTranslations(lang)) || {}
      // console.log(`Hardcoded translations for '${lang}': ${JSON.stringify(manualTranslations, undefined, 2)}`)

      let codes = { from: 'en', to: lang }
      if (lang === 'en-us') codes.to = 'en'

      console.log('==============================')
      console.log(`Processing ${codes.to}:`)
      console.log('==============================')

      let index = 0
      for (const _group of this.texts) {
        const group = Object.assign({}, _group)
        // console.log(`Group keys: ${JSON.stringify(Object.keys(group))}`)

        const { filteredGroup, manualTranslations, existingTranslations } = this.filterGroup(
          group, manualTranslationsData, allExistingData, ignoreExisting,
        )
        const translateCountData = {
          total: this.objectCount(group),
          filtered: this.objectCount(filteredGroup),
          manual: this.objectCount(manualTranslations),
        }
        if (ignoreExisting) translateCountData.existing = this.objectCount(existingTranslations)
 
        const label = this.getTextGroupLabel(index)
        console.log(`Translating ${label}...`)

        let translatedObj = {}
        
        // Only skip if there's absolutely nothing to process
        // Even if no new translations, we still need to preserve existing and manual translations
        const hasWorkToDo = (
          Object.keys(filteredGroup).length > 0 ||
          Object.keys(existingTranslations).length > 0 ||
          Object.keys(manualTranslations).length > 0
        )
        
        if (!hasWorkToDo) {
          console.log(`Skipping ${label} (nothing to translate or preserve)...`)
          index++
          continue
        }
        
        console.log(translateCountData)

        // Translate new entries that need translation
        if (Object.keys(filteredGroup).length !== 0) {
          const batchedGroups = this.batchGroup(filteredGroup);
          console.log('Batched into', batchedGroups.length, 'group(s)')
          for(let i = 0; i < batchedGroups.length; i++) {
            const batch = batchedGroups[i];
            // Sleep longer between batches to avoid rate limiting (2 seconds)
            // This helps prevent Google from blocking requests due to rate limiting
            await sleep(2000)
            console.log('Translating batch', (i + 1), 'of', batchedGroups.length, 'for', label)
            try {
              // translateGroup has built-in retry logic with exponential backoff
              Object.assign(translatedObj, await this.translateGroup(batch, codes))
            } catch (error) {
              // If all retries in translateGroup failed, fallback to English text
              console.error(`✗ All retry attempts failed for batch ${i + 1}:`, error.message)
              console.log('⚠ Using original English text as fallback for failed translations.')
              // Fallback to original English text for failed translations
              // These will be detected as English on next run and retranslated
              Object.assign(translatedObj, batch)
            }
          }
        }

        // Merge existing valid (non-English) translations first
        // Then merge newly translated entries (which may override existing if retranslated)
        if (Object.keys(existingTranslations).length > 0) {
          translatedObj = {
            ...existingTranslations,
            ...translatedObj,
          }
        }

        // Manual translations must override everything (existing, automated, etc.)
        // This ensures manual translations always have the final say
        if (Object.keys(manualTranslations).length > 0) {
          translatedObj = {
            ...translatedObj,
            ...manualTranslations,
          }
        }

        // place code here to replace any word or capitalization on a phrase or word
        for (const [key, value] of Object.entries(translatedObj)) {
          translatedObj[key] = value
            .replaceAll('bch', 'BCH')
            .replaceAll('utxo', 'UTXO')
            .replaceAll(this.regex.htmlClassRegex, '"highlighted-word"')
            .replaceAll('<-span', '<span')
        }
        
        // merge the previous and current objects
        Object.assign(jsonData, translatedObj)
        jsonData = this.orderObj(jsonData)

        // add commented notes
        let strData = '// NOTE: DONT EDIT THIS FILE\n'
        strData += '// UPDATE ON i18n/translate.js and follow steps there to apply changes\n\n'
        strData += 'export default '
        strData += JSON.stringify(jsonData, null, 2)

        // to remove the quotes on keys after stringify
        strData = strData.replace(/"([a-zA-Z_$][a-zA-Z0-9_$]*)":/g, '$1:')

        // write to our i18n/{lang_code}/index.js
        await this.write(strData, lang)

        index++
      }
    }
  }

  /**
   * @param {Object} group 
   * @param {{ from: String, to: String }} codes 
   */
  async translateGroup(group, codes) {
    if (Object.keys(group).length === 0) return {}
    if (codes.from === codes.to) return { ...group }

    // store all the interpolated substring in an object with its corresponding key
    const interpolatedWords = {}
    for (const [key, value] of Object.entries(group)) {
      const interpolatedMatches = value.match(this.regex.interpolatedStrRegex)
      if (interpolatedMatches !== null) {
        console.log('Interpolated', `[${key}] => '${value}'`, interpolatedMatches)
        interpolatedWords[key] = interpolatedMatches
      }
    }

    // translate in bulks with retry logic
    let translatedObj
    const maxRetries = 3
    const baseDelay = 2000 // 2 seconds base delay
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          // Exponential backoff: 2s, 4s, 8s
          const delay = baseDelay * Math.pow(2, attempt - 1)
          console.log(`Retry attempt ${attempt}/${maxRetries} after ${delay}ms delay...`)
          await sleep(delay)
        }
        translatedObj = await translate(group, codes)
        break // Success, exit retry loop
      } catch (error) {
        if (attempt === maxRetries) {
          // Final attempt failed, throw the error
          throw error
        }
        console.warn(`Translation attempt ${attempt + 1} failed:`, error.message)
        // Continue to retry
      }
    }
    if (codes.to == 'en') {
      let hasInconsistency = false
      for (const [key, value] of Object.entries(translatedObj)) {
        if (group[key] !== value) {
          hasInconsistency = true
          console.log('Found inconsistency!', key, `translated to '${value}' instead of '${group[key]}'`)
        }
      }
      if (hasInconsistency) {
        console.log('Codes', codes)
        console.log('TranslatedObj', translatedObj)
        console.log('Group', group)
        throw new Error('Has inconsistency')
      }
    }

    // replace the translated interpolation placeholder with the untranslated one
    if (Object.keys(interpolatedWords).length !== 0) {
      const placeholder = '{STRING}'
      for (const [key, value] of Object.entries(translatedObj)) {
        translatedObj[key] = value.replace(this.regex.interpolatedStrRegex, placeholder)
        if (Object.keys(interpolatedWords).includes(key)) {
          for (const interpolatedKey of interpolatedWords[key]) {
            translatedObj[key] = translatedObj[key].replace(placeholder, interpolatedKey)
          } 
        }
      }
    }

    return translatedObj
  }

  filterGroup(group, manualTranslations, existingData, ignoreExisting = false) {
    const existing = {}
    const manual = {}
    const filteredGroup = {}

    Object.keys(group).forEach(key => {
      if (manualTranslations?.[key]) {
        // Always preserve manual translations
        manual[key] = manualTranslations[key]
      } else if (existingData?.[key] && ignoreExisting) {
        // When ignoreExisting is true, always use existing translations without checking
        existing[key] = existingData[key]
      } else if (existingData?.[key]) {
        // When ignoreExisting is false, check if existing translation is actually in English (matches source)
        // If it matches the English source, it needs to be retranslated
        const existingValue = existingData[key]
        const sourceValue = group[key]
        
        // Normalize both values for comparison (trim whitespace, handle case)
        const normalizedExisting = existingValue.trim()
        const normalizedSource = sourceValue.trim()
        
        // If existing translation matches source English text, it needs translation
        if (normalizedExisting.toLowerCase() === normalizedSource.toLowerCase()) {
          filteredGroup[key] = group[key]
        } else {
          existing[key] = existingData[key]
        }
      } else {
        filteredGroup[key] = group[key]
      }
    })

    return { filteredGroup, manualTranslations: manual, existingTranslations: existing }
  }

  batchGroup(group) {
    const keys = Object.keys(group)
    const batchedKeys = [];
    for (let i = 0; i < keys.length; i += this.batchSize) {
      batchedKeys.push(keys.slice(i, i + this.batchSize));
    }
    return batchedKeys.map(keys => {
      const obj = {};
      keys.forEach(key => obj[key] = group[key]);
      return obj
    })
  }

  /**
   * @param {Object} obj
   */
  objectCount(obj) {
    return Object.keys(obj).length
  }

  // order by keys
  orderObj (unorderedObj) {
    return Object.keys(unorderedObj)
      .sort()
      .reduce((obj, key) => {
        obj[key] = unorderedObj[key]
        return obj
      }, {})
  }

  // writing to language index files
  write (data, to) {
    const toPath = `./${to}/${this.indexFile}`
  
    return new Promise((resolve, reject) => {
      fs.writeFile(
        toPath,
        data,
        (err) => {
          if (err) reject(err)
          else resolve()
        }
      )
    })
  }

  // used to copy branch languages from their main languages
  copy (from, to) {
    const fromPath = `./${from}/${this.indexFile}`
    const toPath = `./${to}/${this.indexFile}`
  
    return new Promise((resolve, reject) => {
      fs.copyFile(
        fromPath,
        toPath,
        (err) => {
          if (err) reject(err)
          else resolve()
        }
      )
    })
  }

  async getExistingTranslations(lang) {
    const fromPath = `./${lang}/${this.indexFile}`
    const toPath = `./${lang}/temp-${Date.now()}.mjs`
    if (!fs.existsSync(fromPath)) return {}
    fs.copyFileSync(fromPath, toPath)
    const data = await import(toPath)
    fs.unlinkSync(toPath)
    return data?.default
  }

  async getManualTranslations(lang) {
    const fromPath = `./__manual_translations/${lang}.js`
    const toPath = `./${lang}/temp-${Date.now()}.mjs`
    if (!fs.existsSync(fromPath)) return {}
    fs.copyFileSync(fromPath, toPath)
    const data = await import(toPath)
    fs.unlinkSync(toPath)
    return data?.default
  }
  
  async sleep (seconds) {
    await new Promise(r => setTimeout(r, seconds * 1000))
  }
  
  // get text group label for logging
  getTextGroupLabel (index) {
    const wordsLen = words.length
    const staticLen = phrases.static.length
    const wordsAndStaticLen = staticLen + wordsLen
    const wordsStaticAndDynamicLen = wordsAndStaticLen + phrases.dynamic.length
  
    if (index < wordsLen) {
      return `words group ${index + 1}`
    } else if (index < wordsAndStaticLen) {
      const groupNo = index - (wordsLen - 1)
      return `static phrases group ${groupNo}`
    } else if (index < wordsStaticAndDynamicLen) {
      const groupNo = index - (wordsAndStaticLen - 1)
      return `dynamic phrases group ${groupNo}`
    } else {
      const groupNo = index - (wordsStaticAndDynamicLen - 1)
      return `other group ${groupNo}`
    }
  }

  // print out length of texts for verification later after writing to file
  getTotalLines () {
    let sum = 0
    for (const group of this.texts) {
      sum += Object.keys(group).length
    }
    return sum
  }
  
}

module.exports = Translator

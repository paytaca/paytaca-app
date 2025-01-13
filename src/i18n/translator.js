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
    this.texts = [
      ...words,
      ...phrases.static,
      ...phrases.dynamic,
    ]
    this.regex = {
      interpolatedStrRegex: /\{(\w|\p{Script=Han}|\p{Script=Hiragana}|\p{Script=Katakana})+\}|<(.|\p{Script=Han}|\p{Script=Hiragana}|\p{Script=Katakana})+>/gu,
      htmlClassRegex: /[“|"](\s|\w|\p{Script=Han}|\p{Script=Hiragana}|\p{Script=Katakana})+[”|"]/gu,
    }
    this.hardcodedTranslations = {
      'tl': {
        Close: 'Isara',
      },
      'zh-tw': {
        Pin: '密碼',
        ChangePin: '密碼',
        Biometric: '生物認證',
        ShowTokens: '顯示幣種',
        ManageIgnoredTokens: '管理被忽略幣種',
        ChineseTraditional: '中文繁體字',
        Ramp: 'Ramp',
        CryptoSwap: "Ramp",
        Sweep: 'Sweep',
        Collectibles: 'NFT',
        Home: '主頁',
        Send: '發送',
        Receive: '收取',
        Apps: '應用程式',
        Points: '積分',
        ButtonDeem: '點心幣',
        DEEM: '點'
      },
      'zh-cn': {
        ButtonDeem: '點心幣',
        DEEM: '點'
      }
    }
  }

  async translate (opts = { ignoreExisting: false }) {
    const ignoreExisting = opts?.ignoreExisting
    /*
      check for supported language codes here
      https://github.com/shikar/NODE_GOOGLE_TRANSLATE/blob/master/languages.js
    */
    const supportedLangs = [
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
    const sum = this.getTotalLines()
    console.log('Expected no. of translation keys on i18n files: ', sum)
    if (ignoreExisting) console.log('Will ignore keys with existing translation')
    
    let jsonData = {}

    for (let lang of supportedLangs) {
      await this.sleep(1)

      if (lang.includes(":")) {
        const [ branchLang, mainLang ] = lang.split(":")
        this.copy(mainLang, branchLang)
        continue
      }

      if (ignoreExisting) {
        const importedModule = await this.getExistingTranslations(lang)
        jsonData = importedModule?.default || {}
      }

      let codes = { from: 'en', to: lang }
      if (lang === 'en-us') codes.to = 'en'

      console.log('==============================')
      console.log(`Processing ${codes.to}:`)
      console.log('==============================')

      let index = 0
      for (const _group of this.texts) {
        const group = Object.assign({}, _group)

        // filter keys that already exist in main output: `jsonData`
        const deletedKeys = []
        if (ignoreExisting) {
          Object.keys(group).forEach(key => {
            if (!jsonData[key]) return

            delete group[key]
            deletedKeys.push(key)
          })
        }

        const label = this.getTextGroupLabel(index)
        if (Object.keys(group).length === 0) {
          console.log(`Skipping ${label}...`)
          index++
          continue
        }

        console.log(`Translating ${label}...`)
        if (deletedKeys.length) console.log('Ignored keys:', deletedKeys.length)

        // store all the interpolated substring in an object with its corresponding key
        const interpolatedWords = {}
        for (const [key, value] of Object.entries(group)) {
          const interpolatedMatches = value.match(this.regex.interpolatedStrRegex)
          if (interpolatedMatches !== null) interpolatedWords[key] = interpolatedMatches
        }

        // Sleep for 2 seconds
        await sleep(2000)

        // translate in bulks
        let translatedObj = await translate(group, codes)

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

        // override hardcoded translations
        if (Object.keys(this.hardcodedTranslations).indexOf(lang) > -1) {
          translatedObj = {
            ...translatedObj,
            ...this.hardcodedTranslations[lang]
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
        strData = strData.replace(/"([^"]+)":/g, '$1:')

        // write to our i18n/{lang_code}/index.js
        this.write(strData, lang)

        index++
      }
    }
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
  
    fs.writeFile(
      toPath,
      data,
      (err) => {
        if (err) throw err
      }
    )
  }

  // used to copy branch languages from their main languages
  copy (from, to) {
    const fromPath = `./${from}/${this.indexFile}`
    const toPath = `./${to}/${this.indexFile}`
  
    fs.copyFile(
      fromPath,
      toPath,
      (err) => {
        if (err) throw err
      }
    )
  }

  async getExistingTranslations(lang) {
    const fromPath = `./${lang}/${this.indexFile}`
    const toPath = `./${lang}/temp-${Date.now()}.mjs`
    if (!fs.existsSync(fromPath)) return {}
    fs.copyFileSync(fromPath, toPath)
    const data = await import(toPath)
    fs.unlinkSync(toPath)
    return data
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

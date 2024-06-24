import enUS from './en-us'
import de from './de'
import zhTW from './zh-tw'
import zhCN from './zh-cn'
import es from './es'
import esAR from './es-ar'
import pt from './pt'
import ptBR from './pt-br'
import ha from './ha'
import af from './af'
import ceb from './ceb'
import fr from './fr'
import tl from './tl'
import nl from './nl'
import id from './id'
import it from './it'
import ja from './ja'
import ko from './ko'


/**
 * 
 * NOTE: these are the languages supported by translate-google npm package
 * 
 * COMMENT the uncommented are the ones supported by paytaca-pos at the moment
 * 
 * TO ADD A LANGUAGE:
 * 1. add language here and uncomment in the object below
 * 2. add language code in Translator.translate()#supportedLangs variable
 * 3. add a folder on src/i18n/ and add an index.js file in the folder
 * 
 * 
 */
export const supportedLangs = {
  af: 'Afrikaans',
  // sq: 'Albanian',
  // ar: 'Arabic',
  // hy: 'Armenian',
  // az: 'Azerbaijani',
  // eu: 'Basque',
  // be: 'Belarusian',
  // bn: 'Bengali',
  // bs: 'Bosnian',
  // bg: 'Bulgarian',
  // ca: 'Catalan',
  ceb: 'Cebuano',
  // ny: 'Chichewa',
  'zh-cn': 'Chinese Simplified',
  'zh-tw': 'Chinese Traditional',
  // co: 'Corsican',
  // hr: 'Croatian',
  // cs: 'Czech',
  // da: 'Danish',
  nl: 'Dutch',
  en: 'English',
  // eo: 'Esperanto',
  // et: 'Estonian',
  tl: 'Filipino',
  // fi: 'Finnish',
  fr: 'French',
  // fy: 'Frisian',
  // gl: 'Galician',
  // ka: 'Georgian',
  de: 'German',
  // el: 'Greek',
  // gu: 'Gujarati',
  // ht: 'Haitian Creole',
  ha: 'Hausa',
  // haw: 'Hawaiian',
  // iw: 'Hebrew',
  // hi: 'Hindi',
  // hmn: 'Hmong',
  // hu: 'Hungarian',
  // is: 'Icelandic',
  // ig: 'Igbo',
  id: 'Indonesian',
  // ga: 'Irish',
  it: 'Italian',
  ja: 'Japanese',
  // jw: 'Javanese',
  // kn: 'Kannada',
  // kk: 'Kazakh',
  // km: 'Khmer',
  ko: 'Korean',
  // ku: 'Kurdish (Kurmanji)',
  // ky: 'Kyrgyz',
  // lo: 'Lao',
  // la: 'Latin',
  // lv: 'Latvian',
  // lt: 'Lithuanian',
  // lb: 'Luxembourgish',
  // mk: 'Macedonian',
  // mg: 'Malagasy',
  // ms: 'Malay',
  // ml: 'Malayalam',
  // mt: 'Maltese',
  // mi: 'Maori',
  // mr: 'Marathi',
  // mn: 'Mongolian',
  // my: 'Myanmar (Burmese)',
  // ne: 'Nepali',
  // no: 'Norwegian',
  // ps: 'Pashto',
  // fa: 'Persian',
  // pl: 'Polish',
  pt: 'Portuguese',
  // ma: 'Punjabi',
  // ro: 'Romanian',
  // ru: 'Russian',
  // sm: 'Samoan',
  // gd: 'Scots Gaelic',
  // sr: 'Serbian',
  // st: 'Sesotho',
  // sn: 'Shona',
  // sd: 'Sindhi',
  // si: 'Sinhala',
  // sk: 'Slovak',
  // sl: 'Slovenian',
  // so: 'Somali',
  es: 'Spanish',
  // su: 'Sudanese',
  // sw: 'Swahili',
  // sv: 'Swedish',
  // tg: 'Tajik',
  // ta: 'Tamil',
  // te: 'Telugu',
  // th: 'Thai',
  // tr: 'Turkish',
  // uk: 'Ukrainian',
  // ur: 'Urdu',
  // uz: 'Uzbek',
  // vi: 'Vietnamese',
  // cy: 'Welsh',
  // xh: 'Xhosa',
  // yi: 'Yiddish',
  // yo: 'Yoruba',
  // zu: 'Zulu'
}

export default {
  'en-us': enUS,
  'zh-cn': zhCN,
  'zh-tw': zhTW,
  'es-ar': esAR,
  'pt-br': ptBR,
  de,
  es,
  pt,
  ha,
  af,
  ceb,
  nl,
  id,
  it,
  ja,
  ko,
  fr,
  tl,
}

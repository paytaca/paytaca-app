import { Store } from 'src/store';
import { i18n } from 'src/boot/i18n';
import axios from 'axios';
import supportedLangs from 'src/i18n';

const { t: $t } = i18n.global

const UPDATE_PREFERENCES_FLAG = 'preferences-updated'

export async function getIPGeolocationPreferences() {
    const result = {
        country: {
            name: 'United States',
            code: 'US'
        },
        currency: {
            symbol: 'USD',
            name: 'United States Dollar'
        },
        langs: ['en-us'],
    }

    const apiKey = process.env.IPGEO_API_KEY
    const url = `https://api.ipgeolocation.io/ipgeo?apiKey=${apiKey}`
    const response = await axios.get(url)?.catch(console.error)

    if (response?.data?.country_name) {
        result.country = {
            name: response?.data?.country_name,
            code: response?.data?.country_code2
        }
    }

    if (response?.data?.currency.code) {
        result.currency = {
            symbol: response?.data?.currency.code,
            name: response?.data?.currency?.name
        }
    }

    if (typeof response?.data?.languages === 'string' && response?.data?.languages) {
        result.langs = response?.data?.languages?.toLowerCase().split(',')
    }
    return result
}

export async function updatePreferences () {

    const alreadyUpdated = window.localStorage.getItem(UPDATE_PREFERENCES_FLAG)
    if (Boolean(alreadyUpdated) === true) {
        console.log('Preferences already updated:', alreadyUpdated)
        return
    }

    const ipGeoPreferences = await getIPGeolocationPreferences()
    console.log(ipGeoPreferences)
    console.log('ipGeoPreferences:', ipGeoPreferences)
    Store.commit('global/setCountry', {
      country: ipGeoPreferences.country,
      denomination: 'BCH' // Default denomination, can be changed by user later
    })

    const languageCodes = ipGeoPreferences.langs
    
    languageCodes.sort((a, b) => {
        const aHasDash = a.includes('-') ? 0 : 1;
        const bHasDash = b.includes('-') ? 0 : 1;
        return aHasDash - bHasDash;
    });

    console.log('languagesCodes:', languageCodes)

    let selectedLangCode = 'en-us';
    const supportedLanguageCodes = Object.getOwnPropertyNames(supportedLangs)
    for (let languageCode of languageCodes) {
        const generalLanguageCode = languageCode.replace(/-.*$/, '');
        const languageMatched = supportedLanguageCodes.find(langOption => {
            if (langOption === languageCode) return true
            if (langOption.includes(generalLanguageCode)) return true
            return false
        })
        if (!languageMatched) continue
        selectedLangCode = languageMatched
        break
    }
    console.log('languageCode:', selectedLangCode)
    i18n.global.locale = selectedLangCode
    Store.commit('global/setLanguage', selectedLangCode)

    // update currency
    Store.dispatch('global/refetchWalletPreferences')
    window.localStorage.setItem(UPDATE_PREFERENCES_FLAG, true) // Mark rollback done
    console.log('Preferences updated')
}

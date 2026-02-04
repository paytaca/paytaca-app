<template>
	<q-dialog 
		ref="dialog" 
		full-width		
	    position="top"
	    transition-show="fade"
	    transition-hide="fade"
	>
		<q-card class="br-15 q-mt-xl q-mx-sm wallet-card" :class="getDarkModeClass(darkMode)">
			<div class="row no-wrap items-center justify-center q-pl-lg q-pr-sm q-pt-md">
		        <div class="text-bold q-space q-mt-sm pt-label" :class="getDarkModeClass(darkMode)">{{ $t('SelectLanguage') }}</div>
		        <q-btn
		          flat
		          padding="sm"
		          icon="close"
		          class="close-button"
		          v-close-popup
		        />
		    </div>
		    <q-card-section>
		        <q-input
		          dense
		          outlined
		          rounded
		          v-model="searchText"
		          :placeholder="$t('SearchLanguage')"
		        >
		          <template v-slot:append>
		            <q-icon name="search" color="grey-5" />
		          </template>
		        </q-input>
		      </q-card-section>
			<div :class="darkMode ? 'text-white' : 'text-black'">
				<q-list separator class="q-px-lg">
					<q-item 
						class="q-py-md" 
						clickable 
						v-ripple 
						v-for="language in filteredList" 
						@click="onOKClick(language)" 
						:key="language.value"
					>
		        <q-item-section class="text-bold">
							{{ language.label }}
						</q-item-section>
						<q-item-section side>
							<q-item-label caption>{{ language.value }}</q-item-label>
						</q-item-section>
					</q-item>
				</q-list>
			</div>
		</q-card>
	</q-dialog>	
</template>
<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

// Language picker labels should not rely on translation keys.
// Best practice is to display each language in its native form (autonym),
// so users can recognize their language regardless of the current UI language.
const languageLabels = {
  'af': 'Afrikaans',
  'en-us': 'English',
  'zh-cn': '中文（简体）',
  'zh-tw': '中文（繁體）',
  'nl': 'Nederlands',
  'fr': 'Français',
  'de': 'Deutsch',
  'ha': 'Hausa',
  'id': 'Bahasa Indonesia',
  'it': 'Italiano',
  'ja': '日本語',
  'ko': '한국어',
  'pt': 'Português',
  'pt-br': 'Português (Brasil)',
  'es': 'Español',
  'es-ar': 'Español (Argentina)',
  'tl': 'Tagalog',
  'ru': 'Русский',
  'ar': 'العربية'
}

export default {
	data () {
		return {
			searchText: ''
		}
	},
	computed: {
		darkMode () {
	    return this.$store.getters['darkmode/getStatus']
	  },
	  languages () {
	    // Build languages array with proper labels
	    // Use autonyms to avoid missing translation keys and improve recognition.
	    return [
	      { value: 'en-us', label: languageLabels['en-us'] },
	      { value: 'zh-cn', label: languageLabels['zh-cn'] },
	      { value: 'zh-tw', label: languageLabels['zh-tw'] },
	      { value: 'nl', label: languageLabels['nl'] },
	      { value: 'fr', label: languageLabels['fr'] },
	      { value: 'de', label: languageLabels['de'] },
	      { value: 'ha', label: languageLabels['ha'] },
	      { value: 'id', label: languageLabels['id'] },
	      { value: 'it', label: languageLabels['it'] },
	      { value: 'ja', label: languageLabels['ja'] },
	      { value: 'ko', label: languageLabels['ko'] },
	      { value: 'pt', label: languageLabels['pt'] },
	      { value: 'pt-br', label: languageLabels['pt-br'] },
	      { value: 'es', label: languageLabels['es'] },
	      { value: 'es-ar', label: languageLabels['es-ar'] },
	      { value: 'tl', label: languageLabels['tl'] },
	      { value: 'af', label: languageLabels['af'] },
	      { value: 'ru', label: languageLabels['ru'] },
	      { value: 'ar', label: languageLabels['ar'] }
	    ]
	  },
	  filteredList () {
      if (!this.searchText) return this.languages

      const needle = String(this.searchText).toLowerCase()

      return this.languages
        .filter(language => {
          if (!this.searchText) return true
          if (!language) return false

          return String(language.label).toLowerCase().includes(needle) || 
                 String(language.value).toLowerCase().includes(needle)
        })
    }
	},
	methods: {
		getDarkModeClass,
		onOKClick (language) {
      this.$emit('ok', language)
      this.$refs.dialog.hide()
    }
	}
}
</script>
<style lang="scss" scoped>
.wallet-card {
  height: 525px;
  .title {
    font-size: 18px;
  }
  .bottom-border {
    border-bottom-width: 1px;
    border-bottom-style: solid;
  }
}
</style>


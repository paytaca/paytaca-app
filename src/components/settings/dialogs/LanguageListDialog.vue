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

const translationKeys = {
  'af': 'Afrikaans',
  'en-us': 'English',
  'zh-cn': 'ChineseSimplified',
  'zh-tw': 'ChineseTraditional',
  'nl': 'Dutch',
  'fr': 'French',
  'de': 'German',
  'ha': 'Hausa',
  'id': 'Indonesian',
  'it': 'Italian',
  'ja': 'Japanese',
  'ko': 'Korean',
  'pt': 'Portuguese',
  'pt-br': 'BrazilianPortuguese',
  'es': 'Spanish',
  'es-ar': 'ArgentinianSpanish',
  'tl': 'Tagalog',
  'ru': 'Russian',
  'ar': 'Arabic'
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
	    // Always use translationKeys values directly to avoid "EN" translation issues
	    // These are already good display names (e.g., "English", "Tagalog", etc.)
	    return [
	      { value: 'en-us', label: translationKeys['en-us'] },
	      { value: 'zh-cn', label: translationKeys['zh-cn'] },
	      { value: 'zh-tw', label: translationKeys['zh-tw'] },
	      { value: 'nl', label: translationKeys['nl'] },
	      { value: 'fr', label: translationKeys['fr'] },
	      { value: 'de', label: translationKeys['de'] },
	      { value: 'ha', label: translationKeys['ha'] },
	      { value: 'id', label: translationKeys['id'] },
	      { value: 'it', label: translationKeys['it'] },
	      { value: 'ja', label: translationKeys['ja'] },
	      { value: 'ko', label: translationKeys['ko'] },
	      { value: 'pt', label: translationKeys['pt'] },
	      { value: 'pt-br', label: translationKeys['pt-br'] },
	      { value: 'es', label: translationKeys['es'] },
	      { value: 'es-ar', label: translationKeys['es-ar'] },
	      { value: 'tl', label: translationKeys['tl'] },
	      { value: 'af', label: translationKeys['af'] },
	      { value: 'ru', label: translationKeys['ru'] },
	      { value: 'ar', label: translationKeys['ar'] }
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


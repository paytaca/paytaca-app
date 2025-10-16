<template>
  <q-dialog ref="dialog" @hide="onDialogHide" full-width seamless>
    <q-card class="br-15 pt-card-2 text-bow" :class="getDarkModeClass(darkMode)">
      <div class="row no-wrap items-center justify-center q-pl-md">
        <div class="text-subtitle1 q-space q-mt-sm">{{ title }}</div>
        <q-btn
          flat
          padding="sm"
          icon="close"
          class="close-button"
          v-close-popup
        />
      </div>
      <q-tab-panels v-model="panel" animated class="pt-card-2" :class="getDarkModeClass(darkMode)">
        <q-tab-panel name="list" class="q-pa-none">
          <q-card-section>
            <div class="row items-center justify-end q-mb-sm">
              <q-btn
                no-caps
                flat
                icon-right="mdi-arrow-right"
                :label="$t(isHongKong(currentCountry) ? 'SelectCustomPoint' : 'SelectCustomToken')"
                class="button button-text-secondary"
                padding="none xs"
                @click="panel='custom'"
              />
            </div>
            <q-input
              dense
              outlined
              v-model="searchText"
              rounded
            >
               <template v-slot:append>
                <q-icon name="search" color="grey-5" />
              </template>
            </q-input>
            <q-toggle
              :label="$t('HasBalance')"
              class="q-mt-sm"
              color="brandblue"
              keep-color
              v-model="showHasBalance"
            />
          </q-card-section>
          <q-card-section class="q-pt-none q-mb-sm q-mx-md tokens-card-section">
            <q-virtual-scroll :items="filteredTokensList">
              <template v-slot="{ item: token, index }">
                <q-item clickable @click="onOKClick(token)">
                  <q-item-section avatar>
                    <img v-if="token.image_url" :src="token.image_url" height="30" class="q-mr-xs" alt="">
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>{{ token.symbol }}</q-item-label>
                    <q-item-label :class="{'text-grey-6': darkMode}" style="overflow-wrap: anywhere;" caption>
                      {{ token.name }}
                    </q-item-label>
                  </q-item-section>
                  <q-item-section v-if="token.balance" side>
                    <q-item-label :class="{'text-grey-6': darkMode}" caption>
                      {{ formatNumber(token.balance) }}
                    </q-item-label>
                  </q-item-section>
                </q-item>
              </template>
            </q-virtual-scroll>
          </q-card-section>
        </q-tab-panel>
        <q-tab-panel name="custom" class="q-pa-none">
          <q-card-section>
            <div class="row items-center justify-end q-mb-sm">
              <q-btn
                no-caps
                icon="mdi-arrow-left"
                :label="$t('SelectFromList')"
                class="button button-text-secondary"
                padding="none xs"
                flat
                @click="panel='list'"
              />
            </div>
            <q-input
              dense
              outlined
              rounded
              placeholder="Input token address"
              v-model="customToken.address"
              @update:model-value="!matchedTokensListFromCustomAddress.length ? updateCustomTokenInfo() : null"
            />
          </q-card-section>
          <q-card-section class="q-pt-none tokens-card-section">
            <div v-if="customToken.fetchingInfo" class="row items-center justify-center">
              <ProgressLoader />
            </div>

            <q-item
              v-if="customToken.address && customToken.info.address.toLowerCase() === customToken.address.toLowerCase()"
              clickable
              @click="onOKClick(Object.assign({ customToken: true }, customToken.info))"
            >
              <q-item-section avatar>
                <img v-if="customToken.info.image_url" :src="customToken.info.image_url" height="30" class="q-mr-xs" alt="">
              </q-item-section>
              <q-item-section>
                <q-item-label>{{ customToken.info.symbol }}</q-item-label>
                <q-item-label
                  :class="{'text-grey-6': darkMode}"
                  style="overflow-wrap: anywhere;"
                  caption
                >
                  {{ customToken.info.name }}
                </q-item-label>
              </q-item-section>
            </q-item>
            <q-virtual-scroll :items="matchedTokensListFromCustomAddress">
              <template v-slot="{ item: token, index }">
                <q-item clickable @click="onOKClick(token)">
                  <q-item-section avatar>
                    <img v-if="token.image_url" :src="token.image_url" height="30" class="q-mr-xs" alt="">
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>{{ token.symbol }}</q-item-label>
                    <q-item-label
                      :class="{'text-grey-6': darkMode}"
                      style="overflow-wrap: anywhere;"
                      caption
                    >
                      {{ token.name }}
                    </q-item-label>
                  </q-item-section>
                </q-item>
              </template>
            </q-virtual-scroll>
          </q-card-section>
        </q-tab-panel>
      </q-tab-panels>
    </q-card>
  </q-dialog>
</template>
<script>
import { debounce } from 'quasar'
import { inject } from 'vue'
import { getSep20ContractDetails } from '../../wallet/sbch/utils'
import ProgressLoader from '../ProgressLoader.vue'
import { isHongKong, getDarkModeClass } from 'src/utils/theme-darkmode-utils'

const _customTokenInfoCache = {}

export default {
  name: 'SmartSwapTokenSelectorDialog',
  emits: [
    // REQUIRED
    'ok', 'hide'
  ],
  components: {
    ProgressLoader
  },
  props: {
    title: {
      type: String
    },
    tokensList: {
      type: Array
    },
    disableToken: {
      type: String,
      defalt: ''
    },
    darkMode: {
      type: Boolean,
      default: false
    },
    currentCountry: { type: String }
  },
  data () {
    return {
      searchText: '',
      showHasBalance: false,
      panel: 'list',
      customToken: {
        address: '',
        fetchingInfo: false,
        info: {
          address: '',
          name: '',
          symbol: '',
          decimals: 0,
          image_url: ''
        }
      }
    }
  },
  computed: {
    theme () {
      return this.$store.getters['global/theme']
    },
    filteredTokensList () {
      if (!Array.isArray(this.tokensList)) return []
      if (!this.searchText && !this.showHasBalance) return this.tokensList

      const needle = String(this.searchText).toLowerCase()

      return this.tokensList
        .filter(token => {
          if (!this.searchText) return true
          if (!token) return false
          if (/0x[0-9a-f]+/.test(needle) && String(token.address).toLowerCase() === needle) return true

          return String(token.name).toLowerCase().includes(needle) ||
                  String(token.symbol).toLowerCase().includes(needle)
        })
        .filter(token => {
          if (!this.showHasBalance) return true
          return token.balance > 0
        })
    },
    matchedTokensListFromCustomAddress () {
      return this.tokensList
        .filter(token => {
          if (!token) return
          return this.customToken.address.toLowerCase() === token.address.toLowerCase()
        })
    }
  },
  methods: {
    isHongKong,
    getDarkModeClass,
    formatNumber (value = 0, decimals = 6) {
      return Number(value.toPrecision(decimals))
    },
    updateCustomTokenInfo: debounce(function () {
      if (!this.customToken.address) return
      if (_customTokenInfoCache[this.customToken.address.toLowerCase()]) {
        this.customToken.info = Object.assign({
          address: '',
          name: '',
          symbol: '',
          decimals: 0,
          image_url: ''
        }, _customTokenInfoCache[this.customToken.address.toLowerCase()])
        return
      }

      this.customToken.fetchingInfo = true
      getSep20ContractDetails(this.customToken.address)
        .finally(() => {
          this.customToken.fetchingInfo = false
        })
        .then(response => {
          if (response.success) {
            this.customToken.info.address = response.token.address
            this.customToken.info.name = response.token.name
            this.customToken.info.symbol = response.token.symbol
            this.customToken.info.decimals = response.token.decimals
            this.customToken.info.image_url = response.token.image_url
            _customTokenInfoCache[this.customToken.address.toLowerCase()] = Object.assign({}, this.customToken.info)
            return Promise.resolve(response)
          }
          return Promise.reject(response)
        })
        .catch((err) => {
          console.log(err)
          if (this.customToken.address.toLowerCase() !== this.customToken.info.address.toLowerCase()) {
            this.customToken.info.address = ''
            this.customToken.info.name = ''
            this.customToken.info.symbol = ''
            this.customToken.info.decimals = 0
            this.customToken.info.image_url = ''
          }
        })
    }, 500),
    // following method is REQUIRED
    // (don't change its name --> "show")
    show () {
      this.$refs.dialog.show()
    },

    // following method is REQUIRED
    // (don't change its name --> "hide")
    hide () {
      this.$refs.dialog.hide()
    },

    onDialogHide () {
      // required to be emitted
      // when QDialog emits "hide" event
      this.$emit('hide')
    },

    onOKClick (token) {
      // on OK, it is REQUIRED to
      // emit "ok" event (with optional payload)
      // before hiding the QDialog
      this.$emit('ok', token)
      // or with payload: this.$emit('ok', { ... })

      // then hiding dialog
      this.hide()
    },

    onCancelClick () {
      // we just need to hide dialog
      this.hide()
    }
  }
}
</script>

<style lang="scss" scoped>
  .tokens-card-section {
    max-height: 50vh;
    overflow-y: auto;
  }
</style>
<template>
  <q-dialog ref="dialog" @hide="onDialogHide" :persistent="true" seamless class="no-click-outside">
    <q-card class="q-dialog-plugin br-15 q-pb-sm pt-card" :class="getDarkModeClass(darkMode)">
        <q-card-section class="text-weight-medium pt-label" :class="getDarkModeClass(darkMode)">
          <span>{{ addTokenTitle }}</span>
        </q-card-section>

        <q-separator />
        <q-form ref="questForm" class="q-gutter-y-sm q-mx-none" method="post" @submit="onOKClick">
          <q-card-section class="q-pb-none">
            <q-input
              ref="SLPTokenID"
              filled
              color="input-color"
              :label="inputPlaceholder"
              type="text"
              lazy-rules
              v-model="tokenId"
              :dark="darkMode"
              :rules="[
                val => Boolean(val) || $t('Required'),
              ]"
            />
          </q-card-section>

          <div v-if="loading" class="flex justify-center">
            <ProgressLoader :color="isNotDefaultTheme(theme) ? theme : 'pink'"/>
          </div>
          <div class="col-12 q-mx-md q-mb-md overflow-hidden" v-if="asset !== null">
            <div class="row" v-for="val, key in asset" :key="key">
              <div v-if="key !== 'id'" class="col-12">
                <div v-if="key !== 'logo'" class="row">
                  <div v-if="key !== 'is_nft'" class="col-4 text-blue-9">
                    {{ formatTokenDetailsKey(key) }} :
                  </div>
                  <div v-if="key !== 'is_nft'" class="text-right col-8 text-grad">
                    {{ val }}
                  </div>
                </div>

                <div v-else class="flex justify-center q-mb-sm">
                  <img :src="val" height="50" />
                </div>
              </div>
            </div>
          </div>

          <q-separator class="q-mt-none" />

          <q-card-actions align="right">
            <q-btn
              rounded
              flat
              :label="$t('Close')"
              padding="0.5em 2em 0.5em 2em"
              class="text-bow"
              :class="getDarkModeClass(darkMode)"
              @click="onCancelClick"
            />
            <template v-if="asset">
              <q-btn
                  rounded
                  class="text-white button button-text-primary"
                  :class="getDarkModeClass(darkMode)"
                  padding="0.5em 2em 0.5em 2em"
                  :label="$t('Add')"
                  type="submit"
                  :disable="addBtnDisabled"
                />
            </template>
          </q-card-actions>
        </q-form>
    </q-card>
  </q-dialog>
</template>

<script>
import { getWalletByNetwork } from 'src/wallet/chipnet'
import ProgressLoader from '../../../components/ProgressLoader.vue'
import { getDarkModeClass, isNotDefaultTheme, isHongKong } from 'src/utils/theme-darkmode-utils'

export default {
  components: {
    ProgressLoader,
  },
  emits: [
    // REQUIRED
    'ok', 'hide'
  ],
  props: {
    network: {
      type: String,
      default: 'BCH'
    },
    isCashToken: {
      type: Boolean,
      required: true
    },
    wallet: {
      type: Object,
      required: true
    },
    darkMode: Boolean,
    currentCountry: String
  },

  data () {
    return {
      tokenId: '',
      addBtnDisabled: true,
      asset: null,
      loading: false
    }
  },
  watch: {
    tokenId (n, o) {
      this.asset = null
      console.log('this.isTokenIdValid', this.isTokenIdValid)
      if (!this.isTokenIdValid) return
      this.setAssetDetails()
    }
  },
  computed: {
    isSep20 () {
      return this.network === 'sBCH'
    },
    isTokenIdValid() {
      if (this.isSep20) return this.tokenId?.length == 42 && this.tokenId?.startsWith?.('0x')
      return this.tokenId?.trim?.()?.length == 64
    },
    addTokenTitle () {
      if (this.isSep20)
        return this.$t(this.isHongKong(this.currentCountry) ? 'Add_SEP20_Point' : 'Add_SEP20_Token')
      if (this.isCashToken) {
        return this.$t(this.isHongKong(this.currentCountry) ? 'AddFungibleCashPoint' : 'AddFungibleCashToken')
      }
      return this.$t(this.isHongKong(this.currentCountry) ? 'Add_Type1_Point' : 'Add_Type1_Token')
    },
    inputPlaceholder () {
      if (this.isSep20)
        this.$t('Enter_SEP20_ContractAddress')
      if (this.isCashToken)
        return this.$t(this.isHongKong(this.currentCountry) ? 'EnterCashPointCategoryID' : 'EnterCashTokenCategory')
      return this.$t(this.isHongKong(this.currentCountry) ? 'Enter_SLP_PointId' : 'Enter_SLP_TokenId')
    },
    theme () {
      return this.$store.getters['global/theme']
    }
  },

  methods: {
    getDarkModeClass,
    isNotDefaultTheme,
    isHongKong,
    show () {
      this.$refs.dialog.show()
    },
    formatTokenDetailsKey (key) {
      return key.charAt(0).toUpperCase() + key.slice(1)
    },
    setAssetDetailsSep20() {
      const vm = this
      vm.loading = true
      console.log('fetching sep20')
      return getWalletByNetwork(vm.wallet, 'sbch').getSep20ContractDetails(vm.tokenId).then(response => {
        if (response.success && response.token) {
          vm.asset = {
            id: `sep20/${response.token.address}`,
            symbol: response.token.symbol,
            name: response.token.name,
            decimals: response.token.decimals,
            logo: '',
            balance: 0
          }
          vm.addBtnDisabled = false
        }
      }).finally(() => {
        vm.loading = false
      })
    },
    setAssetDetailsCashtoken() {
      const vm = this
      vm.loading = true
      console.log('fetching ct')
      return vm.$refs.questForm.validate().then(success => {
        getWalletByNetwork(vm.wallet, 'bch').getTokenDetails(vm.tokenId).then(details => {
          if (details !== null) {
            vm.addBtnDisabled = false
            vm.asset = details
          }
        })
      }).finally(() => {
        vm.loading = false
      })
    },
    setAssetDetailsSLP() {
      const vm = this
      vm.loading = true
      console.log('fetching slp')
      return getWalletByNetwork(vm.wallet, 'slp').getSlpTokenDetails(vm.tokenId).then(details => {
        const token = {
          logo: details.image_url,
          id: details.id,
          symbol: details.symbol,
          name: details.name,
          balance: 0
        }
        if (details.symbol.length > 0 && details.token_type === 1) {
          vm.$store.commit('assets/addNewAsset', token)
          vm.$store.dispatch('market/updateAssetPrices', { clearExisting: true })
          vm.$store.dispatch('assets/updateTokenIcon', { assetId: token.id })
          vm.asset = token
        }
      }).finally(() => {
        vm.loading = false
      })
    },
    setAssetDetails () {
      const vm = this
      if (vm.isSep20) return this.setAssetDetailsSep20()
      if (vm.isCashToken) return this.setAssetDetailsCashtoken()
      return this.setAssetDetailsSLP()
    },
    addAsset () {
      if (!this.asset?.id) return console.error('No asset id found. Skipping adding new asset')
      // if (this.asset?.is_nft) return console.error('Asset is nft. Skipping adding new asset')

      if (this.isSep20) {
        this.$store.commit('sep20/addNewAsset', this.asset)
        this.$store.commit(`sep20/moveAssetToBeginning`)
        this.$store.dispatch('market/updateAssetPrices', { clearExisting: true })
        this.$store.dispatch('sep20/updateTokenIcon', { assetId: this.asset.id })
        return
      }

      this.$store.commit(
        'assets/addNewAsset',
        Object.assign({
          id: '',
          name: '',
          logo: '',
          symbol: '',
          decimals: 0,
        }, this.asset, { balance: 0 })
      )
      this.$store.commit(`assets/moveAssetToBeginning`)
    },
    onOKClick () {
      this.addAsset()
      this.$emit('ok', {
        isCashToken: this.isCashToken,
        tokenId: this.tokenId,
        data: this.asset
      })
      this.hide()
    },
    onCancelClick () {
      this.hide()
    },
    hide () {
      this.$refs.dialog.hide()
    },
    onDialogHide () {
      this.$emit('hide')
    }
  }
}
</script>

<style>
.pp-text {
  color: #000 !important;
}
</style>

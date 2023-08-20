<template>
  <q-dialog ref="dialog" @hide="onDialogHide" :persistent="true" seamless>
    <q-card class="q-dialog-plugin br-15 q-pb-sm" :class="{'pt-dark-card-2': darkMode}">
        <q-card-section class="pt-label text-weight-medium" :class="darkMode ? 'pt-dark-label' : 'pp-text'">
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
            <ProgressLoader/>
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
              :class="[darkMode ? 'text-white' : 'pp-text']"
              @click="onCancelClick"
            />
            <template v-if="asset">
              <template v-if="asset.is_nft">
                <q-btn
                  rounded
                  class="text-white"
                  color="blue-9"
                  padding="0.5em 2em 0.5em 2em"
                  :label="$t('View at Collectibles')"
                  @click="$router.push('/apps/collectibles'); hide()"
                />
              </template>
              <template v-else>
                <q-btn
                  rounded
                  class="text-white"
                  color="blue-9"
                  padding="0.5em 2em 0.5em 2em"
                  :label="$t('Add')"
                  type="submit"
                  :disable="addBtnDisabled"
                />
              </template>
            </template>
          </q-card-actions>
        </q-form>
    </q-card>
  </q-dialog>
</template>

<script>
import { getWalletByNetwork } from 'src/wallet/chipnet'
import ProgressLoader from '../../../components/ProgressLoader.vue'

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
    darkMode: Boolean
  },

  data () {
    return {
      tokenId: '',
      addBtnDisabled: true,
      asset: null,
      loading: false,
    }
  },
  watch: {
    tokenId (n, o) {
      this.asset = null
      this.loading = true

      if (n.trim().length !== 64) {
        this.addBtnDisabled = true
        this.loading = false
        return
      }
      this.setAssetDetails()
    }
  },
  computed: {
    isSep20 () {
      return this.network === 'sBCH'
    },
    addTokenTitle () {
      if (this.isSep20)
        return this.$t('Add_SEP20_Token')
      if (this.isCashToken)
        return this.$t('AddFungibleCashToken')
      return this.$t('Add_Type1_Token')
    },
    inputPlaceholder () {
      if (this.isSep20)
        this.$t('Enter_SEP20_ContractAddress')
      if (this.isCashToken)
        return this.$t('EnterCashTokenCategoryID')
      return this.$t('Enter_SLP_TokenId')
    }
  },

  methods: {
    show () {
      this.$refs.dialog.show()
    },
    formatTokenDetailsKey (key) {
      return key.charAt(0).toUpperCase() + key.slice(1)
    },
    setAssetDetails () {
      const vm = this

      if (vm.isCashToken) {
        vm.$refs.questForm.validate().then(success => {
          getWalletByNetwork(vm.wallet, 'bch').getTokenDetails(vm.tokenId).then(details => {
            if (details !== null) {
              vm.addBtnDisabled = false
              vm.asset = details
            }
            vm.loading = false
          })
        })
        return
      }

      getWalletByNetwork(vm.wallet, 'slp').getSlpTokenDetails(vm.tokenId).then(details => {
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
          vm.loading = false
        }
      }).catch(err => vm.loading = false)
    },
    addAsset () {
      this.$store.commit('assets/addNewAsset', {
        ...this.asset,
        balance: 0
      })
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

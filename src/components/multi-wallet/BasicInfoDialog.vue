<template>
  <q-dialog seamless ref="dialog" class="no-click-outside">
    <q-card class="q-pa-md pt-card text-bow" :class="getDarkModeClass(darkMode)">
      <div class="row justify-end">
        <q-btn
          flat
          round
          padding="xs"
          icon="close"
          class="close-button"
          v-close-popup
        />
      </div>
      <p class="q-ma-sm section-title" style="margin-top: 0;">{{ $t('WalletInfo') }}</p>
      <q-list bordered separator class="br-12 pt-card-2" :class="getDarkModeClass(darkMode)">
        <q-item>
          <q-item-section>
            <q-item-label :class="{ 'text-blue-5': darkMode }" caption>{{ $t('WalletName') }}</q-item-label>
            <q-item-label class="pt-label" :class="getDarkModeClass(darkMode)" style="word-wrap: break-word;">
              {{ walletInfo.name }}
            </q-item-label>
          </q-item-section>
        </q-item>
        <q-item>
          <q-item-section>
            <q-item-label :class="{ 'text-blue-5': darkMode }" caption>{{ $t('WalletHash') }}</q-item-label>
            <q-item-label class="pt-label" :class="getDarkModeClass(darkMode)" style="word-wrap: break-word;">
              {{ walletInfo.wallet.bch.walletHash }}
            </q-item-label>
          </q-item-section>
        </q-item>
        <q-item>
          <q-item-section>
            <q-item-label :class="{ 'text-blue-5': darkMode }" caption>{{ $t('WalletBalanceCap') }}</q-item-label>
            <q-item-label class="pt-label" :class="getDarkModeClass(darkMode)" style="word-wrap: break-word;">
              {{ parseAssetDenomination(denomination, getAssetData(), false, 10) }}<br/>
              {{ parseFiatCurrency(getAssetMarketBalance(getAssetData()), selectedMarketCurrency) }}
            </q-item-label>
          </q-item-section>
        </q-item>
      </q-list>
      <!-- <p class="q-ma-sm q-mt-lg section-title">{{ $t('BchAddresses') }}</p> -->
      <!-- <q-list bordered separator class="br-12 pt-card-2" :class="getDarkModeClass(darkMode)">
        <q-item>
          <q-item-section>
            <q-item-label :class="{ 'text-blue-5': darkMode }" caption>{{ $t('DerivationPath') }}</q-item-label>
            <q-item-label class="pt-label" :class="getDarkModeClass(darkMode)">
              {{ walletInfo.wallet.bch.derivationPath }}
            </q-item-label>
          </q-item-section>
        </q-item>
        <q-item>
          <q-item-section>
            <q-item-label :class="{ 'text-blue-5': darkMode }" caption>{{ $t('XpubKey') }}</q-item-label>
            <q-item-label class="pt-label" :class="getDarkModeClass(darkMode)" style="word-wrap: break-word;">
              {{ walletInfo.wallet.bch.xPubKey }}
            </q-item-label>
          </q-item-section>
        </q-item>
        <q-item>
          <q-item-section>
            <q-item-label :class="{ 'text-blue-5': darkMode }" caption>{{ $t('WalletHash') }}</q-item-label>
            <q-item-label class="pt-label" :class="getDarkModeClass(darkMode)" style="word-wrap: break-word;">
              {{ walletInfo.wallet.bch.walletHash }}
            </q-item-label>
          </q-item-section>
        </q-item>
      </q-list> -->
    </q-card>
  </q-dialog>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { parseAssetDenomination, parseFiatCurrency } from 'src/utils/denomination-utils'

export default {
  name: 'BasicInfoDialog',

  props: {
    vaultIndex: Number
  },

  data () {
    return {
      walletInfo: {}
    }
  },

  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    isChipnet() {
      return this.$store.getters['global/isChipnet']
    },
    denomination () {
      return this.$store.getters['global/denomination']
    },
    selectedMarketCurrency () {
      return this.$store.getters['market/selectedCurrency']?.symbol
    }
  },

  methods: {
    getDarkModeClass,
    parseAssetDenomination,
    parseFiatCurrency,
    getAssetData () {
      const index = this.vaultIndex
      return this.isChipnet
        ? this.$store.getters['assets/getVault'][index].chipnet_assets[0]
        : this.$store.getters['assets/getVault'][index].asset[0]
    },
    getAssetMarketBalance (asset) {
      if (!asset?.id) return ''

      const assetPrice = this.$store.getters['market/getAssetPrice'](asset.id, this.selectedMarketCurrency)
      if (!assetPrice) return ''

      return (Number(asset.balance || 0) * Number(assetPrice)).toFixed(2)
    }
  },

  mounted () {
    this.walletInfo = this.$store.getters['global/getVault'][this.vaultIndex]

    document.addEventListener('backbutton', () => {
      this.$refs.dialog.hide()
    })
  }
}
</script>

<style lang="scss" scoped>
  .section-title {
    font-size: 18px;
    color: #ed5f59;
  }
</style>

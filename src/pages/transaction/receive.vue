<template>
  <div id="app-container" class="grad">
    <header-nav :useEmitBack="step > 1" @back="handleBack"></header-nav>
    <div :style="{ 'margin-top': $q.platform.is.ios ? '60px' : '40px'}">
      <q-tabs
        dense    
        v-if="enableSmartBCH"
        indicator-color="white"      
        class="col-12 q-px-lg"
        :modelValue="selectedNetwork"
        @update:modelValue="changeNetwork"
      >
        <q-tab
          name="BCH"
          class="network-selection-tab"         
          :label="networks.BCH.name"
        />
        <q-tab
          name="sBCH"
          class="network-selection-tab"
          :label="networks.sBCH.name"
          :disable="isChipnet"
        />
      </q-tabs>

      <div class="receive-container" >
        <div v-if="step === 1">
          <div class="title-large">Step #1</div>
          <div class="body-large q-pt-md">Select Asset</div>

          <div v-if="assets">      
            <div class="col-3" v-show="selectedNetwork === networks.BCH.name">
              <AssetFilter @filterTokens="isCT => isCashToken = isCT" />
              <div>&nbsp</div>  
            </div>
            <div style="margin-top: 20px;">
                <q-list>
                  <q-item clickable v-ripple v-for="(asset, index) in assets" :key="index" class="asset-button" @click="checkIfFirstTimeReceiver(asset)">
                    <q-item-section avatar>
                      <q-avatar>
                        <img :src="getImageUrl(asset)" width="50" alt="">
                      </q-avatar>
                    </q-item-section>

                    <q-item-section class="text-dark text-left">
                      <q-item-label class="title-medium">{{ asset.name }}</q-item-label>
                      
                      <template v-if="!asset.name.includes('New')">
                        <span v-if="asset.id.startsWith('ct/')">
                          {{ convertTokenAmount(asset.balance, asset.decimals, decimalPlaces=asset.decimals) }} {{ asset.symbol }}
                        </span>
                        <span v-else>
                          {{ parseAssetDenomination(denomination, asset, false, 16) }}
                        </span>
                      </template>
                      {{ asset.name.includes('New') ? asset.symbol : '' }}                      
                    </q-item-section>
                  </q-item>
                </q-list>
            </div>
          </div>
        </div>
        <div v-if="step === 2">
          <div class="title-large">Step #2</div>          

          <receive-address v-if="selectedAsset" :network="selectedNetwork" :assetId="selectedAsset.id"/>
        </div>
      </div>
    </div>    
  </div>
</template>
<script>
import HeaderNav from '../../components/header-nav'
import AssetFilter from '../../components/AssetFilter'
import ReceiveAddress from 'src/components/ui-revamp/transactions/receive-address.vue'
import FirstTimeReceiverWarning from 'src/pages/transaction/dialog/FirstTimeReceiverWarning'

import { convertTokenAmount, getWalletByNetwork } from 'src/wallet/chipnet'
import { parseAssetDenomination } from 'src/utils/denomination-utils'
import { updateAssetBalanceOnLoad } from 'src/utils/asset-utils'
import { cachedLoadWallet } from 'src/wallet'

export default {
  data() {
    return {
      step: 1,
      networks: {
        BCH: { name: 'BCH' },
        sBCH: { name: 'SmartBCH' }
      },
      isCashToken: true,
      wallet: null,
      selectedAsset: null
    }
  },
  components: {
    HeaderNav,
    AssetFilter,
    ReceiveAddress
  },
  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    denomination () {
      return this.$store.getters['global/denomination']
    },
    enableSmartBCH () {
      return this.$store.getters['global/enableSmartBCH']
    },
    isChipnet () {
      return this.$store.getters['global/isChipnet']
    },
    selectedNetwork: {
      get () {
        return this.$store.getters['global/network']
      },
      set (value) {        
        return this.$store.commit('global/setNetwork', value)
      }
    },
    assets () {
      let _assets
      const themedIconPath = ''
      const themedNewTokenIcon = `${themedIconPath}new-token.png`

      if (this.selectedNetwork === 'sBCH') {
        _assets = this.$store.getters['sep20/getAssets'].filter(Boolean)
        _assets = _assets.map((item) => {
          if (item?.id === 'bch') {
            item.name = 'Smart Bitcoin Cash'
            item.symbol = 'sBCH'
            item.logo = 'sep20-logo.png'
          }
          return item
        })
        const unlistedAsset = {
          id: 'sep20/unlisted',
          name: this.$t('NewUnlisted'),
          symbol: 'SEP20 token',
          logo: themedNewTokenIcon
        }
        _assets.push(unlistedAsset)
        return _assets
      }

      const vm = this
      _assets = this.$store.getters['assets/getAssets'].filter(function (item) {
        if (item) {
          const isBch = item?.id === 'bch'
          const tokenType = item.id?.split?.('/')?.[0]

          if (vm.isCashToken) 
            return tokenType === 'ct' || isBch
          return tokenType === 'slp' || isBch
        }
      })
      let unlistedAsset = {
        id: 'slp/unlisted',
        name: this.$t('NewUnlisted'),
        symbol: 'SLP token',
        logo: themedNewTokenIcon
      }
      if (vm.isCashToken) {
        unlistedAsset = {
          id: 'ct/unlisted',
          name: this.$t('NewUnlisted'),
          symbol: 'CashToken',
          logo: themedNewTokenIcon
        } 
      }
      _assets.push(unlistedAsset)
      return _assets
    }
  },
  async mounted () {
    const vm = this
    vm.$store.dispatch('market/updateAssetPrices', {})
    const bchAssets = vm.$store.getters['assets/getAssets']

    // update balance of assets
    const wallet = await cachedLoadWallet('BCH', vm.$store.getters['global/getWalletIndex'])
    vm.wallet = wallet // Initialize the wallet property
    
    for (var i = 0; i < bchAssets.length; i = i + 3) {
      const balanceUpdatePromises = bchAssets.slice(i, i + 3).map(asset => {
        return updateAssetBalanceOnLoad(asset.id, wallet, vm.$store)
      })
      const assetMetadataUpdatePromises = bchAssets.slice(i, i + 3).map(asset => {
        return vm.$store.dispatch('assets/getAssetMetadata', asset.id)
      })
      await Promise.allSettled([...balanceUpdatePromises, ...assetMetadataUpdatePromises])
    }
  },
  methods: {
    parseAssetDenomination,
    convertTokenAmount,
    changeNetwork (newNetwork = 'BCH') {
      console.log('value: ', newNetwork)
      this.selectedNetwork = newNetwork
    },
    handleBack() {
      console.log('handling back btn')
      this.step--
    },
    getWallet (type) {
      return this.$store.getters['global/getWallet'](type)
    },
    getImageUrl (asset) {
      if (this.denomination === this.$t('DEEM') && asset.symbol === 'BCH') {
        return 'assets/img/theme/payhero/deem-logo.png'
      } else {
        if (asset.logo) {
          if (asset.logo.startsWith('https://ipfs.paytaca.com/ipfs')) {
            return asset.logo + '?pinataGatewayToken=' + process.env.PINATA_GATEWAY_TOKEN
          } else {
            return asset.logo
          }
        } else {
          return this.getFallbackAssetLogo(asset)
        }
      }
    },
    async checkIfFirstTimeReceiver (asset) {
      console.log('entering func')
      // check wallet/assets if balance is zero and no transactions were made
      const displayFirstTimeReceiverWarning = await this.isFirstTimeReceiver(asset)
      this.selectedAsset = asset
      if (displayFirstTimeReceiverWarning) {
        this.$q.dialog({ component: FirstTimeReceiverWarning })
          .onOk(() => {
            // this.$router.push({
            //   name: 'transaction-receive',
            //   query: { assetId: asset.id, network: this.selectedNetwork }
            // })
            this.step++
          })
      } else {
        // this.$router.push({
        //   name: 'transaction-receive',
        //   query: { assetId: asset.id, network: this.selectedNetwork }
        // })
        this.step++
      }
      console.log('asset: ', this.selectedAsset.id)
    },
    async isFirstTimeReceiver(asset) {
      if ((asset?.balance ?? 0) !== 0) return false
      if ((asset?.txCount ?? 0) !== 0) return false
      if (asset.id.split('/')[1] === 'unlisted') return false

      const transactionsLength = this.selectedNetwork === 'sBCH'
        ? await this.getSbchTransactions(asset)
        : await this.getBchTransactions(asset)

      if (this.selectedNetwork !== 'sBCH') {
        this.$store.commit('assets/updateAssetTxCount', {
          id: asset?.id,
          txCount: transactionsLength,
        })
      }

      return transactionsLength === 0
    },
    async getBchTransactions (asset) {
      const vm = this
      const id = asset.id
      let historyLength = -1
      let requestPromise

      if (id.indexOf('slp/') > -1) {
        const tokenId = id.split('/')[1]
        requestPromise = getWalletByNetwork(vm.wallet, 'slp').getTransactions(tokenId, 1, 'all')
      } else if (id.indexOf('ct/') > -1) {
        const tokenId = id.split('/')[1]
        requestPromise = getWalletByNetwork(vm.wallet, 'bch').getTransactions(1, 'all', tokenId)
      } else {
        requestPromise = getWalletByNetwork(vm.wallet, 'bch').getTransactions(1, 'all')
      }

      if (!requestPromise) return
      await requestPromise.then((response) => {
        historyLength = response?.history.length ?? 0
      })

      return historyLength
    },
    async getSbchTransactions (asset) {
      const vm = this
      const address = vm.$store.getters['global/getAddress']('sbch')
      const id = asset.id
      const sep20IdRegexp = /sep20\/(.*)/
      let historyLength = -1

      const filterOpts = { limit: 10, includeTimestamp: true, type: 'incoming' }
      let requestPromise = null

      if (sep20IdRegexp.test(id)) {
        const contractAddress = vm.selectedAsset.id.match(sep20IdRegexp)[1]
        requestPromise = vm.wallet.sBCH._watchtowerApi.getSep20Transactions(
          contractAddress,
          address,
          filterOpts
        )
      } else {
        requestPromise = vm.wallet.sBCH._watchtowerApi.getTransactions(
          address,
          filterOpts
        )
      }

      if (!requestPromise) return
      await requestPromise.then(response => {
        historyLength = response?.transactions.length ?? 0
      })
      return historyLength
    }
  }
}
</script>
<style lang="scss" scoped>
.receive-container {
  text-align: center;
  margin-top: 50px;
}  
.pt-label {
  font-size: 16px;
  font-weight: 300;
}
.asset-button {
  background-color: #fff;
  margin: 10px 20px 10px;
  padding: 15px;
  border: 2px solid #4174d9; 
  border-radius: 10px;
}
</style>
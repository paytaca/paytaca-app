<template>
  <q-pull-to-refresh
    id="app-container"
    :class="getDarkModeClass(darkMode)"
    @refresh="refreshPage"
  >
    <HeaderNav
      :backnavpath="`/apps/multisig/wallet/${route?.params?.wallethash}`"
      class="apps-header"
    />
    <div class="row justify-center">
      <div class="col-xs-12 col-sm-8 q-px-xs">
        <template v-if="wallet">
            <div class="row q-gutter-y-lg">
              <div class="col-xs-12 flex items-center justify-center q-gutter-x-sm">
                <q-avatar v-if="assetHeaderIcon?.startsWith('http')" size="md">
                  <img :src="assetHeaderIcon">
                </q-avatar>
                <q-icon v-else
                  :name="assetHeaderIcon"
                   size="md"
                  :color="assetHeaderIcon === 'token'? 'grey': '' "
                />
                <div class="text-bold" style="font-size: larger;">{{ assetHeaderName }}</div>
              </div>
              <div class="col-xs-12 text-center">
                <div class="text-grey-6">Balance</div>
                <div class="items-center justify-center q-gutter-x-sm">
                  <span style="font-size: 2em">{{ balance !== undefined ? balance : "..." }}</span>
                  
                  <div class="text-grey-6">{{ assetPrice? `=${assetPrice}` : '' }}</div>
                </div>
              </div>
              <div class="col-xs-12 flex justify-evenly">
                <q-btn flat dense no-caps @click="showWalletReceiveDialog" class="tile" v-close-popup>
                  <template v-slot:default>
                    <div class="row justify-center">
                      <q-icon name="send_and_archive" class="col-12" color="primary"></q-icon>
                      <div class="col-12 tile-label">Deposit</div>
                    </div>
                  </template>
                </q-btn>
                <q-btn flat dense no-caps :to="{ name: 'app-multisig-wallet-transaction-send', params: { wallethash: wallet.getWalletHash() }, query: route.query }" class="tile" v-close-popup>
                  <template v-slot:default>
                    <div class="row justify-center">
                      <q-icon name="send" class="col-12" color="primary" style="position:relative">
                        <q-badge color="red" v-if="transactions?.length > 0" style="margin-right: 20px;" floating>
                        {{ transactions?.length }}
                        </q-badge>
                      </q-icon>
                      <div class="col-12 tile-label">Send</div>
                    </div>
                  </template>
                </q-btn>
              </div>
            </div>
            <q-list>
              <q-separator spaced inset />
              <q-item v-if="wallet">
                <q-item-section>
                  <q-item-label>
                    <div class="flex items-center">
                      <q-icon name="wallet"></q-icon><span class="q-ml-xs">{{ wallet?.name }}</span>
                    </div>
                  </q-item-label>
                </q-item-section>
                <q-item-section side>
                 <q-item-label class="flex flex-wrap items-center">
                   <span>{{ shortenString(`${wallet.getWalletHash()}`, 20)}}</span>
                 </q-item-label>
                </q-item-section>
              </q-item>
              <q-separator spaced inset />
              <q-expansion-item v-model="historyExpanded">
                <template v-slot:header>
                  <q-item-section>
                    Transaction History
                  </q-item-section>
                </template>
                <q-item>
                  <q-item-section>
                    <div class="flex">
                      <div>
                        <code style="word-break: break-all; filter: brightness(80%)">
                          No Data
                        </code>
                      </div>
                    </div>
                  </q-item-section>
                </q-item>
              </q-expansion-item>
            </q-list>
        </template>
      </div>
    </div>
  </q-pull-to-refresh>
</template>

<script setup>

import { useStore } from 'vuex'
import { useI18n } from 'vue-i18n'
import { axios } from 'axios'
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import HeaderNav from 'components/header-nav'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import {
  shortenString,
  isMultisigWalletSynced,
  MultisigWallet
} from 'src/lib/multisig'
import WalletReceiveDialog from 'components/multisig/WalletReceiveDialog.vue'
import { CashAddressNetworkPrefix, walletTemplateP2pkh } from 'bitauth-libauth-v3'
import { WatchtowerNetwork, WatchtowerNetworkProvider } from 'src/lib/multisig/network'
import { useMultisigHelpers } from 'src/composables/multisig/helpers'

const $store = useStore()
const $q = useQuasar()
const { t: $t } = useI18n()
const route = useRoute()
const router = useRouter()
const balance = ref()
const balanceConvertionRates = ref()
const historyExpanded = ref(true)
const assetTokenIdentity = ref()

const {
  getAssetTokenIdentity 
} = useMultisigHelpers()

const darkMode = computed(() => {
  return $store.getters['darkmode/getStatus']
})


const wallet = computed(() => {
  const savedWallet = $store.getters['multisig/getWalletByHash'](route.params.wallethash)
  if (savedWallet) {
    return MultisigWallet.importFromObject(savedWallet, {
      provider: new WatchtowerNetworkProvider({
        network: $store.getters['global/isChipnet'] ? WatchtowerNetwork.chipnet: WatchtowerNetwork.mainnet 
      })
    })
  }
  return null
})

const assetHeaderName = computed(() => {
  if (route.query.asset === 'bch') return 'BCH'
  if (assetTokenIdentity.value?.token?.symbol) return assetTokenIdentity.value?.token?.symbol
  return shortenString(route.query.asset, 10)
})

const assetHeaderIcon = computed(() => {
  if (route.query.asset === 'bch') return 'img:bitcoin-cash-circle.svg'
  return assetTokenIdentity.value?.uris?.icon || 'token'
})

const assetPrice = computed(() => {
  if (balanceConvertionRates.value?.length > 0) {
    const b = balanceConvertionRates.value?.find(priceData => (
       priceData.relative_currency?.toLowerCase() === route.query.asset
    ))
    return b?.[`assetPriceIn${b?.currency}Text`] || ''
  }
})

const showWalletReceiveDialog = () => {
  const addressPrefix = $store.getters['global/isChipnet'] ? CashAddressNetworkPrefix.testnet : CashAddressNetworkPrefix.mainnet
  $q.dialog({
    component: WalletReceiveDialog,
    componentProps: {
      darkMode: darkMode.value,
      multisigWallet: wallet.value,
      cashAddressNetworkPrefix: addressPrefix
    }
  }).onOk(() => {
    openWalletActionsDialog()
  })
}

onMounted(async () => {
  console.log('test')
  try {
    balance.value = await wallet.value.getWalletBalance(route.query.asset)
    console.log('balance.value', balance.value)

    if (route.query.asset !== 'bch') {
      assetTokenIdentity.value = await getAssetTokenIdentity(route.query.asset)
    }
    
    balanceConvertionRates.value = 
      await wallet.value.convertBalanceToCurrencies(
        route.query.asset,
        balance.value,
        [$store.getters['market/selectedCurrency'].symbol]
      )

    console.log(balanceConvertionRates.value)
  } catch (error) {}
})
</script>

<style scoped>
.light {
  color: #141414;
}
</style>i

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
                  <img v-if="!assetHeaderIconError" :src="assetHeaderIcon" @error="() => assetHeaderIconError = true">
                  <q-icon v-if="assetHeaderIconError" name="token" size="md"></q-icon>
                </q-avatar>
                <q-icon v-else
                  :name="assetHeaderIcon"
                   size="md"
                  :color="assetHeaderIcon === 'token'? 'grey': '' "
                />
                <div class="text-bold" style="font-size: larger;">{{ assetHeaderName }}</div>                
              </div>
              <div class="col-xs-12 text-center">
                <div class="text-grey-6">{{ $t('Balance') }}</div>
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
                      <div class="col-12 tile-label">{{ $t('Deposit') }}</div>
                    </div>
                  </template>
                </q-btn>
                <q-btn flat dense no-caps @click="send" class="tile" v-close-popup>
                  <template v-slot:default>
                    <div class="row justify-center">
                      <q-icon name="send" class="col-12" color="primary" style="position:relative">
                        <q-badge color="red" v-if="transactions?.length > 0" style="margin-right: 20px;" floating>
                        {{ transactions?.length }}
                        </q-badge>
                      </q-icon>
                      <div class="col-12 tile-label">{{ $t('Send') }}</div>
                    </div>
                  </template>
                  
                </q-btn>
              </div>
            </div>
            <q-list>
              <q-separator spaced inset />
              <q-item>
                <q-item-section>
                  <q-item-label>
                    <div class="flex items-center">
                      <q-icon name="wallet"></q-icon><span class="q-ml-xs">
                        <span v-if="route.query.asset === 'bch'">
                          {{ $t('AssetId') }}
                        </span>
                        <span v-else>
                          {{ $t('TokenId') }}
                        </span>
                      </span>
                    </div>
                  </q-item-label>
                </q-item-section>
                <q-item-section side>
                 <q-item-label class="flex flex-wrap items-center">
                   <span v-if="route.query.asset === 'bch'">
                    BCH
                  </span>
                   <span v-else>
                    {{ shortenString(route.query.asset, 20)}}<CopyButton :text="route.query.asset"/>
                   </span>
                 </q-item-label>
                </q-item-section>
              </q-item>
              <q-item v-if="wallet">
                <q-item-section>
                  <q-item-label>
                    <div class="flex items-center">
                      <q-icon name="wallet"></q-icon><span class="q-ml-xs">{{ $t('Wallet') }}</span>
                    </div>
                  </q-item-label>
                </q-item-section>
                <q-item-section side>
                 <q-item-label class="flex flex-wrap items-center">
                   <span>{{ wallet.name || shortenString(`${wallet.id || ''}`, 20)}}</span>
                 </q-item-label>
                </q-item-section>
              </q-item>
              <q-separator spaced inset />
            </q-list>
            <TransactionListItemSkeleton v-if="historyLoading"/>
            <div v-else class="row q-pt-md q-px-sm" :class="darkMode ? 'text-light' : 'text-dark'">
              <div class="q-mb-md">{{ $t('TransactionHistory') }}</div>
              <div v-if="history?.history?.length === 0" class="col-12">
                <code style="word-break: break-all; filter: brightness(80%)">
                  {{ $t('NoData') }}
                </code>
              </div>
              <template v-else>
                <div class="col-12 row br-15 pt-card" :class="getDarkModeClass(darkMode)"
                  :style="`background-color: ${darkMode ? '' : '#dce9e9 !important;'}`" >
                    <!-- <button
                      v-for="(transactionFilterOpt, index) in transactionsFilterOpts" :key="index"
                      class="btn-custom q-mt-none"
                      :class="[
                        darkMode ? 'text-light' : 'text-dark', 
                        `btn-${transactionFilterOpt.value}`,
                        {'active-transaction-btn border': transactionsFilter == transactionFilterOpt?.value },
                      ]"
                      @click="setTransactionsFilter(transactionFilterOpt.value)"
                    >
                      {{ transactionFilterOpt?.label }}
                    </button> -->
                    
                    <q-btn 
                      class="btn-custom q-mt-none col-4"
                      :class="[
                        darkMode ? 'text-light' : 'text-dark', 
                        `btn-outcome`,
                        {'active-transaction-btn border': historyFilter === 'all' },
                      ]"
                      :flat="historyFilter !== 'all'"
                      :rounded="historyFilter === 'all'"
                      @click="historyFilter = 'all'"
                    >All</q-btn>
                    <q-btn class="btn-custom q-mt-none col-4" 
                    :class="[
                      darkMode ? 'text-light' : 'text-dark', 
                      `btn-outcome`,
                      {'active-transaction-btn border': historyFilter === 'sent' },
                    ]"
                    :flat="historyFilter !== 'sent'" 
                    :rounded="historyFilter === 'sent'"
                    @click="historyFilter = 'sent'"
                    >Sent</q-btn>
                    <q-btn class="btn-custom q-mt-none col-4" 
                    :class="[
                      darkMode ? 'text-light' : 'text-dark', 
                      `btn-outcome`,
                      {'active-transaction-btn border': historyFilter === 'received' },
                    ]"
                    :flat="historyFilter !== 'received'" 
                    :rounded="historyFilter === 'received'"
                    @click="historyFilter = 'received'">Received</q-btn>
                  </div>		      
                  <div class="col-12">
                    <q-list>
                      <template v-for="t in historyFiltered">
                        <q-item class="q-my-sm">
                          <q-item-section>
                            <span class="type-text text-uppercase text-bold text-strong" :class="getDarkModeClass(darkMode)">
                              {{ historyRecordTypeMap[t.record_type]}}
                            </span>
                            <span class="transaction-date" :class="getDarkModeClass(darkMode)">
                              <template v-if="t.tx_timestamp">{{ ago(new Date(t.tx_timestamp)) }}</template>
                              <template v-else-if="t.date_created">{{ ago(new Date(t.date_created)) }}</template>
                              <template v-else>{{ t.tx_timestamp }}</template>
                            </span>
                          </q-item-section>
                          <q-item-section side>
                            <span class=" text-uppercase text-bold" :class="getDarkModeClass(darkMode)">
                              <template v-if="t.amount">
                                {{ t.amount }} {{ assetHeaderName }}
                              </template>
                            </span>
                            <span :class="getDarkModeClass(darkMode)" class="amount-secondary">
                              <template v-if="t.amount && t.market_prices && assetHeaderName === 'BCH'">
                                {{ historyQoutePrice(t.amount, t.market_prices) }}
                              </template>
                            </span>
                          </q-item-section>
                        </q-item>
                        <q-separator class="q-mx-sm"/>
                      </template>
                    </q-list>
                  </div>
              </template>
            </div>
        </template>
      </div>
    </div>
  </q-pull-to-refresh>
</template>

<script setup>

import { useStore } from 'vuex'
import { useI18n } from 'vue-i18n'
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import ago from 's-ago'
import { CashAddressNetworkPrefix } from 'bitauth-libauth-v3'
import HeaderNav from 'components/header-nav'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import {
  shortenString,
  MultisigWallet
} from 'src/lib/multisig'
import WalletReceiveDialog from 'components/multisig/WalletReceiveDialog.vue'
import TransactionListItemSkeleton from 'components/transactions/TransactionListItemSkeleton.vue'
import CopyButton from 'components/CopyButton.vue'
import { WatchtowerNetwork, WatchtowerNetworkProvider } from 'src/lib/multisig/network'
import { useMultisigHelpers } from 'src/composables/multisig/helpers'

const $store = useStore()
const $q = useQuasar()
const { t: $t } = useI18n()
const route = useRoute()
const router = useRouter()
const balance = ref()
const balanceConvertionRates = ref()
const assetTokenIdentity = ref()
const assetHeaderIconError = ref(false)
const history = ref()
const historyFilter = ref('all')
const historyFiltered = computed(() => {
  return history.value?.history?.filter(h => {
    if (historyFilter.value === 'sent') {
      return h.record_type === 'outgoing'
    }
    if (historyFilter.value === 'received') {
      return h.record_type === 'incoming'
    }
    return true
  })
})
const historyQoutePrice = computed(() => {
  return (amount, marketPrices) => {
    const currency = $store.getters['market/selectedCurrency']?.symbol || 'USD'
    if (!amount || !marketPrices) return ''
    return `${amount * marketPrices[currency]} ${currency}`  
  }
})
const historyLoading = ref(false)

const historyRecordTypeMap = {
  'incoming': $t('Received'),
  'outgoing': $t('Sent'),
  'all': $t('All')
} 

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
      store: $store,
      provider: new WatchtowerNetworkProvider({
        network: $store.getters['global/isChipnet'] ? WatchtowerNetwork.chipnet: WatchtowerNetwork.mainnet 
      })
    })
  }
  return null
})

const psbts = computed(() => {
  return $store.getters['multisig/getPsbtsByWalletHash'](route.params.wallethash)
})

const assetHeaderName = computed(() => {
  if (route.query.asset === 'bch') return 'BCH'
  if (assetTokenIdentity.value?.token?.symbol) return assetTokenIdentity.value?.token?.symbol
  return shortenString(route.query.asset, 10)
})

const assetHeaderIcon = computed(() => {
  if (route.query.asset === 'bch') return 'img:bitcoin-cash-circle.svg'
  if (assetTokenIdentity.value?.uris?.icon?.includes('nftstorage.link') || assetTokenIdentity.value?.uris?.icon?.startsWith('ipfs://')) {
    return `https://cashtokens.studio/api/ipfs-image?url=${encodeURIComponent(assetTokenIdentity.value?.uris?.icon)}`
  }
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

const send = () => {
  if (psbts && psbts.value?.length > 0) {
    $q.dialog({
      title: $t('NotAllowed'),
      message: $t('TransactionProposalPending', { count: psbts.value?.length }, `You have ${psbts.value?.length} transaction proposal pending. This feature doesn't support creating of tx proposal while there's atleast 1 pending! This will change in the future.`),
      class: `pt-card br-15 text-bow ${getDarkModeClass(darkMode.value)}`,
      ok: {
        rounded: true,
        color: 'primary',
        noCaps: true,
        class: 'text-caption',
        padding: 'xs md',
        label: $t('OK')
      },
      cancel: false
    })
    return
  }
  router.push({ name: 'app-multisig-wallet-transaction-send', params: { wallethash: wallet.value.getWalletHash() }, query: route.query })
  
}

const showWalletReceiveDialog = () => {
  const addressPrefix = $store.getters['global/isChipnet'] ? CashAddressNetworkPrefix.testnet : CashAddressNetworkPrefix.mainnet
  $q.dialog({
    component: WalletReceiveDialog,
    componentProps: {
      darkMode: darkMode.value,
      multisigWallet: wallet.value,
      cashAddressNetworkPrefix: addressPrefix
    }
  })
}

const loadTransactionHistory = async (tokenCategory) => {
  try {
    historyLoading.value = true
    const response = await wallet.value.getWalletTransactionHistory({ 
      walletHash: wallet.value.getWalletHash(), 
      all: false,
      tokenCategory
    })

    history.value = response?.data  
    
  } catch (error) {
    $q.notify({
      message: $t('ErrorLoadingHistory'),
      color: 'negative'
    })
  } finally {
    historyLoading.value = false
  }
}

const loadWalletBalance = async () => {
  try {
    balance.value = await wallet.value.getWalletBalance(route.query.asset)
    if (route.query.asset !== 'bch') {
      assetTokenIdentity.value = await getAssetTokenIdentity(route.query.asset)
    }
    
    balanceConvertionRates.value = 
      await wallet.value.convertBalanceToCurrencies(
        route.query.asset,
        balance.value,
        [$store.getters['market/selectedCurrency'].symbol]
      )
  } catch (error) {
    $q.notify({
      message: error?.message,
      color: 'negative'
    })
  }
}

onMounted(async () => {
  const tokenCategory = route.query.asset !== 'bch'? route.query.asset : '' 
  await Promise.allSettled([loadWalletBalance(), loadTransactionHistory(tokenCategory)])
})
</script>

<style scoped>
.light {
  color: #141414;
}
</style>i

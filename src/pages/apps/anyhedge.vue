<template>
  <div
    style="background-color: #ECF3F3; min-height: 100vh;padding-top:100px;padding-bottom:50px;"
    :class="{'pt-dark': darkMode}"
  >
    <HeaderNav
      title="AnyHedge"
      backnavpath="/apps"
      style="position: fixed; top: 0; background: #ECF3F3; width: 100%; z-index: 100 !important;"
    />

    <q-tabs
      active-color="brandblue"
      class="col-12 q-px-sm q-pb-md pp-fcolor q-mx-md"
      v-model="selectedAccountType"
      style="padding-bottom: 16px;"
      :style="{ 'margin-top': this.$q.platform.is.ios ? '0px' : '-35px'}"
    >
      <q-tab name="hedge" :class="{'text-blue-5': darkMode}" label="Hedge"/>
      <q-tab name="long" :class="{'text-blue-5': darkMode}" label="Long" />
    </q-tabs>

    <q-card
      class="br-15 q-mx-md q-mb-md"
      :class="[
       darkMode ? 'text-white pt-dark-card' : 'text-black',
      ]"
      style="transition: height 0.5s"
    >
      <template v-if="selectedAccountType === 'hedge'">
        <q-card-section class="text-h5">
          <div>
          <div class="text-caption text-grey">Total hedge value</div>
            <div class="row items-center">
              <div class="q-space">
                <q-skeleton v-if="fetchingContracts" class="q-mr-sm"/>
                <template v-else>
                  <div v-if="hedgeSummaries.length === 0" class="text-grey-7 text-body1">
                    No ongoing contract
                  </div>
                  <div v-for="(summary, index) in hedgeSummaries" :key="index" class="row items-center q-gutter-x-xs q-ml-xs">
                    {{ formatUnits(summary.totalHedgeUnits, summary?.oracle?.assetDecimals || 0) }}
                    <template v-if="summary?.oracle?.assetCurrency">
                      {{ summary?.oracle?.assetCurrency }}
                    </template>
                    <template v-else>
                      Asset {{ ellipsisText(summary.oraclePubkey, {start: 5, end: 0}) }}
                      <q-icon
                        :color="darkMode ? 'grey-7' : 'black'"
                        size="sm"
                        name="help"
                      >
                        <q-popup-proxy :breakpoint="0">
                          <div :class="['q-px-md q-py-sm', darkMode ? 'pt-dark-label pt-dark' : 'text-black']" class="text-caption" style="word-break:break-all;">
                            <div class="text-subtitle1">Unknown asset</div>
                            Oracle pubkey: {{ summary.oraclePubkey }}
                          </div>
                        </q-popup-proxy>
                      </q-icon>
                    </template>
                  </div>
                </template>
              </div>
              <q-btn
                v-if="!showCreateHedgeForm"
                icon="add"
                padding="xs"
                round
                :color="darkMode ? 'grad' : 'brandblue'"
                @click="showCreateHedgeForm = !showCreateHedgeForm"
              />
            </div>
          </div>
        </q-card-section>

        <q-slide-transition>
          <q-card-section v-if="showCreateHedgeForm" style="border-top: 1px solid gray">
            <CreateHedgeForm
              :wallet="wallet"
              @created="emitData => onHedgeFormCreate(emitData)"
              @cancel="() => showCreateHedgeForm = false"
            />
          </q-card-section>
        </q-slide-transition>
      </template>
      <template v-else-if="selectedAccountType === 'long'">
        <q-card-section class="text-h5">
          <div>
            <div class="text-caption text-grey">Total Long Positions</div>
            <div class="row items-center">
              <div class="q-space">
                <q-skeleton v-if="fetchingLongPositions" class="q-mr-sm"/>
                <span v-else>{{ totalLongSats / 10 ** 8 }} BCH</span>
              </div>
            </div>
          </div>
          <q-separator :color="darkMode ? 'white' : 'grey'" spaced/>
          <div>
            <div class="text-caption text-grey">Liquidity Allowance</div>
            <div class="row items-center">
              <div class="q-space">
                <q-skeleton v-if="fetchingLongAccount" class="q-mr-sm"/>
                <div v-else class="row items-center">
                  {{ (longAccount?.auto_accept_allowance | 0) / 10 ** 8 }} BCH
                </div>
              </div>
              <q-btn
                v-if="!showAddLiquidityForm"
                icon="add"
                padding="xs"
                round
                :color="darkMode ? 'grad' : 'brandblue'"
                @click="showAddLiquidityForm = true"
              />
            </div>
          </div>
        </q-card-section>
        <q-slide-transition>
          <q-card-section v-if="showAddLiquidityForm" style="border-top: 1px solid gray">
            <AddLiquidityForm
              :wallet="wallet"
              :long-account="longAccount"
              @cancel="showAddLiquidityForm = false"
              @new-long-account="updateLongAccount"
              @update-long-account="updateLongAccount"
            />
          </q-card-section>
        </q-slide-transition>
      </template>
    </q-card>

    <q-card
      class="br-15 q-mx-md q-mb-md"
      :class="[
        darkMode ? 'text-white pt-dark-card' : 'text-black',
      ]"
    >
      <template v-if="selectedAccountType === 'hedge'">
        <q-expansion-item label="Hedge Offers">
          <q-card-section v-if="fetchingHedgeOffers" class="q-gutter-y-md">
            <q-skeleton v-for="i in 3" type="rect"/>
          </q-card-section>
          <HedgeOffersList v-else :hedge-offers="hedgeOffers"/>
          <div class="row justify-center">
            <LimitOffsetPagination
              :pagination-props="{
                unelevated: true,
                padding: 'sm md',
                boundaryNumbers: true
              }"
              class="q-mb-md"
              :hide-below-pages="2"
              :modelValue="hedgeOffersPaginationState"
              @update:modelValue="fetchHedgeOffers"
            />
          </div>
        </q-expansion-item>
        <q-separator/>
        <q-expansion-item ref="hedgesDrawerRef" label="Hedge Positions">
          <q-card-section v-if="fetchingContracts" class="q-gutter-y-md">
            <q-skeleton v-for="i in 3" type="rect"/>
          </q-card-section>
          <HedgeContractsList v-else ref="hedgesListRef" :contracts="contracts" view-as="hedge" :wallet="wallet"/>
          <div class="row justify-center">
            <LimitOffsetPagination
              :pagination-props="{
                unelevated: true,
                padding: 'sm md',
                boundaryNumbers: true
              }"
              class="q-mb-md"
              :hide-below-pages="2"
              :modelValue="contractsPaginationState"
              @update:modelValue="fetchHedgeContracts"
            />
          </div>
        </q-expansion-item>
      </template>
      <template v-else-if="selectedAccountType === 'long'">
        <q-expansion-item label="Long Positions">
          <q-card-section v-if="fetchingLongPositions" class="q-gutter-y-md">
            <q-skeleton v-for="i in 3" type="rect"/>
          </q-card-section>
          <HedgeContractsList v-else :contracts="longPositions" view-as="long" :wallet="wallet"/>
          <div class="row justify-center">
            <LimitOffsetPagination
              :pagination-props="{
                unelevated: true,
                padding: 'sm md',
                boundaryNumbers: true
              }"
              class="q-mb-md"
              :hide-below-pages="2"
              :modelValue="longPositionsPaginationState"
              @update:modelValue="fetchLongPositions"
            />
          </div>
        </q-expansion-item>
      </template>
    </q-card>
  </div>
</template>
<script setup>
import { getMnemonic, Wallet } from '../../wallet'
import { anyhedgeBackend, connectWebsocketUpdates, generalProtocolLPBackend } from '../../wallet/anyhedge/backend'
import { formatUnits, ellipsisText, parseHedgePositionData } from '../../wallet/anyhedge/formatters'
import { ref, computed, markRaw, onMounted, inject, onUnmounted, watch } from 'vue'
import { useStore } from 'vuex'
import { useQuasar, scroll } from 'quasar'
import HeaderNav from '../../components/header-nav'
import LimitOffsetPagination from 'src/components/LimitOffsetPagination.vue'
import AddLiquidityForm from 'src/components/anyhedge/AddLiquidityForm.vue'
import CreateHedgeForm from 'src/components/anyhedge/CreateHedgeForm.vue'
import HedgeContractsList from 'src/components/anyhedge/HedgeContractsList.vue'
import HedgeOffersList from 'src/components/anyhedge/HedgeOffersList.vue'

const { getScrollTarget, setVerticalScrollPosition } = scroll

// misc
const DEFAULT_PAGE_SIZE = 10
const $copyText = inject('$copyText')
const $q = useQuasar()
const $store = useStore()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])
const selectedAccountType = ref('hedge')

const hedgesDrawerRef = ref()
const hedgesListRef = ref()

const wallet = ref(null)
onMounted(async () => {
  const mnemonic = await getMnemonic()
  wallet.value = markRaw(new Wallet(mnemonic))

  fetchSummary('hedge')
  fetchSummary('long')
  fetchHedgeOffers()
  fetchHedgeContracts()
  fetchLongAccounts()
  fetchLongPositions()
  initWebsocket()
})

const socket = ref(null)
const socketReconnection = ref({
  enable: true,
  attempts: 0,
  max: 10,
  interval: 15 * 1000,
})
const websocketMessageHandler = (message) => {
  const data = JSON.parse(message.data)
  console.log(data)
  if (data?.resource === 'long_account') fetchLongAccounts()
  if (data?.resource === 'hedge_position_offer') {
    if (data?.action === 'settlement') {
      if (data?.meta?.position === 'hedge') {
        fetchSummary('hedge')
        fetchHedgeOffers()
        fetchHedgeContracts()
      } else if (data?.meta?.position === 'long') {
        fetchSummary('long')
        fetchLongPositions()
      }
    }
  }
  if (data?.resource === 'hedge_position') {
    if (data?.action === 'funding_proposal') {
      fetchSummary('hedge')
      fetchSummary('long')
      refetchContract(data?.meta?.address)
    }
  }
}
function initWebsocket(fromReconAttempt=false) {
  if (socketReconnection.value.attempts >= socketReconnection.value.max && fromReconAttempt) {
    console.log('Reached max attempts for websocket reconnection')
    return
  }

  let _socket
  console.log('Attempting websocket connection')
  try {
    _socket = connectWebsocketUpdates(wallet.value.BCH.getWalletHash())
    _socket.onmessage = websocketMessageHandler
    _socket.onclose = () => {
      if (socketReconnection.value.enable) {
        console.log('Websocket closed, reconnecting in', socketReconnection.value.interval, 'ms')
        setTimeout(() => initWebsocket(true), socketReconnection.value.interval)
      }
    }
    socket.value?.close?.()
  } catch(err) {
    console.error('Error in connecting websocket:', err)
    if (socketReconnection.value.enable) {
      socketReconnection.value.attempts++
      console.log('Attempting websocket reconnection in', socketReconnection.value.interval, 'ms')
      setTimeout(() => initWebsocket(true), socketReconnection.value.interval)
    }
  }

  console.log('Websocket connected')
  socket.value = _socket
  socketReconnection.value.attempts = 0
}
onUnmounted(() => {
  console.log('Closing websocket')
  socketReconnection.value.enable = false
  socket.value?.close?.()
})


// summary
function parseAssetSummaries(assetSummaries) {
  const data = []
  if (Array.isArray(assetSummaries)) {
    const oracles = $store.getters['anyhedge/oracles']
    const defaultOracleInfo = { assetName: '', assetCurrency: '', assetDecimals: 0 }
    assetSummaries.forEach(summary => {
      const oraclePubkey = summary?.oracle_pubkey || ''
      const parsedSummary = {
        oraclePubkey: oraclePubkey, 
        oracle: oracles?.[oraclePubkey] || defaultOracleInfo,
        totalHedgeUnits: (summary?.total_hedge_unit_sats || 0)/ 10 ** 8,
        totalLongSats: summary?.total_long_sats || 0,
      }

      data.push(parsedSummary)
    })
  }
  return data

}
const hedgeSummaryData = ref(null)
const longSummaryData = ref(null)
function fetchSummary(position='hedge') {
  const walletHash = wallet.value.BCH.getWalletHash()
  const params = {
    [position === 'hedge' ? 'hedge_wallet_hash' : 'long_wallet_hash']: walletHash,
    settled: false, funding: 'complete',
  }
  const summaryRef = position === 'hedge' ? hedgeSummaryData : longSummaryData
  anyhedgeBackend.get('anyhedge/hedge-positions/summary/', { params })
    .then(response => {
      summaryRef.value = response?.data
    })
}
const hedgeSummaries = computed(() => parseAssetSummaries(hedgeSummaryData.value))
const longSummaries = computed(() => parseAssetSummaries(longSummaryData.value))
const totalLongSats = computed(() => {
  let subtotal = 0
  if (Array.isArray(longSummaries.value)) {
    longSummaries.value.forEach(summary => subtotal += (summary?.totalLongSats || 0))
  }

  return subtotal
})

// hedge offers
const showCreateHedgeForm = ref(false)
const hedgeOffers = ref([])
const hedgeOffersPaginationState = ref({ count: 0, limit: 1, offset: 0 })
const fetchingHedgeOffers = ref(false)
function fetchHedgeOffers(pagination) {
  const walletHash = wallet.value.BCH.getWalletHash()
  fetchingHedgeOffers.value = true
  return anyhedgeBackend.get(
    '/anyhedge/hedge-position-offers/',
    {
      params: {
        wallet_hash: walletHash,
        limit: pagination?.limit || DEFAULT_PAGE_SIZE,
        offset: pagination?.offset || 0,
      }
    }
  )
    .then(response => {
      if (Array.isArray(response?.data?.results))  hedgeOffers.value = response.data.results
      if (response?.data?.count >= 0 && response?.data?.limit >= 0 && response?.data?.offset >= 0) {
        contractsPaginationState.value.count = response.data.count
        contractsPaginationState.value.limit = response.data.limit
        contractsPaginationState.value.offset = response.data.offset
      }
      return Promise.resolve(response)
    })
    .finally(() => {
      fetchingHedgeOffers.value = false
    })
}

// anyhedge contracts
const contracts = ref([])
const contractsPaginationState = ref({ count: 0, limit: 1, offset: 0 })
const fetchingContracts = ref(false)
function fetchHedgeContracts(pagination) {
  fetchingContracts.value = true
  const walletHash = wallet.value.BCH.getWalletHash()
  return anyhedgeBackend.get(
    '/anyhedge/hedge-positions/',
    { 
      params: {
        hedge_wallet_hash: walletHash,
        limit: pagination?.limit || DEFAULT_PAGE_SIZE,
        offset: pagination?.offset || 0,
      }
    }
  )
    .then(response => {
      if (response?.data?.results) {
        Promise.all(response.data.results.map(parseHedgePositionData))
          .then(parsedContracts => contracts.value = parsedContracts)
        if (response?.data?.count >= 0 && response?.data?.limit >= 0 && response?.data?.offset >= 0) {
          contractsPaginationState.value.count = response.data.count
          contractsPaginationState.value.limit = response.data.limit
          contractsPaginationState.value.offset = response.data.offset
        }
        return Promise.resolve(response)
      }
      return Promise.reject({ response })
    })
    .finally(() => {
      fetchingContracts.value = false
    })
}

function onHedgeFormCreate(data) {
  if (data.hedgePositionOffer?.id) fetchHedgeOffers()
  if (data.hedgePosition?.address || data?.hedgePositionOffer?.hedge_position?.address) {
    const contractAddress = data.hedgePosition?.address || data?.hedgePositionOffer?.hedge_position?.address
    const fetchHedgeContractsResponse = fetchHedgeContracts()
    $q.dialog({
      title: 'Hedge Position',
      message: 'Hedge position created.<br/>Address: ' + contractAddress,
      html: true,
      class: this.darkMode ? 'text-white br-15 pt-dark-card' : 'text-black',
      style: 'word-break:break-all;',
    }).onDismiss(() => {
      fetchHedgeContractsResponse.then(() => {
        const contract = contracts.value.find(contract => contract?.address == contractAddress)
        showCreateHedgeForm.value = false
        hedgesDrawerRef.value?.show?.()
        hedgesListRef?.value?.displayContractInDialog?.(contract)
      })
    })
  }
}

// long positions
const longAccount = ref({ wallet_hash: '' })
const fetchingLongAccount = ref(false)
const showAddLiquidityForm = ref(false)
function updateLongAccount(updatedLongAccount) {
  longAccount.value = updatedLongAccount
}

function fetchLongAccounts() {
  const walletHash = wallet.value.BCH.getWalletHash()
  fetchingLongAccount.value = true
  anyhedgeBackend.get(`/anyhedge/long-accounts/${walletHash}`)
    .then(response => {
      longAccount.value = response.data
    })
    .catch(err => {
      if (err.response.status === 404) return 
      console.error(err)
    })
    .finally(() => {
      fetchingLongAccount.value = false
    })
}

const longPositions = ref([])
const longPositionsPaginationState = ref({ count: 0, limit: 1, offset: 0 })
const fetchingLongPositions = ref(false)
function fetchLongPositions(pagination) {
  fetchingLongPositions.value = true
  const walletHash = wallet.value.BCH.getWalletHash()
  anyhedgeBackend.get(
    '/anyhedge/hedge-positions/',
    {
      params: {
        long_wallet_hash: walletHash,
        limit: pagination?.limit || DEFAULT_PAGE_SIZE,
        offset: pagination?.offset || 0,
      }
    }
  )
    .then(response => {
      if (response?.data?.results) {
        Promise.all(response.data.results.map(parseHedgePositionData))
          .then(parsedContracts => longPositions.value = parsedContracts)

        if (response?.data?.count >= 0 && response?.data?.limit >= 0 && response?.data?.offset >= 0) {
          longPositionsPaginationState.value.count = response.data.count
          longPositionsPaginationState.value.limit = response.data.limit
          longPositionsPaginationState.value.offset = response.data.offset
        }
      }
    })
    .finally(() => {
      fetchingLongPositions.value = false
    })
}


const updatedOracles = ref(false)
watch(showCreateHedgeForm, () => {
  if (!updatedOracles.value) {
    anyhedgeBackend.get('anyhedge/oracles/')
      .then(response => {
        if (Array.isArray(response?.data?.results)) {
          response.data.results.forEach(oracle => {
            if (!oracle) return

            const mutationPayload = {
              pubkey: oracle.pubkey,
              assetName: oracle.asset_name,
              assetCurrency: oracle.asset_currency,
              assetDecimals: oracle.asset_decimals
            }
            $store.commit('anyhedge/setOracle', mutationPayload)

            const dispatchPayload = { oraclePubkey: mutationPayload.pubkey, checkTimestampAge: true }
            $store.dispatch('anyhedge/updateOracleLatestPrice', dispatchPayload)
          })
          updatedOracles.value = true
        }
      })
  }
})


function refetchContract(contractAddress) {
  if (!contractAddress) return
  anyhedgeBackend.get(`/anyhedge/hedge-positions/${contractAddress}`)
    .then(async (response) => {
      if (response?.data?.address) {
        const contractData = await parseHedgePositionData(response?.data)
        return Promise.resolve(contractData)
      }
      return Promise.reject(response)
    })
    .then(contractData => {
      const index = contracts.value.findIndex(contract => contract?.address === contractData.address)
      if (index >= 0) contracts.value[index] = contractData
      return contractData
    })
    .then(contractData => {
      const index = longPositions.value.findIndex(contract => contract?.address === contractData.address)
      if (index >= 0) longPositions.value[index] = contractData
      return contractData
    })
}


function fetchLiquidityServiceInfo() {
  return generalProtocolLPBackend.get('/api/v1/liquidityServiceInformation')
    .then(response => {
      if (response?.data?.liquidityParameters) {
        $store.commit('anyhedge/updateLiquidityServiceInfo', response.data)
      }
    })
}
onMounted(() => fetchLiquidityServiceInfo())

onMounted(() => {
  window.t = () => {
    $store.commit('darkmode/setDarkmodeSatus', !darkMode.value)
  }
})
</script>

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
                <span v-else>$ {{ totalHedgeValue }}</span>
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
            <div class="text-caption text-grey">Total Hedge Position Value</div>
            <div class="row items-center">
              <div class="q-space">
                <q-skeleton v-if="fetchingLongPositions" class="q-mr-sm"/>
                <span v-else>$ {{ totalLongValue }}</span>
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
        </q-expansion-item>
        <q-separator/>
        <q-expansion-item label="Hedge Positions">
          <q-card-section v-if="fetchingContracts" class="q-gutter-y-md">
            <q-skeleton v-for="i in 3" type="rect"/>
          </q-card-section>
          <HedgeContractsList v-else :contracts="contracts" view-as="hedge"/>
        </q-expansion-item>
      </template>
      <template v-else-if="selectedAccountType === 'long'">
        <q-expansion-item label="Long Positions">
          <q-card-section v-if="fetchingLongPositions" class="q-gutter-y-md">
            <q-skeleton v-for="i in 3" type="rect"/>
          </q-card-section>
          <HedgeContractsList v-else :contracts="longPositions" view-as="long"/>
        </q-expansion-item>
      </template>
    </q-card>
  </div>
</template>
<script setup>
import { getMnemonic, Wallet } from '../../wallet'
import { anyhedgeBackend, connectWebsocketUpdates, generalProtocolLPBackend } from '../../wallet/anyhedge/backend'
import { formatCentsToUSD, parseHedgePositionData } from '../../wallet/anyhedge/formatters'
import { ref, computed, markRaw, onMounted, inject, onUnmounted, watch } from 'vue'
import { useStore } from 'vuex'
import HeaderNav from '../../components/header-nav'
import AddLiquidityForm from 'src/components/anyhedge/AddLiquidityForm.vue'
import CreateHedgeForm from 'src/components/anyhedge/CreateHedgeForm.vue'
import HedgeContractsList from 'src/components/anyhedge/HedgeContractsList.vue'
import HedgeOffersList from 'src/components/anyhedge/HedgeOffersList.vue'

// misc
const $copyText = inject('$copyText')
const $store = useStore()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])
const selectedAccountType = ref('hedge')

const wallet = ref(null)
onMounted(async () => {
  const mnemonic = await getMnemonic()
  wallet.value = markRaw(new Wallet(mnemonic))

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
  if (data?.resource === 'long_account') fetchLongAccounts()
  if (data?.resource === 'hedge_position_offer') {
    if (data?.action === 'settlement') {
      if (data?.meta?.position === 'hedge') {
        fetchHedgeOffers()
        fetchHedgeContracts()
      } else if (data?.meta?.position === 'long') {
        fetchLongPositions()
      }
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

// hedge offers
const showCreateHedgeForm = ref(false)
const hedgeOffers = ref([])
const fetchingHedgeOffers = ref(false)
function fetchHedgeOffers() {
  const walletHash = wallet.value.BCH.getWalletHash()
  fetchingHedgeOffers.value = true
  anyhedgeBackend.get(
    '/anyhedge/hedge-position-offers/',
    {
      params: { wallet_hash: walletHash }
    }
  )
    .then(response => {
      hedgeOffers.value = response.data.results
    })
    .finally(() => {
      fetchingHedgeOffers.value = false
    })
}

// anyhedge contracts
const contracts = ref([])
const fetchingContracts = ref(false)
function fetchHedgeContracts() {
  fetchingContracts.value = true
  const walletHash = wallet.value.BCH.getWalletHash()
  anyhedgeBackend.get(
    '/anyhedge/hedge-positions/',
    { params: { hedge_wallet_hash: walletHash } }
  )
    .then(response => {
      if (response?.data?.results) {
        Promise.all(response.data.results.map(parseHedgePositionData))
          .then(parsedContracts => contracts.value = parsedContracts)
      }
    })
    .finally(() => {
      fetchingContracts.value = false
    })
}
const totalHedgeValue = computed(() => {
  if (!Array.isArray(contracts.value)) return 0
  const total = contracts.value.reduce((subtotal, contract) => subtotal + (contract?.metadata?.nominalUnits || 0), 0)
  return formatCentsToUSD(total)
})

function onHedgeFormCreate(data) {
  if (data.hedgePositionOffer) fetchHedgeOffers()
  if (data.hedgePosition) fetchHedgeContracts()
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
const fetchingLongPositions = ref(false)
const totalLongValue = computed(() => {
  if (!Array.isArray(contracts.value)) return 0
  const total = longPositions.value.reduce((subtotal, contract) => subtotal + (contract?.metadata?.nominalUnits || 0), 0)
  return formatCentsToUSD(total)
})
function fetchLongPositions() {
  fetchingLongPositions.value = true
  const walletHash = wallet.value.BCH.getWalletHash()
  anyhedgeBackend.get(
    '/anyhedge/hedge-positions/',
    { params: { long_wallet_hash: walletHash } }
  )
    .then(response => {
      if (response?.data?.results) {
        Promise.all(response.data.results.map(parseHedgePositionData))
          .then(parsedContracts => longPositions.value = parsedContracts)
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

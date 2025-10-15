<template>
  <q-pull-to-refresh
    id="app-container"
    :class="getDarkModeClass(darkMode)"
    @refresh="refreshPage"
  >
    <HeaderNav
      title="AnyHedge"
      backnavpath="/apps"
      class="apps-header"
    />
    <q-tabs
      class="col-12 q-px-sm q-pb-md q-pt-lg pp-fcolor q-mx-md"
      v-model="selectedAccountType"
      style="padding-bottom: 16px;"
      :style="{ 'margin-top': $q.platform.is.ios ? '-10px' : '-35px'}"
    >
      <q-tab
        name="short"
        class="network-selection-tab"
        :class="getDarkModeClass(darkMode)"
        :label="$t('Hedge')"
      />
      <q-tab
        name="long"
        class="network-selection-tab"
        :class="getDarkModeClass(darkMode)"
        :label="$t('Long')"
      />
    </q-tabs>

    <q-card
      class="br-15 q-mx-md q-mb-md q-mt-sm pt-card text-bow"
      :class="getDarkModeClass(darkMode)"
      style="transition: height 0.5s"
    >
      <template v-if="selectedAccountType === 'short'">
        <q-card-section class="text-h5">
          <div>
          <div class="text-caption text-grey">{{ $t('TotalHedgeValue') }}</div>
            <div class="row items-center">
              <div class="q-space">
                <q-skeleton v-if="fetchingContracts" class="q-mr-sm"/>
                <template v-else>
                  <div v-if="hedgeSummaries.length === 0" class="text-grey-7 text-body1">
                    {{ $t('NoOngoingContract') }}
                  </div>
                  <div v-for="(summary, index) in hedgeSummaries" :key="index">
                    <div class="row items-center q-gutter-x-xs q-ml-xs">
                      {{ formatUnits(summary.totalHedgeUnits, summary?.oracle?.assetDecimals || 0) }}
                      <template v-if="summary?.oracle?.assetCurrency">
                        {{ summary?.oracle?.assetCurrency }}
                      </template>
                      <template v-else>
                        {{ $t('Asset') }} {{ ellipsisText(summary.oraclePubkey, {start: 5, end: 0}) }}
                        <q-icon
                          :color="darkMode ? 'grey-7' : 'black'"
                          size="sm"
                          name="help"
                        >
                          <q-popup-proxy :breakpoint="0">
                            <div
                              style="word-break:break-all;"
                              class="q-px-md q-py-sm text-caption pt-label pt-card"
                              :class="getDarkModeClass(darkMode)"
                            >
                              <div class="text-subtitle1">{{ $t('UnknownAsset') }}</div>
                              {{ $t('OraclePubkey') }}: {{ summary.oraclePubkey }}
                            </div>
                          </q-popup-proxy>
                        </q-icon>
                      </template>
                    </div>
                    <div
                      v-if="summary?.totalHedgeMarketValue && selectedMarketCurrency !== summary?.oracle?.assetCurrency"
                      class="text-caption q-ml-xs text-grey-7"
                      style="margin-top:-0.5em;"
                    >
                      {{ parseFiatCurrency(summary?.totalHedgeMarketValue, selectedMarketCurrency) }}
                    </div>
                  </div>
                </template>
              </div>
              <q-btn
                v-if="!showCreateHedgeForm"
                icon="add"
                padding="xs"
                round
                class="button"
                :color="darkMode ? 'grad' : 'brandblue'"
                @click="showCreateHedgeForm = !showCreateHedgeForm"
              />
            </div>
          </div>
        </q-card-section>

        <q-slide-transition>
          <q-card-section v-if="showCreateHedgeForm" style="border-top: 1px solid gray">
            <CreateHedgeForm
              ref="createHedgeFormRef"
              :wallet="wallet"
              @created="emitData => onHedgeFormCreate(emitData)"
              @cancel="() => showCreateHedgeForm = false"
              @showKeyboard="input => {
                showCustomKeyboard = true
                activeInput = input
              }"
            />
          </q-card-section>
        </q-slide-transition>
      </template>
      <template v-else-if="selectedAccountType === 'long'">
        <q-card-section class="text-h5">
          <div>
            <div class="text-caption text-grey">{{ $t('TotalLongPositions') }}</div>
            <div class="row items-center">
              <div class="q-space">
                <q-skeleton v-if="fetchingLongPositions" class="q-mr-sm"/>
                <div v-else>
                  <div>{{ getAssetDenomination(denomination, totalLongSats / 10 ** 8) }}</div>
                  <div v-if="totalLongMarketValue" class="text-caption text-grey-7" style="margin-top:-0.5em;">
                    {{ parseFiatCurrency(totalLongMarketValue, selectedMarketCurrency) }}
                  </div>
                </div>
              </div>
              <q-btn
                v-if="!showCreateLongForm"
                icon="add"
                padding="xs"
                round
                class="button"
                :color="darkMode ? 'grad' : 'brandblue'"
                @click="showCreateLongForm = !showCreateLongForm"
              />
            </div>
          </div>
        </q-card-section>
        <q-slide-transition>
          <q-card-section v-if="showCreateLongForm" style="border-top: 1px solid gray">
            <CreateHedgeForm
              ref="createHedgeFormRef"
              position="long"
              :wallet="wallet"
              @created="emitData => onHedgeFormCreate(emitData)"
              @cancel="() => showCreateLongForm = false"
              @showKeyboard="() => showCustomKeyboard = true"
            />
          </q-card-section>
        </q-slide-transition>
      </template>
    </q-card>

    <q-card
      class="br-15 q-mx-md q-mb-md pt-card text-bow"
      :class="getDarkModeClass(darkMode)"
    >
      <template v-if="selectedAccountType === 'short'">
        <q-expansion-item ref="offersDrawerRef" :label="$t('HedgeOffers')">
          <template v-slot:header>
            <q-item-section>
              <div class="row items-center full-width">
                {{ $t('HedgeOffers') }}
                <q-badge v-if="pendingHedgeOffersCount" color="amber" class="q-ml-xs q-px-sm q-py-xs" @click.stop>
                  {{ pendingHedgeOffersCount }}
                </q-badge>
                <q-badge v-if="acceptedHedgeOffersCount" color="teal" class="q-ml-xs q-px-sm q-py-xs">
                  {{ acceptedHedgeOffersCount }}
                </q-badge>
              </div>
            </q-item-section>
          </template>
          <div class="q-px-md row items-center no-wrap">
            <div class="row items-center q-gutter-sm">
              <template v-if="hedgeOffersFilter.statuses.length">
                <q-badge
                  v-for="(status, index) in hedgeOffersFilter.statuses" :key="index"
                  :color="resolvePositionOfferColor(status) || 'grey'"
                >
                  {{ formatPositionOfferStatus(status) || '' }}
                </q-badge>
              </template>
              <q-badge v-if="hedgeOffersFilter.expired" color="grey">{{ $t('Expired') }}</q-badge>
              <q-btn
                v-if="hedgeOffersHasFilter"
                flat
                no-caps
                padding="xs"
                :label="$t('ClearFilter')"
                @click="clearHedgeOffersListFilters()"
              />
            </div>
            <q-space/>
            <q-btn
              rounded
              padding="sm"
              flat
              icon="filter_alt"
              @click="openHedgeOffersListFilterForm()"
            />
          </div>
          <q-separator :dark="darkMode" inset/>
          <q-card-section v-if="fetchingHedgeOffers" class="q-gutter-y-md">
            <q-skeleton v-for="i in 3" type="rect"/>
          </q-card-section>
          <HedgeOffersList v-else ref="offersListRef" :hedge-offers="hedgeOffers" @removed="removedHedgeOffer" @updated="updateHedgeOffersCount()"/>
          <div class="row justify-center">
            <LimitOffsetPagination
              :pagination-props="{
                maxPages: 5,
                rounded: true,
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
        <q-expansion-item ref="hedgesDrawerRef" :label="$t('HedgePositions')" default-opened>
          <q-card-section v-if="fetchingContracts" class="q-gutter-y-md">
            <q-skeleton v-for="i in 3" type="rect"/>
          </q-card-section>
          <HedgeContractsList v-else ref="hedgesListRef" :contracts="contracts" view-as="short" :wallet="wallet"/>
          <div class="row justify-center">
            <LimitOffsetPagination
              :pagination-props="{
                maxPages: 5,
                rounded: true,
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
        <q-expansion-item ref="offersDrawerRef" :label="$t('LongOffers')">
          <template v-slot:header>
            <q-item-section>
              <div class="row items-center full-width">
                {{ $t('LongOffers') }}
                <q-badge v-if="pendingLongOffersCount" color="amber" class="q-ml-xs">
                  {{ pendingLongOffersCount }}
                </q-badge>
                <q-badge v-if="acceptedLongOffersCount" color="teal" class="q-ml-xs">
                  {{ acceptedLongOffersCount }}
                </q-badge>
              </div>
            </q-item-section>
          </template>
          <div class="q-px-md row items-center no-wrap">
            <div class="row items-center q-gutter-sm">
              <template v-if="longOffersFilter.statuses.length">
                <q-badge
                  v-for="(status, index) in longOffersFilter.statuses" :key="index"
                  :color="resolvePositionOfferColor(status) || 'grey'"
                >
                  {{ formatPositionOfferStatus(status) || '' }}
                </q-badge>
              </template>
              <q-badge v-if="longOffersFilter.expired" color="grey">{{ $t('Expired') }}</q-badge>
              <q-btn
                v-if="longOffersHasFilter"
                flat
                no-caps
                padding="xs"
                label="Clear filter"
                @click="clearLongOffersListFilters()"
              />
            </div>
            <q-space/>
            <q-btn
              rounded
              padding="sm"
              flat
              icon="filter_alt"
              @click="openLongOffersListFilterForm()"
            />
          </div>
          <q-separator :dark="darkMode" inset/>
          <q-card-section v-if="fetchingLongOffers" class="q-gutter-y-md">
            <q-skeleton v-for="i in 3" type="rect"/>
          </q-card-section>
          <HedgeOffersList v-else ref="offersListRef" :hedge-offers="longOffers" @removed="removedHedgeOffer" @updated="updateLongOffer()"/>
          <div class="row justify-center">
            <LimitOffsetPagination
              :pagination-props="{
                maxPages: 5,
                rounded: true,
                padding: 'sm md',
                boundaryNumbers: true
              }"
              class="q-mb-md"
              :hide-below-pages="2"
              :modelValue="longOffersPaginationState"
              @update:modelValue="fetchLongOffers"
            />
          </div>
        </q-expansion-item>
        <q-separator/>
        <q-expansion-item ref="hedgesDrawerRef" :label="$t('LongPositions')" default-opened>
          <q-card-section v-if="fetchingLongPositions" class="q-gutter-y-md">
            <q-skeleton v-for="i in 3" type="rect"/>
          </q-card-section>
          <HedgeContractsList ref="hedgesListRef" v-else :contracts="longPositions" view-as="long" :wallet="wallet"/>
          <div class="row justify-center">
            <LimitOffsetPagination
              :pagination-props="{
                maxPages: 5,
                rounded: true,
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
    <div v-if="showCustomKeyboard" style="padding-top: 50px;">
      <CustomKeyboard
      :custom-keyboard-state="'show'"
      @addKey="setAmount"
      @makeKeyAction="makeKeyAction"
    />
    </div>
  </q-pull-to-refresh>
</template>
<script setup>
import { bus } from 'src/wallet/event-bus'
import { getMnemonic, Wallet } from '../../wallet'
import { anyhedgeBackend, connectWebsocketUpdates, generalProtocolLPBackend } from '../../wallet/anyhedge/backend'
import { formatUnits, ellipsisText, parseHedgePositionData, parseHedgePositionOffer, formatPositionOfferStatus, resolvePositionOfferColor } from '../../wallet/anyhedge/formatters'
import { ref, computed, markRaw, onMounted, inject, onUnmounted, watch } from 'vue'
import { useStore } from 'vuex'
import { useQuasar, scroll } from 'quasar'
import HeaderNav from '../../components/header-nav'
import LimitOffsetPagination from 'src/components/LimitOffsetPagination.vue'
import AddLiquidityForm from 'src/components/anyhedge/AddLiquidityForm.vue'
import CreateHedgeForm from 'src/components/anyhedge/CreateHedgeForm.vue'
import HedgeContractDetailDialog from 'src/components/anyhedge/HedgeContractDetailDialog.vue'
import HedgeContractsList from 'src/components/anyhedge/HedgeContractsList.vue'
import HedgeOffersList from 'src/components/anyhedge/HedgeOffersList.vue'
import HedgeOffersFilterFormDialog from 'src/components/anyhedge/HedgeOffersFilterFormDialog.vue'
import CustomKeyboard from 'src/components/CustomKeyboard.vue'
import { getAssetDenomination, parseFiatCurrency } from 'src/utils/denomination-utils'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { useI18n } from 'vue-i18n'

const { getScrollTarget, setVerticalScrollPosition } = scroll

// misc
const DEFAULT_PAGE_SIZE = 10
const $copyText = inject('$copyText')
const $q = useQuasar()
const $t = useI18n().t
const $store = useStore()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])
const denomination = computed(() => $store.getters['global/denomination'])
const theme = computed(() => $store.getters['global/theme'])
const selectedAccountType = ref('short')

const hedgesDrawerRef = ref()
const hedgesListRef = ref()
const offersDrawerRef = ref()
const offersListRef = ref()

// Custom Keyboard
const createHedgeFormRef = ref()
const showCustomKeyboard = ref(false)
const activeInput = ref()

function setAmount (key) {
  createHedgeFormRef?.value?.setAmount?.(key)
}

function makeKeyAction (action) {
  if (action === 'backspace' || action === 'delete') {
    createHedgeFormRef?.value?.makeKeyAction(action)
  } else {
    showCustomKeyboard.value = false
  }
}

async function refreshPage(done=() => {}, opts={ allAccountType: false }) {
  try {
    if (!wallet.value) await initWallet()

    const promises = [].map(Promise.resolve)
    if (!isWebSocketOpenOrRestaring()) promises.push(initWebsocket())

    if (opts?.allAccountType || selectedAccountType.value === 'short') {
      promises.push(
        fetchSummary('short'),
        fetchHedgeOffers(),
        fetchHedgeContracts(),
        updateHedgeOffersCount(),
      )
    }

    if (opts?.allAccountType || selectedAccountType.value === 'long') {
      promises.push(
        fetchSummary('long'),
        // fetchLongAccounts(),
        fetchLongOffers(),
        fetchLongPositions(),
        updateLongOffersCount(),
      )
    }

    await Promise.all(promises)
  } finally {
    done?.()
  }
}

const wallet = ref(null)
async function initWallet() {
  const mnemonic = await getMnemonic($store.getters['global/getWalletIndex'])
  wallet.value = markRaw(new Wallet(mnemonic))
}
onMounted(async () => refreshPage(()=>{}, { allAccountType: true }))

const socket = ref([].map(() => new WebSocket())[0])
const socketReconnection = ref({
  enable: true,
  attempts: 0,
  max: 10,
  interval: 15 * 1000,
  timeoutId: null,
})
function isWebSocketOpenOrRestaring() {
  if (socket.value?.readyState === WebSocket.OPEN) return true
  return socketReconnection.value.enable && Boolean(socketReconnection.value.timeoutId)
}

const websocketMessageHandler = (message) => {
  const data = JSON.parse(message.data)
  if (data?.resource === 'long_account') fetchLongAccounts()
  if (data?.resource === 'hedge_position_offer') {
    if (data?.action === 'settled') {
      if (data?.meta?.position === 'short') {
        fetchSummary('short')
        fetchHedgeOffers()
        fetchHedgeContracts()
        updateHedgeOffersCount()
      } else if (data?.meta?.position === 'long') {
        fetchSummary('long')
        fetchLongPositions()
        updateLongOffersCount()
      }
    } else if (['accepted', 'cancel_accept', 'settled'].indexOf(data?.action) >= 0) {
      refetchHedgePositionOffer(data?.meta?.id)
      if (data?.meta?.position === 'short') updateHedgeOffersCount()
      if (data?.meta?.position === 'long') updateLongOffersCount()
    }
  }
  if (data?.resource === 'hedge_position') {
    if (data?.action === 'funding_proposal') {
      fetchSummary('short')
      fetchSummary('long')
      refetchContract(data?.meta?.address)
    } else if (data?.action === 'settlement') {
      fetchSummary('short')
      fetchSummary('long')
      refetchContract(data?.meta?.address)
    } else if (data?.action === 'cancelled') {
      refetchContract(data?.meta?.address)
    }
  }
  if (data?.resource === 'mutual_redemption') {
    refetchContract(data?.meta?.address)
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
        socketReconnection.value.timeoutId = setTimeout(() => initWebsocket(true), socketReconnection.value.interval)
      }
    }
    socket.value?.close?.()
    console.log('Websocket connected')
  } catch(err) {
    console.error('Error in connecting websocket:', err)
    if (socketReconnection.value.enable) {
      socketReconnection.value.attempts++
      console.log('Attempting websocket reconnection in', socketReconnection.value.interval, 'ms')
      socketReconnection.value.timeoutId = setTimeout(() => initWebsocket(true), socketReconnection.value.interval)
    }
  }

  socket.value = _socket
  socketReconnection.value.attempts = 0
}
onUnmounted(() => {
  console.log('Closing websocket')
  socketReconnection.value.enable = false
  socket.value?.close?.()
  clearTimeout(socketReconnection.value.timeoutId)
})


// summary
const selectedMarketCurrency = computed(() => $store.getters['market/selectedCurrency']?.symbol)
const selectedCurrencyPrice = computed(() => $store.getters['market/getAssetPrice']('bch', selectedMarketCurrency.value))

function parseAssetSummaries(assetSummaries) {
  const data = []
  if (Array.isArray(assetSummaries)) {
    const oracles = $store.getters['anyhedge/oracles']
    const defaultOracleInfo = { assetName: '', assetCurrency: '', assetDecimals: 0 }
    assetSummaries.forEach(summary => {
      const oraclePubkey = summary?.oracle_pubkey || ''
      const oracle = oracles?.[oraclePubkey] || defaultOracleInfo
      const totalHedgeUnits = (summary?.total_hedge_unit_sats || 0)/ 10 ** 8
      const totalLongSats = summary?.total_long_sats || 0
      let totalHedgeMarketValue = undefined
      let totalLongMarketValue = undefined
      let oracleToSelectedAssetRate = undefined
      if (oracle?.assetCurrency && selectedMarketCurrency.value) {
        oracleToSelectedAssetRate = $store.getters['market/getAssetConversion'](
          oracle.assetCurrency,
          selectedMarketCurrency.value,
        )
      }
      if (isFinite(oracleToSelectedAssetRate)) {
        totalHedgeMarketValue = (totalHedgeUnits * oracleToSelectedAssetRate) / (10 ** oracle?.assetDecimals)
        totalHedgeMarketValue = Number(totalHedgeMarketValue.toFixed(2))
      }

      if (isFinite(selectedCurrencyPrice.value)) {
        totalLongMarketValue = (totalLongSats * selectedCurrencyPrice.value) / 10 ** 8
        totalLongMarketValue = Number(totalLongMarketValue.toFixed(2))
      }

      const parsedSummary = {
        oraclePubkey,
        oracle,
        totalHedgeUnits,
        totalLongSats,
        totalHedgeMarketValue,
        totalLongMarketValue,
      }

      data.push(parsedSummary)
    })
  }
  return data

}
const hedgeSummaryData = ref(null)
const longSummaryData = ref(null)
function fetchSummary(position='short') {
  const walletHash = wallet.value.BCH.getWalletHash()
  const params = {
    [position === 'short' ? 'short_wallet_hash' : 'long_wallet_hash']: walletHash,
    settled: false, funding: 'complete',
  }
  const summaryRef = position === 'short' ? hedgeSummaryData : longSummaryData
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
const totalLongMarketValue = computed(() => {
  return longSummaries.value?.reduce?.(
    (subtotal, summary) => subtotal + summary?.totalLongMarketValue, 0
  )
})

const summaryCurrenciesToUpdate = computed(() => {
  return hedgeSummaries.value
  .map(hedgeSummary => hedgeSummary?.oracle?.assetCurrency)
  .filter(currency => typeof currency === 'string') // filter non string values
  .filter(currency => currency.toLowerCase() !== 'USD') // market prices are based on USD so its always 1 for USD
  .filter(currency => currency !== selectedMarketCurrency.value) // the app already updates selected market currency regularly
  .filter(Boolean) // filter empty values
})
function updateSummaryMarketPrices() {
  summaryCurrenciesToUpdate.value.forEach(currency => {
    $store.dispatch('market/updateUsdRates', { currency, priceDataAge: 60 * 1000 })
  })
}
const summaryMarketPricesUpdateInterval = ref(null)
onMounted(() => {
  clearInterval(summaryMarketPricesUpdateInterval.value)
  summaryMarketPricesUpdateInterval.value = setInterval(
    () => updateSummaryMarketPrices(),
    60 * 1000,
  )
  updateSummaryMarketPrices()
})
onUnmounted(() => clearInterval(summaryMarketPricesUpdateInterval.value))
watch(summaryCurrenciesToUpdate, () => updateSummaryMarketPrices())

// hedge offers
const showCreateHedgeForm = ref(false)
const pendingHedgeOffersCount = ref(0)
const acceptedHedgeOffersCount = ref(0)
const hedgeOffers = ref([])
const hedgeOffersFilter = ref({
  statuses: [],
  expired: undefined,
})
const hedgeOffersPaginationState = ref({ count: 0, limit: 1, offset: 0 })
const fetchingHedgeOffers = ref(false)
const hedgeOffersHasFilter = computed(() => {
  return hedgeOffersFilter.value?.statuses?.length || hedgeOffersFilter.value?.expired
})
function clearHedgeOffersListFilters() {
  hedgeOffersFilter.value.statuses = []
  hedgeOffersFilter.value.expired = undefined
  fetchHedgeOffers()
}
function openHedgeOffersListFilterForm() {
  $q.dialog({
    component: HedgeOffersFilterFormDialog,
    componentProps: {
      initialValue: hedgeOffersFilter.value,
    }
  })
    .onOk(value => {
      hedgeOffersFilter.value.statuses = value?.statuses || []
      hedgeOffersFilter.value.expired = value?.expired || undefined
      fetchHedgeOffers()
    })
}
function updateHedgeOffersCount() {
  updatePendingHedgeOffersCount()
  updateAcceptedHedgeOffersCount()
}
function updatePendingHedgeOffersCount() {
  const walletHash = wallet.value.BCH.getWalletHash()
  return anyhedgeBackend.get(
    '/anyhedge/hedge-position-offers/',
    {
      params: {
        wallet_hash: walletHash,
        position: 'short',
        statuses: 'pending',
        expired: false,
        limit: 1,
        offset: 999,
      }
    }
  )
    .then(response => {
      if (isNaN(response?.data?.count)) return Promise.reject({ response })
      pendingHedgeOffersCount.value = response?.data?.count
    })
}
function updateAcceptedHedgeOffersCount() {
  const walletHash = wallet.value.BCH.getWalletHash()
  return anyhedgeBackend.get(
    '/anyhedge/hedge-position-offers/',
    {
      params: {
        wallet_hash: walletHash,
        position: 'short',
        statuses: 'accepted',
        limit: 1,
        offset: 999,
      }
    }
  )
    .then(response => {
      if (isNaN(response?.data?.count)) return Promise.reject({ response })
      acceptedHedgeOffersCount.value = response?.data?.count
    })
}
function fetchHedgeOffers(pagination) {
  const walletHash = wallet.value.BCH.getWalletHash()
  fetchingHedgeOffers.value = true
  const params = {
    wallet_hash: walletHash,
    position: 'short',
    limit: pagination?.limit || DEFAULT_PAGE_SIZE,
    offset: pagination?.offset || 0,

    expired: hedgeOffersFilter.value.expired,
  }

  if (Array.isArray(hedgeOffersFilter.value.statuses) && hedgeOffersFilter.value.statuses.length) {
    params.statuses = hedgeOffersFilter.value.statuses.join(',')
    if (typeof params.expired !== 'boolean') params.expired = false
  }
  return anyhedgeBackend.get(
    '/anyhedge/hedge-position-offers/',
    { params },
  )
    .then(response => {
      if (Array.isArray(response?.data?.results)) {
        hedgeOffers.value = response.data.results.map(parseHedgePositionOffer)
        hedgeOffers.value.forEach(async (positionOffer) => {
          if (!positionOffer?.hedgePosition) return
          positionOffer.hedgePosition = await positionOffer?.hedgePosition
        })
      }
      if (response?.data?.count >= 0 && response?.data?.limit >= 0 && response?.data?.offset >= 0) {
        hedgeOffersPaginationState.value.count = response.data.count
        hedgeOffersPaginationState.value.limit = response.data.limit
        hedgeOffersPaginationState.value.offset = response.data.offset
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
        short_wallet_hash: walletHash,
        // short_wallet_hash: 'e9dcb6863f86d9ab856c5ba26b8becabdf31dc7cc53c7d03dc9d3f0493c25db8',
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
  if (data.hedgePositionOffer?.id) {
    fetchHedgeOffers()
    fetchLongOffers()
    if (data.hedgePositionOffer?.position === 'short') updateHedgeOffersCount()
    if (data.hedgePositionOffer?.position === 'long') updateLongOffersCount()
    $q.dialog({
      title: `${data?.position === 'long' ? $t('LongPositionOffer') : $t('HedgePositionOffer')}`,
      message: `${data?.position === 'long' ? $t('LongPositionOfferCreated') : $t('HedgePositionOfferCreated')}`,
      class: `br-15 pt-card text-bow ${getDarkModeClass(darkMode.value)}`,
      ok: $t('OK'),
      seamless: true,
      style: 'word-break:break-all;',
    })
      .onDismiss(() => {
        if (data?.position === 'long') showCreateLongForm.value = false
        else showCreateHedgeForm.value = false
        offersDrawerRef.value?.show?.()
      })
  }
  if (data.hedgePosition?.address || data?.hedgePositionOffer?.hedge_position?.address) {
    const contractAddress = data.hedgePosition?.address || data?.hedgePositionOffer?.hedge_position?.address
    fetchSummary(data?.position)
    const fetchHedgeContractsResponse = data?.position === 'long' ? fetchLongPositions() : fetchHedgeContracts()
    const message = `${data?.position === 'long' ? $t('LongPositionCreated') : $t('HedgePositionCreated')}.<br/>${$t('Address')}: ${contractAddress}`
    $q.dialog({
      title: `${data?.position === 'long' ? $t('LongPosition') : $t('HedgePosition')}`,
      message,
      ok: $t('OK'),
      html: true,
      seamless: true,
      class: `br-15 pt-card text-bow ${getDarkModeClass(darkMode.value)}`,
      style: 'word-break:break-all;',
    }).onDismiss(() => {
      fetchHedgeContractsResponse.then(() => {
        const contractsList = data?.position === 'long' ? longPositions.value : contracts.value
        const contract = contractsList.find(contract => contract?.address == contractAddress)
        if (data?.position === 'long') showCreateLongForm.value = false
        else showCreateHedgeForm.value = false
        hedgesDrawerRef.value?.show?.()
        hedgesListRef?.value?.displayContractInDialog?.(contract)
      })
    })
  }
}

// long offers
const pendingLongOffersCount = ref(0)
const acceptedLongOffersCount = ref(0)
const longOffers = ref([])
const longOffersFilter = ref({
  statuses: [],
  expired: undefined
})
const longOffersPaginationState = ref({ count: 0, limit: 1, offset: 0 })
const fetchingLongOffers = ref(false)
const longOffersHasFilter = computed(() => {
  return longOffersFilter.value?.statuses?.length || longOffersFilter.value?.expired
})
function clearLongOffersListFilters() {
  longOffersFilter.value.statuses = []
  longOffersFilter.value.expired = undefined
  fetchLongOffers()
}
function openLongOffersListFilterForm() {
  $q.dialog({
    component: HedgeOffersFilterFormDialog,
    componentProps: {
      initialValue: longOffersFilter.value,
    }
  })
    .onOk(value => {
      longOffersFilter.value.statuses = value?.statuses || []
      longOffersFilter.value.expired = value?.expired || undefined
      fetchLongOffers()
    })
}
function updateLongOffersCount() {
  updatePendingLongOffersCount()
  updateAcceptedLongOffersCount()
}
function updatePendingLongOffersCount() {
  const walletHash = wallet.value.BCH.getWalletHash()
  return anyhedgeBackend.get(
    '/anyhedge/hedge-position-offers/',
    {
      params: {
        wallet_hash: walletHash,
        position: 'long',
        statuses: 'pending',
        expired: false,
        limit: 1,
        offset: 999,
      }
    }
  )
    .then(response => {
      if (isNaN(response?.data?.count)) return Promise.reject({ response })
      pendingLongOffersCount.value = response?.data?.count
    })
}
function updateAcceptedLongOffersCount() {
  const walletHash = wallet.value.BCH.getWalletHash()
  return anyhedgeBackend.get(
    '/anyhedge/hedge-position-offers/',
    {
      params: {
        wallet_hash: walletHash,
        position: 'long',
        statuses: 'accepted',
        limit: 1,
        offset: 999,
      }
    }
  )
    .then(response => {
      if (isNaN(response?.data?.count)) return Promise.reject({ response })
      acceptedLongOffersCount.value = response?.data?.count
    })
}
function fetchLongOffers(pagination) {
  const walletHash = wallet.value.BCH.getWalletHash()
  fetchingLongOffers.value = true
  const params = {
    wallet_hash: walletHash,
    position: 'long',
    limit: pagination?.limit || DEFAULT_PAGE_SIZE,
    offset: pagination?.offset || 0,

    expired: longOffersFilter.value.expired,
  }
  if (Array.isArray(longOffersFilter.value.statuses) && longOffersFilter.value.statuses.length) {
    params.statuses = longOffersFilter.value.statuses.join(',')
    if (typeof params.expired !== 'boolean') params.expired = false
  }
  return anyhedgeBackend.get(
    '/anyhedge/hedge-position-offers/',
    { params },
  )
    .then(response => {
      if (Array.isArray(response?.data?.results)) {
        longOffers.value = response.data.results.map(parseHedgePositionOffer)
        longOffers.value.forEach(async (positionOffer) => {
          if (!positionOffer?.hedgePosition) return
          positionOffer.hedgePosition = await positionOffer?.hedgePosition
        })
      }
      if (response?.data?.count >= 0 && response?.data?.limit >= 0 && response?.data?.offset >= 0) {
        longOffersPaginationState.value.count = response.data.count
        longOffersPaginationState.value.limit = response.data.limit
        longOffersPaginationState.value.offset = response.data.offset
      }
      return Promise.resolve(response)
    })
    .finally(() => {
      fetchingLongOffers.value = false
    })
}

// long positions
const showCreateLongForm = ref(false)
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
  return anyhedgeBackend.get(
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

function removedHedgeOffer(hedgeOffer) {
  if (!hedgeOffer?.id) return
  hedgeOffers.value = hedgeOffers.value.filter(offer => offer?.id !== hedgeOffer?.id)
  longOffers.value = longOffers.value.filter(offer => offer?.id !== hedgeOffer?.id)
}

function refetchHedgePositionOffer(hedgeOfferId) {
  anyhedgeBackend.get(`anyhedge/hedge-position-offers/${hedgeOfferId}/`)
    .then(async (response) => {
      if (!response?.data?.id) return Promise.reject({ response })
      const hedgeOffer = parseHedgePositionOffer(response?.data)
      if (hedgeOffer?.hedgePosition) hedgeOffer.hedgePosition = await hedgeOffer.hedgePosition

      const hedgeOffersListIndex = hedgeOffers.value.findIndex(_hedgeOffer => _hedgeOffer?.id === hedgeOffer?.id)
      if (hedgeOffersListIndex >= 0) hedgeOffers.value[hedgeOffersListIndex] = hedgeOffer

      const longOffersListIndex = longOffers.value.findIndex(_hedgeOffer => _hedgeOffer?.id === hedgeOffer?.id)
      if (longOffersListIndex >= 0) longOffers.value[longOffersListIndex] = hedgeOffer
      return Promise.resolve(response)
    })
}


const updatedOracles = ref(false)
function updateOracles() {
  if (updatedOracles.value) return
  return anyhedgeBackend.get('anyhedge/oracles/')
    .then(response => {
      if (Array.isArray(response?.data?.results)) {
        response.data.results.forEach(oracle => {
          if (!oracle) return

          const mutationPayload = {
            active: oracle.active,
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
watch(showCreateHedgeForm, () => updateOracles())
onMounted(() => updateOracles())


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
      if (index >= 0) Object.assign(contracts.value[index], contractData)
      return contractData
    })
    .then(contractData => {
      const index = longPositions.value.findIndex(contract => contract?.address === contractData.address)
      if (index >= 0) Object.assign(longPositions.value[index], contractData)
      return contractData
    })
}


function fetchLiquidityServiceInfo() {
  return generalProtocolLPBackend.get('/api/v2/liquidityServiceInformation')
    .then(response => {
      if (response?.data?.liquidityParameters) {
        $store.commit('anyhedge/updateLiquidityServiceInfo', response.data)
      }
    })
}
onMounted(() => fetchLiquidityServiceInfo())

bus.on('handle-push-notification', handleOpenedNotification)
function handleOpenedNotification(openedNotification) {
  const notificationTypes = $store.getters['notification/types']

  const type = openedNotification?.data?.type
  const openContractTypes = [
    notificationTypes.ANYHEDGE_OFFER_SETTLED,
    notificationTypes.ANYHEDGE_MATURED,
    notificationTypes.ANYHEDGE_CONTRACT_CANCELLED,
    notificationTypes.ANYHEDGE_REQUIRE_FUNDING,
    notificationTypes.ANYHEDGE_MUTUAL_REDEMPTION_UPDATE,
    notificationTypes.ANYHEDGE_MUTUAL_REDEMPTION_COMPLETE,
  ]

  if (openContractTypes.indexOf(type) >= 0) {
    const address = openedNotification?.data?.address
    const position = openedNotification?.data?.position
    displayContractFromNotification({address, position})
  }
}

async function displayContractFromNotification(data={address: '', position: '' }) {
  if (!data) return
  const { address } = data
  let _position, contract

  const hedgeContract = contracts.value.find(contract => contract?.address === address)
  if (hedgeContract) [contract, _position] = [hedgeContract, 'short']

  if (!contract) {
    const longContract = longPositions.value.find(contract => contract?.address === address)
    if (longContract) [contract, _position] = [longContract, 'long']
  }

  if (!contract) {
    try {
      if (!wallet.value) {
        console.log('Initializing wallet')
        await initWallet()
      }
      const walletHash = wallet.value.BCH.getWalletHash()
      const response = await anyhedgeBackend.get(`anyhedge/hedge-positions/${address}/`)
      contract = await parseHedgePositionData(response?.data)
      if (walletHash == contract.shortWalletHash) _position = 'short'
      else if (walletHash == contract.longWalletHash) _position = 'long'
    } catch(error) {
      console.error(error)
    }
  }

  let contractsListRef
  if (_position == 'short') contractsListRef = contracts
  else if (_position == 'long') contractsListRef = longPositions

  if (contractsListRef) {
    const index = contractsListRef.value.findIndex(contract => contract?.address == contract?.address)
    if (index >= 0) contractsListRef.value[index] = contract
    else contractsListRef.value.unshift(contract)
  }

  if (_position && !selectedAccountType.value !== _position) selectedAccountType.value = _position
  if (contract) {
    hedgesDrawerRef.value?.show?.()
    if (hedgesListRef?.value?.displayContractInDialog) {
      hedgesListRef?.value?.displayContractInDialog?.(contract)
    } else {
      $q.dialog({
        component: HedgeContractDetailDialog,
        componentProps: { contract: contract, viewAs: _position, wallet: wallet.value }
      })
    }
    
  } else {
    $q.dialog({
      message: $t('UnableToFindContract'),
      seamless: true,
      ok: $t('OK'),
      class: `br-15 pt-card text-bow ${getDarkModeClass(darkMode.value)}`
    })
  }
  return contract
}
</script>

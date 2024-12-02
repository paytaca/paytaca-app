<template>
  <q-card
    class="br-15 pt-card text-bow q-mb-md"
    :class="getDarkModeClass(darkMode)"
    style="position:relative;"
    v-ripple
    @click="() => openDialog = true"
  >
    <q-card-section>
      <div class="row items-center">
        <div class="text-h5">{{ redemptionContract?.fiat_token?.currency || 'UNIT' }}</div>
        <q-space/>
        <div v-if="pricePerDenomination">
          {{ pricePerDenomination }} {{ currency }}/{{ denomination }}
        </div>
      </div>
      <div class="row items-center no-wrap" style="position: relative;" v-ripple @click.stop="copyToClipboard(redemptionContract?.address)">
        <div class="ellipsis text-subtitle q-space">
          {{ redemptionContract?.address }}
        </div>
        <q-icon name="content_copy" right/>
      </div>
      <div class="row items-start no-wrap">
        <div>
          <div class="text-grey">Redemption contract</div>
          <div>{{ denominateBch(redemptionContract?.redeemable || 0) }}</div>
          <div>{{ formatTokenUnits(redemptionContract?.reserve_supply || 0) }}</div>
        </div>
        <q-space/>
        <div v-if="redemptionContract?.treasury_contract_address" class="text-right">
          <div class="text-grey">Treasury contract</div>
          <div>{{ denominateBch(parsedTreasuryContractBalance?.spendableBch) }}</div>
          <div>{{ formatTokenUnits(parsedTreasuryContractBalance?.shortUnitValue) }}</div>
        </div>
      </div>
      <q-separator spaced/>
      <div class="row items-center">
        <div class="text-grey q-space">Total Value:</div>
        <div>{{ denominateBch(summaryData?.totalBchValue) }}</div>
      </div>
      <div class="row items-center">
        <div class="text-grey q-space">Tokens in circulation:</div>
        <div>{{ formatTokenUnits(summaryData?.tokensInCirculation) }}</div>
      </div>
      <div class="row items-center">
        <div class="text-grey q-space">Ideal Value:</div>
        <div>
          <q-icon v-bind="summaryData?.expectedDiffPctgIcon" class="q-mr-xs"/>
          {{ denominateBch(summaryData?.expectedBchValue) }}
        </div>
      </div>
    </q-card-section>
    <q-dialog
      v-model="openDialog"
      position="bottom"
      :persistent="hedgePositionDetailDialog.show"
      :seamless="showSendAmountForm"
      @before-hide="() => {
        hedgePositionDetailDialog.show = false
        showSendAmountForm = false
      }"
    >
      <q-card class="br-15 pt-card-2 text-bow" :class="getDarkModeClass(darkMode)">
        <div class="row no-wrap items-center justify-center q-pl-md">
          <div class="text-h6 q-space q-mt-sm">
            {{ redemptionContract?.fiat_token?.currency || 'UNIT' }}
          </div>
          <q-btn
            flat
            padding="sm"
            icon="close"
            class="close-button"
            v-close-popup
          />
        </div>
        <q-card-section>
          <div class="text-grey text-h6">Treasury Contract</div>
          <div class="row items-center no-wrap" style="position: relative;" v-ripple @click="copyToClipboard(redemptionContract?.treasury_contract_address)">
            <div class="ellipsis text-subtitle q-space">
              {{ redemptionContract?.treasury_contract_address }}
            </div>
            <q-icon name="content_copy" right/>
          </div>
          <div class="row items-center justify-between no-wrap">
            <div>
              <div>Spendable</div>
              <div class="text-weight-medium">{{ denominateBch(parsedTreasuryContractBalance?.spendableBch) }}</div>
            </div>
            <div class="text-right">
              <div>In short position/s</div>
              <div class="text-weight-medium">{{ formatTokenUnits(parsedTreasuryContractBalance?.shortUnitValue) }}</div>
            </div>
          </div>
          <div class="q-mt-sm q-gutter-sm">
            <q-btn
              no-caps label="Short funds"
              color="brandblue"
              @click="() => shortTreasuryContractFunds()"
            />
            <q-btn
              no-caps label="Transfer BCH"
              color="brandblue"
              @click="() => showSendAmountForm = true"
            />
          </div>
          <q-separator spaced />
          <div>
            <div class="row items-center">
              <div class="q-space text-h6">Short positions</div>
              <q-btn flat padding="sm" icon="refresh" @click="() => fetchShortPositions()"/>
            </div>
            <div v-if="fetchingShortPositions" class="text-center">
              <q-spinner color="brandblue" size="2rem"/>
            </div>
            <div v-if="!shortPositions?.length" class="text-grey text-center">
              No short positions
            </div>
            <div
              v-for="shortPosition in shortPositions" :key="shortPosition?.address"
              class="row items-center no-wrap"
            >
              <div class="col-8 ellipsis">
                {{ shortPosition?.address }}
              </div>
              <div class="q-pl-sm q-space text-right">
                <q-btn flat padding="sm" icon="content_copy" @click="() => copyToClipboard(shortPosition?.address)"/>
                <q-btn flat padding="sm" icon="open_in_new" @click="() => openHedgePositionDialog(shortPosition)"/>
              </div>
            </div>
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>
    <SendBCHFormDialog
      v-model="showSendAmountForm"
      title="Enter amount to send"
      :maxSatoshis="parseInt(maxSendableAmount)"
      @ok="sendTreasuryContractBCH"
    />
    <HedgeContractDetailDialog
      v-model="hedgePositionDetailDialog.show"
      :contract="hedgePositionDetailDialog.hedgePosition"
    />
  </q-card>
</template>
<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils';
import { getAssetDenomination } from 'src/utils/denomination-utils';
import { tokenToSatoshis } from 'src/wallet/stablehedge/token-utils';
import { StablehedgeWallet } from 'src/wallet/stablehedge/wallet';
import { getStablehedgeBackend } from 'src/wallet/stablehedge/api';
import { createShortPosition } from 'src/wallet/stablehedge/short-proposal';
import { createTreasuryContractTransaction } from 'src/wallet/stablehedge/transaction';
import stablehedgePriceTracker from 'src/wallet/stablehedge/price-tracker'
import { parseHedgePositionData } from 'src/wallet/anyhedge/formatters';
import { getMnemonic } from 'src/wallet';
import { useQuasar } from 'quasar';
import { useI18n } from 'vue-i18n';
import { useStore } from 'vuex';
import { getCurrentInstance, computed, defineComponent, onMounted, ref, watch, inject, onUnmounted } from 'vue';
import HedgeContractDetailDialog from 'src/components/anyhedge/HedgeContractDetailDialog.vue';
import SendBCHFormDialog from './SendBCHFormDialog.vue';
import TransactionConfirmDialog from './TransactionConfirmDialog.vue';

export default defineComponent({
  name: 'RedemptionContractCard',
  components: {
    SendBCHFormDialog,
    HedgeContractDetailDialog,
  },
  props: {
    redemptionContract: Object,
  },
  setup(props) {
    const instance = getCurrentInstance()

    const $q = useQuasar()
    const { t: $t } = useI18n()
    const $store = useStore()
    const darkMode = computed(() => $store.getters['darkmode/getStatus'])
    const isChipnet = computed(() => $store.getters['global/isChipnet'])
    const denomination = computed(() => $store.getters['global/denomination'])

    const tokenCategory = computed(() => props.redemptionContract?.fiat_token?.category)
    const token = computed(() => $store.getters['stablehedge/token'](tokenCategory.value))
    const priceMessage = computed(() => token.value?.priceMessage)
    const currency = computed(() => token.value?.currency)
    const decimals = computed(() => token.value?.decimals)

    const priceUnitPerBch = computed(() => parseFloat(priceMessage.value?.priceValue))
    const pricePerBch = computed(() =>  priceUnitPerBch.value / 10 ** decimals.value)
    const pricePerDenomination = computed(() => {
      const currentDenomination = denomination.value || 'BCH'
      const conversionRate = parseFloat(getAssetDenomination(currentDenomination, 1)) || 1
      return pricePerBch.value / conversionRate
    })

    const priceTrackerKeyId = `redemption-contract-card-${instance.uid}`
    onMounted(() => updatePriceTrackerSub())
    onUnmounted(() => () => stablehedgePriceTracker.unsubscribe(priceTrackerKeyId))
    watch(() => props.redemptionContract?.fiat_token?.category, () => updatePriceTrackerSub())
    function updatePriceTrackerSub() {
      if (tokenCategory.value) {
        stablehedgePriceTracker.subscribe(priceTrackerKeyId, [tokenCategory.value])
        if (!priceUnitPerBch.value) {
          $store.dispatch(
            'stablehedge/updateTokenPrices',
            { includeCategories: [tokenCategory.value] },
          )
        }
      } else {
        stablehedgePriceTracker.unsubscribe(priceTrackerKeyId)
      }
    }

    const treasuryContract = ref()
    onMounted(() => fetchTreasuryContract())
    watch(
      () => props.redemptionContract?.treasury_contract_address,
      () => fetchTreasuryContract(),
    )
    function fetchTreasuryContract() {
      const address = props.redemptionContract?.treasury_contract_address
      const chipnet = address?.startsWith?.('bchtest:')
      if (!address) return

      const backend = getStablehedgeBackend(chipnet)
      const addressParam = encodeURIComponent(address)
      return backend.get(`stablehedge/treasury-contracts/${addressParam}/`) 
        .then(response => {
          treasuryContract.value = response?.data
          return response
        })
    }

    onMounted(() => fetchTreasuryContractBalance())
    watch(
      () => props.redemptionContract?.treasury_contract_address,
      () => fetchTreasuryContractBalance(),
    )
    const treasuryContractBalance = ref()
    function fetchTreasuryContractBalance() {
      const address = props.redemptionContract?.treasury_contract_address
      if (!address) return

      const backend = getStablehedgeBackend(isChipnet.value)
      return backend.get(`stablehedge/treasury-contracts/${address}/balance/`)
        .then(response => {
          treasuryContractBalance.value = { address, ...response.data}
          return response
        })
    }

    const parsedTreasuryContractBalance = computed(() => {
      if (props.redemptionContract?.treasury_contract_address != treasuryContractBalance.value?.address) return
      const balanceData = treasuryContractBalance.value
      if (!balanceData) return

      const spendableBch = balanceData?.spendable / 10 ** 8
      const shortUnitValue = balanceData?.in_short?.unit_value
      let shortSatoshisValue
      if (priceUnitPerBch.value) {
        shortSatoshisValue = Number(tokenToSatoshis(shortUnitValue, priceUnitPerBch.value))
      }

      const totalShortedBchValue = shortSatoshisValue / 10 ** 8
      const totalBchValue = spendableBch + totalShortedBchValue
      return {
        spendableBch,
        totalShortedBchValue,
        shortUnitValue,
        totalBchValue,
      }
    })

    const summaryData = computed(() => {
      const redeemableBch = (parseInt(props.redemptionContract?.redeemable) || 0) / 10 ** 8
      const totalBchValue = redeemableBch + parsedTreasuryContractBalance.value?.totalBchValue

      const genesisSupply = parseInt(props.redemptionContract?.fiat_token?.genesis_supply)
      const tokensInCirculation = genesisSupply - props.redemptionContract?.reserve_supply
      let expectedBchValue, expectedDiffPctg

      if (Number.isSafeInteger(tokensInCirculation) && Number.isSafeInteger(priceUnitPerBch.value)) {
        expectedBchValue = Number(
          tokenToSatoshis(tokensInCirculation, priceUnitPerBch.value)
        )
        expectedDiffPctg = Math.round((totalBchValue / expectedBchValue) * 100) || 0
      }

      const expectedDiffPctgIcon = {
        name: expectedDiffPctg < 0 ? 'trending_down' : 'trending_up',
        color: expectedDiffPctg < 0 ? 'red' : 'green',
      }

      return {
        totalBchValue,
        tokensInCirculation,
        expectedBchValue,
        expectedDiffPctg,
        expectedDiffPctgIcon,
      }
    })

    onMounted(() => fetchShortPositions())
    watch(
      () => props.redemptionContract?.treasury_contract_address,
      () => fetchShortPositions(),
    )
    const shortPositions = ref([])
    const fetchingShortPositions = ref(false)
    function fetchShortPositions() {
      const params = {
        limit: 20,
        short_address: props.redemptionContract?.treasury_contract_address || '',
        funding: 'complete',
        settled: false,
      }
      const backend = getStablehedgeBackend(isChipnet.value)
      fetchingShortPositions.value = true
      return backend.get(`anyhedge/hedge-positions/`, { params })
        .then(response => {
          Promise.all(response.data.results.map(parseHedgePositionData))
            .then(parsedContracts => shortPositions.value = parsedContracts)
          return response
        })
        .finally(() => {
          fetchingShortPositions.value = false
        })
    }

    const hedgePositionDetailDialog = ref({ show: false, hedgePosition: {} })
    function openHedgePositionDialog(hedgePosition) {
      hedgePositionDetailDialog.value = {
        show: true, hedgePosition: hedgePosition,
      }
    }

    const openDialog = ref(false)
    async function getStablehedgeWallet() {
      const walletIndex = $store.getters['global/getWalletIndex']
      const isChipnet = $store.getters['global/isChipnet']
      const mnemonic = await getMnemonic(walletIndex)
      const wallet = new StablehedgeWallet(
        mnemonic, undefined, isChipnet ? 'chipnet' : 'mainnet',
      )
      return wallet
    }

    async function shortTreasuryContractFunds() {
      const loadingKey = 'short-treasury-contract-funds'
      try {
        const updateLoading = $q.loading.show({ group: loadingKey, delay: 500 })
        if (!treasuryContract.value?.address) await fetchTreasuryContract()
        if (!treasuryContract.value?.address) throw 'No treasury contract'

        const parsedContractData = await createShortPosition({
          wallet: await getStablehedgeWallet(),
          treasuryContract: treasuryContract.value,
          updateLoading: updateLoading,
        })

        $q.dialog({
          component: HedgeContractDetailDialog,
          componentProps: {
            contract: parsedContractData,
          },
        })
        fetchTreasuryContractBalance()
      } catch(error) {
        console.error(error)
        const errorMessage = resolveApiError(error)

        $q.notify({
          type: 'negative',
          message: $t('Error'),
          caption: errorMessage,
          timeout: 5 * 1000,
          actions: [
            { icon: 'close', color: 'white', round: true, handler: () => { /* ... */ } }
          ]
        })
      } finally {
        $q.loading.hide(loadingKey)
      }
    }

    const showSendAmountForm = ref(false)
    const maxSendableAmount = computed(() => {
      const P2PKH_INPUT_SIZE = 32 + 4 + 1 + 1 + 65 + 1 + 33 + 4;
      const P2PKH_OUTPUT_SIZE = 109;
      return treasuryContractBalance.value?.spendable - P2PKH_INPUT_SIZE - P2PKH_OUTPUT_SIZE
    })
    /**
     * @param {{ recipient:String, satoshis:Number }} opts 
     */
    async function sendTreasuryContractBCH(opts) {
      const loadingKey = 'short-treasury-contract-funds'
      try {
        const wallet = await getStablehedgeWallet()
        const treasuryContractData = treasuryContract.value

        // ask from prompt
        const amountSats = opts?.satoshis
        const recipient = opts?.recipient


        let updateLoading = $q.loading.show({ group: loadingKey, delay: 500 })
        const transaction = await createTreasuryContractTransaction({
          locktime: 0,
          wallet: wallet,
          treasuryContract: treasuryContractData,
          recipients: [{ to: recipient, amount: BigInt(amountSats) }],
          updateLoading: updateLoading,
        })

        const txHex = await transaction.build()
        $q.loading.hide(loadingKey)
        const proceed = await new Promise(resolve => {
          $q.dialog({
            component: TransactionConfirmDialog,
            componentProps: {
              transaction: { inputs: transaction.inputs, outputs: transaction.outputs },
            },
          }).onOk(() => resolve(true))
            .onCancel(() => resolve(false))
            .onDismiss(() => resolve(false))
        })
        if (!proceed) return

        updateLoading = $q.loading.show({ group: loadingKey })
        updateLoading({ message: 'Broadcasting transaction' })
        const broadcastResult = await wallet.broadcast(txHex)
        if (broadcastResult.data?.error) {
          throw broadcastResult?.data?.error
        }

        $q.notify({
          type: 'positive',
          message: $t('Success'),
          timeout: 5 * 1000,
          actions: [
            { icon: 'close', color: 'white', round: true, handler: () => { /* ... */ } }
          ]
        })

        fetchTreasuryContractBalance()
      } catch(error) {
        console.error(error)
        let errorMessage = $t('UnknownError')
        if (typeof error === 'string') errorMessage = error
        if (typeof error?.message === 'string') errorMessage = error?.message

        $q.notify({
          type: 'negative',
          message: $t('Error'),
          caption: errorMessage,
          timeout: 5 * 1000,
          actions: [
            { icon: 'close', color: 'white', round: true, handler: () => { /* ... */ } }
          ]
        })
      } finally {
        $q.loading.hide(loadingKey)
      }
    }

    /**
     * @param {import("axios").AxiosError | Error} error
     */
     function resolveApiError(error) {
      let errorMsg = $t('UnknownError')

      if (typeof error?.message === 'string') errorMsg = error?.message
      if (typeof error === 'string') errorMsg = error

      if (typeof error?.response?.data?.detail === 'string') {
        errorMsg = error?.response?.data?.detail
      } else if (typeof error?.response?.data?.non_field_errors?.[0] === 'string') {
        errorMsg = error?.response?.data?.non_field_errors?.[0]
      }
      return errorMsg
    }

    /** ------- <Formatters -------  */
    function denominateBch(amount) {
      const currentDenomination = denomination.value || 'BCH'
      const parsedBCHBalance = getAssetDenomination(currentDenomination, amount)

      if (currentDenomination === $t('DEEM')) {
        const commaBalance = parseFloat(parsedBCHBalance).toLocaleString('en-us', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        })
        return `${commaBalance} ${currentDenomination}`
      }

      return parsedBCHBalance
    }

    function formatTokenUnits(amount) {
      const decimals = parseInt(token.value?.decimals) || 0
      const currency = token.value?.currency || 'UNIT'

      const tokens = amount / 10 ** decimals
      return `${tokens} ${currency}`
    }
    /** ------- Formatters> -------  */

    const $copyText = inject('$copyText')
    function copyToClipboard(value) {
      if (!value) return
      $copyText(value)
      $q.notify({
        color: 'blue-9',
        message: $t('CopiedToClipboard'),
        icon: 'mdi-clipboard-check',
        timeout: 200
      })
    }

    return {
      darkMode, getDarkModeClass,

      denomination,
      currency,
      pricePerDenomination,

      fetchTreasuryContractBalance,
      parsedTreasuryContractBalance,
      treasuryContractBalance,
      summaryData,

      fetchingShortPositions,
      shortPositions,
      fetchShortPositions,
      hedgePositionDetailDialog,
      openHedgePositionDialog,

      openDialog,
      shortTreasuryContractFunds,
      showSendAmountForm,
      maxSendableAmount,
      sendTreasuryContractBCH,

      denominateBch,
      formatTokenUnits,
      copyToClipboard,
    }
  },
})
</script>

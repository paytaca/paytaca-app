<template>
  <q-dialog
    ref="dialogRef"
    v-model="innerVal"
    @hide="onDialogHide"
    full-width
    position="bottom"
    :seamless="showSendAmountForm"
  >
    <q-card
      class="br-15 pt-card-2 text-bow"
      :class="getDarkModeClass(darkMode)"
    >
      <div class="row no-wrap items-center justify-center q-pl-md q-pr-sm q-pt-sm">
        <div class="text-h6 q-space q-mt-sm">
          {{ $t('TreasuryContract') }}
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
        <div
          class="row items-center no-wrap" style="position: relative;"
          v-ripple @click="copyToClipboard(treasuryContract?.address)"
        >
          <div class="text-subtitle q-space" style="overflow-x:auto;">
            {{ treasuryContract?.address }}
          </div>
          <q-icon name="content_copy" right/>
        </div>
        <div
          class="row items-center no-wrap"
          style="position: relative;" v-ripple
          @click="copyToClipboard(toTokenAddressSafe(treasuryContract?.address))"
        >
          <div class="text-subtitle q-space" style="overflow-x:auto;">
            {{ toTokenAddressSafe(treasuryContract?.address) }}
          </div>
          <q-icon name="content_copy" right/>
        </div>
        <div class="row items-center justify-between no-wrap q-mt-sm">
          <div>
            <div>{{ $t('Spendable') }}</div>
            <div class="text-weight-medium">{{ denominateBch(parsedTreasuryContractBalance?.spendableBch) }}</div>
          </div>
          <div class="text-right">
            <div>{{ $t('InShortPositions') }}</div>
            <div class="text-weight-medium">{{ formatTokenUnits(parsedTreasuryContractBalance?.shortUnitValue) }}</div>
          </div>
        </div>
        <q-separator spaced />
        <div>
          <div class="row items-center">
            <div class="q-space text-h6">{{ $t('ShortPositions') }}</div>
            <q-btn flat padding="sm" icon="refresh" @click="() => fetchShortPositions()"/>
          </div>
          <div v-if="fetchingShortPositions" class="text-center">
            <q-spinner color="brandblue" size="2rem"/>
          </div>
          <div v-if="!shortPositions?.length" class="text-grey text-center">
            {{ $t('NoShortPositions') }}
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
        <div v-if="hasAuthToken" class="q-mt-sm q-gutter-sm">
          <q-btn
            no-caps :label="$t('TransferBCH')"
            color="brandblue"
            @click="() => showSendAmountForm = true"
          />
        </div>
      </q-card-section>
    </q-card>
    <HedgeContractDetailDialog
      v-model="hedgePositionDetailDialog.show"
      :contract="hedgePositionDetailDialog.hedgePosition"
    />
    <SendBCHFormDialog
      v-model="showSendAmountForm"
      :title="$t('EnterAmount')"
      :maxSatoshis="parseInt(maxSendableAmount)"
      @ok="sendTreasuryContractBCH"
    />
  </q-dialog>
</template>
<script>
import { getAssetDenomination } from 'src/utils/denomination-utils';
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils';
import { toTokenAddress } from 'src/utils/crypto';
import { createTreasuryContractTransaction } from 'src/wallet/stablehedge/transaction';
import { StablehedgeWallet } from 'src/wallet/stablehedge/wallet';
import { getStablehedgeBackend } from 'src/wallet/stablehedge/api';
import { parseHedgePositionData } from 'src/wallet/anyhedge/formatters';
import { getMnemonic } from 'src/wallet';
import { useDialogPluginComponent, useQuasar } from 'quasar'
import { useI18n } from 'vue-i18n';
import { useStore } from 'vuex';
import { computed, defineComponent, inject, onMounted, ref, watch } from 'vue'
import HedgeContractDetailDialog from 'src/components/anyhedge/HedgeContractDetailDialog.vue';
import SendBCHFormDialog from './SendBCHFormDialog.vue';
import TransactionConfirmDialog from './TransactionConfirmDialog.vue';
import { tokenToSatoshis } from 'src/wallet/stablehedge/token-utils';

export default defineComponent({
  name: 'CustomPaytacaDialog',
  components: {
    SendBCHFormDialog,
    HedgeContractDetailDialog,
  },
  emits: [
    'update:modelValue',
    ...useDialogPluginComponent.emits,
  ],
  props: {
    modelValue: Boolean,
    treasuryContract: {
      /** @returns {import("src/wallet/stablehedge/interfaces").TreasuryContractApiData} */
      default: () => {},
    },
    redemptionContractData: {
      /** @returns {import("src/wallet/stablehedge/interfaces").RedemptionContractApiData} */
      default: () => {},
      required: false,
    },
  },
  setup(props, { emit: $emit }) {
    const { t: $t } = useI18n();
    const $q = useQuasar();
    const $store = useStore();
    const darkMode = computed(() => $store.getters['darkmode/getStatus'])
    const { dialogRef, onDialogCancel, onDialogHide, onDialogOK } = useDialogPluginComponent()
    const innerVal = ref(props.modelValue)
    watch(() => [props.modelValue], () => innerVal.value = props.modelValue)
    watch(innerVal, () => $emit('update:modelValue', innerVal.value))

    const isChipnet = computed(() => {
      return Boolean(props.treasuryContract.address?.startsWith('bchtest:'))
    })
    const denomination = computed(() => $store.getters['global/denomination'])

    const treasuryContract = computed(() => props.treasuryContract)
    const redemptionContract = ref(Object.assign({}, props.redemptionContractData))
    watch(
      () => [treasuryContract.value?.redemption_contract_address],
      () => fetchRedemptionContract(),
    )
    function fetchRedemptionContract(opts = { force: false }) {
      const address = treasuryContract.value?.redemption_contract_address
      if (!address) return

      if (address == props.redemptionContractData?.address && !opts?.force) {
        redemptionContract.value = props.redemptionContractData
        return
      }

      const backend = getStablehedgeBackend(isChipnet.value)
      const addressParam = encodeURIComponent(address)
      return backend.get(`stablehedge/redemption-contracts/${addressParam}/`)
        .then(response => {
          redemptionContract.value = response?.data
          return response
        })
    }

    const tokenCategory = computed(() => redemptionContract.value?.fiat_token?.category)
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


    onMounted(() => fetchTreasuryContractBalance())
    watch(
      () => treasuryContract.value?.address,
      () => fetchTreasuryContractBalance(),
    )
    const treasuryContractBalance = ref()
    function fetchTreasuryContractBalance() {
      const address = treasuryContract.value?.address
      if (!address) return

      const backend = getStablehedgeBackend(isChipnet.value)
      return backend.get(`stablehedge/treasury-contracts/${address}/balance/`)
        .then(response => {
          treasuryContractBalance.value = { address, ...response.data}
          return response
        })
    }


    const parsedTreasuryContractBalance = computed(() => {
      if (treasuryContract.value?.address != treasuryContractBalance.value?.address) return
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

    onMounted(() => lazyFetchShortPositions())
    watch(() => treasuryContract.value?.address,
      () => {
        fetchedShortPositions.value = false
        lazyFetchShortPositions()
      },
    )
    watch(() => innerVal.value, () => lazyFetchShortPositions())
    const shortPositions = ref([])
    const fetchedShortPositions = ref(false)
    const fetchingShortPositions = ref(false)
    function lazyFetchShortPositions() {
      if (!innerVal.value || fetchedShortPositions.value) return
      return fetchShortPositions()
    }
    function fetchShortPositions() {
      const params = {
        limit: 20,
        short_address: treasuryContract.value?.address || '',
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
          fetchedShortPositions.value = true
          fetchingShortPositions.value = false
        })
    }

    const hedgePositionDetailDialog = ref({ show: false, hedgePosition: {} })
    function openHedgePositionDialog(hedgePosition) {
      hedgePositionDetailDialog.value = {
        show: true, hedgePosition: hedgePosition,
      }
    }
    
    async function getStablehedgeWallet() {
      const walletIndex = $store.getters['global/getWalletIndex']
      const isChipnet = $store.getters['global/isChipnet']
      const mnemonic = await getMnemonic(walletIndex)
      const wallet = new StablehedgeWallet(
        mnemonic, undefined, isChipnet ? 'chipnet' : 'mainnet',
      )
      return wallet
    }

    /** @type {import("vue").Ref<import("src/wallet/stablehedge/wallet").WatchtowerUtxo>} */
    const authTokenUtxo = ref()
    const hasAuthToken = computed(() => {
      if (!authTokenUtxo.value?.tokenid) return false
      return authTokenUtxo.value?.tokenid === treasuryContract.value?.auth_token_id
    })
    onMounted(() => getAuthTokenUtxo())
    watch(() => [treasuryContract.value?.auth_token_id], () => getAuthTokenUtxo())
    async function getAuthTokenUtxo() {
      const authTokenId = treasuryContract.value?.auth_token_id
      if (!authTokenId) authTokenUtxo.value = null

      const wallet = await getStablehedgeWallet()
      const utxos = await wallet.getUtxos(authTokenId, true)
      authTokenUtxo.value = utxos[0]
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
        updateLoading({ message: $t('BroadcastingTransaction') })
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

    function toTokenAddressSafe(address) {
      try {
        return toTokenAddress(address)
      } catch (error) {
        console.error(error)
      }
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
      dialogRef, onDialogCancel, onDialogHide, onDialogOK,
      innerVal,

      redemptionContract,
      parsedTreasuryContractBalance,

      fetchingShortPositions,
      shortPositions,
      fetchShortPositions,
      hedgePositionDetailDialog,
      openHedgePositionDialog,

      authTokenUtxo,
      hasAuthToken,

      showSendAmountForm,
      maxSendableAmount,
      sendTreasuryContractBCH,

      denominateBch,
      formatTokenUnits,
      toTokenAddressSafe,
      copyToClipboard,
    }
  }
})
</script>

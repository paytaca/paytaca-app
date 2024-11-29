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
    <q-dialog v-model="openDialog">
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
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-card>
</template>
<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils';
import { getAssetDenomination } from 'src/utils/denomination-utils';
import { tokenToSatoshis } from 'src/wallet/stablehedge/token-utils';
import { getStablehedgeBackend } from 'src/wallet/stablehedge/api';
import stablehedgePriceTracker from 'src/wallet/stablehedge/price-tracker'
import { useQuasar } from 'quasar';
import { useI18n } from 'vue-i18n';
import { useStore } from 'vuex';
import { getCurrentInstance, computed, defineComponent, onMounted, ref, watch, inject, onUnmounted } from 'vue';
import { getMnemonic } from 'src/wallet';
import { StablehedgeWallet } from 'src/wallet/stablehedge/wallet';

export default defineComponent({
  name: 'RedemptionContractCard',
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
      return backend.get(`stablehedge/treasury-contract/${address}/`) 
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

      openDialog,

      denominateBch,
      formatTokenUnits,
      copyToClipboard,
    }
  },
})
</script>

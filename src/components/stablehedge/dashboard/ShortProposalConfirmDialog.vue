<template>
  <q-dialog
    ref="dialogRef"
    v-model="innerVal"
    @hide="onDialogHide"
    full-width
    position="bottom"
  >
    <q-card
      class="br-15 pt-card-2 text-bow"
      :class="getDarkModeClass(darkMode)"
    >
      <div class="row no-wrap items-center justify-center q-pl-md q-pr-sm q-pt-sm">
        <div class="text-h6 q-space q-mt-sm">
          Short Proposal
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
        <q-tabs v-model="tab" class="q-mb-md">
          <q-tab v-for="tabOpts in tabs" v-bind="tabOpts"/>
        </q-tabs>
        <q-tab-panels v-model="tab" animated class="pt-card-2" :class="getDarkModeClass(darkMode)">
          <q-tab-panel name="contract" class="q-pa-none">
            <div class="text-h6 q-mb-sm">
              <q-badge class="float-right">
                {{ contractSummaryData?.lowLiquidationPriceMultiplier }}x
                -
                {{ contractSummaryData?.highLiquidationPriceMultiplier }}x
              </q-badge>
              <div>{{ formatTokenUnits(contractSummaryData?.nominalUnits) }}</div>
              <div class="text-body1 q-r-mt-sm">
                {{ denominateBch(contractSummaryData?.bchValue) }}
              </div>
            </div>
            <div class="ellipsis q-mb-sm">{{ shortProposal?.contract_data?.address }}</div>
            <div class="row items-center q-gutter-sm q-mb-sm">
              <div class="q-space">
                <div class="text-grey">Short</div>
                <div>{{ denominateSats(contractSummaryData?.shortInputSats) }}</div>
              </div>
              <div class="q-space">
                <div class="text-grey">Long</div>
                <div>{{ denominateSats(contractSummaryData?.longInputSats) }}</div>
              </div>
            </div>
          </q-tab-panel>
          <q-tab-panel name="funding" class="q-pa-none">
            <q-banner class="pt-card q-mb-sm" :class="getDarkModeClass(darkMode)" rounded>
              <div class="text-body1">Complete proposal before expiration</div>
              <div class="text-body2">
                {{ expirationEta < 0 ? 'Expired' : 'Expires' }}
                {{ formatDate(fundingData?.fundBefore) }}
              </div>
            </q-banner>

            <div class="text-subtitle1">{{ $t('Amount') }}</div>
            <div class="row items-center q-gutter-sm text-subtitle2">
              <div class="q-space">
                <div class="text-grey">Short</div>
                <div>{{ denominateSats(fundingData?.shortInputSats) }}</div>
              </div>
              <div class="q-space">
                <div class="text-grey">Long</div>
                <div>{{ denominateSats(fundingData?.longInputSats) }}</div>
              </div>
            </div>
            <q-separator spaced/>
            <div class="text-subtitle1">{{ $t('Fees') }}</div>
            <div v-for="fee in fundingData?.fees" class="row items-center text-subtitle2">
              <div>{{ fee?.name }}</div>
              <q-space/>
              <div>{{ denominateSats(fee?.satoshis) }}</div>
            </div>
            <div class="row items-center text-subtitle2">
              <div>{{ $t('NetworkFee') }}</div>
              <q-space/>
              <div>{{ denominateSats(fundingData.networkFee) }}</div>
            </div>
            <div class="text-h5 row items-center">
              <div>{{ $t('Total') }}</div>
              <q-space/>
              <div>{{ denominateSats(fundingData.totalSats) }}</div>
            </div>
          </q-tab-panel>
        </q-tab-panels>
      </q-card-section>
      <q-card-actions class="justify-around">
        <q-btn
          no-caps
          padding="xs md"
          color="grey"
          flat
          rounded
          :label="$t('Reject')"
          class="col-5"
          @click="onDialogCancel"
        />
        <q-btn
          :disable="tab !== 'funding'"
          no-caps
          rounded
          padding="xs md"
          color="brandblue"
          :label="$t('Accept')"
          class="col-5"
          @click="onDialogOK"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>
<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils';
import { getAssetDenomination } from 'src/utils/denomination-utils';
import ago from 's-ago'
import { useDialogPluginComponent } from 'quasar'
import { useI18n } from 'vue-i18n';
import { useStore } from 'vuex';
import { computed, defineComponent, ref, watch } from 'vue'

export default defineComponent({
  name: 'CustomPaytacaDialog',
  emits: [
    'update:modelValue',
    ...useDialogPluginComponent.emits,
  ],
  props: {
    modelValue: Boolean,
    tokenCategory: String,
    shortProposal: {
      /** @returns {import("src/wallet/stablehedge/interfaces").ShortProposalData} */
      default: () => {},
    },
  },
  setup(props, { emit: $emit }) {
    const { t: $t } = useI18n();
    const $store = useStore();
    const darkMode = computed(() => $store.getters['darkmode/getStatus'])
    const { dialogRef, onDialogCancel, onDialogHide, onDialogOK } = useDialogPluginComponent()
    const innerVal = ref(props.modelValue)
    watch(() => [props.modelValue], () => innerVal.value = props.modelValue)
    watch(innerVal, () => $emit('update:modelValue', innerVal.value))

    const denomination = computed(() => $store.getters['global/denomination'])
    const token = computed(() => $store.getters['stablehedge/token']?.(props.tokenCategory))

    const tab = ref('contract')
    const tabs = ref([
      { noCaps: false, label: 'Contract', name: 'contract' },
      { noCaps: false, label: 'Funding', name: 'funding' },
    ])

    const contractSummaryData = computed(() => {
      const contractData = props.shortProposal?.contract_data
      const nominalUnits = contractData?.metadata?.nominalUnits
      const startPrice = parseInt(contractData?.metadata?.startPrice)
      
      return {
        nominalUnits: nominalUnits,
        bchValue: nominalUnits / startPrice,
        shortInputSats: contractData?.metadata?.shortInputInSatoshis,
        longInputSats: contractData?.metadata?.longInputInSatoshis,
        
        lowLiquidationPriceMultiplier: contractData?.metadata?.lowLiquidationPriceMultiplier,
        highLiquidationPriceMultiplier: contractData?.metadata?.highLiquidationPriceMultiplier,
      }
    })
    
    const fundingData = computed(() => {
      const contractData = props.shortProposal?.contract_data
      const fundingAmounts = props.shortProposal?.funding_amounts
      const shortInputSats = contractData?.metadata?.shortInputInSatoshis
      const longInputSats = contractData?.metadata?.longInputInSatoshis

      const totalSats = fundingAmounts?.satoshis_to_fund

      const fees = [...contractData?.fees]
      if (!contractData?.fees?.length) {
        fees.push({
          name: 'Liquidity premium',
          satoshis: fundingAmounts.liquidity_fee,
        })
        fees.push({
          name: 'Settlement Service Fee',
          satoshis: fundingAmounts.settlement_service_fee,
        })
      }

      const totalFees = fees.reduce((subtotal, fee) => subtotal + parseInt(fee.satoshis), 0)
      const networkFee = totalSats - shortInputSats - totalFees

      const fundBefore = new Date(fundingAmounts.recalculate_after * 1000)

      return {
        shortInputSats,
        longInputSats,
        totalFees,
        fees,
        networkFee,
        totalSats,
        fundBefore,
      }
    })

    const expirationEta = computed(() => {
      return fundingData.value?.fundBefore - Date.now()
    })

    function denominateSats(satoshis) {
      return denominateBch(satoshis / 10 ** 8)
    }
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


    function formatDate (date) {
      return ago(new Date(date))
    }

    return {
      darkMode, getDarkModeClass,
      dialogRef, onDialogCancel, onDialogHide, onDialogOK,
      innerVal,

      tab,
      tabs,
      contractSummaryData,
      fundingData,
      expirationEta,

      denominateSats,
      denominateBch,
      formatTokenUnits,

      formatDate,
    }
  }
})
</script>
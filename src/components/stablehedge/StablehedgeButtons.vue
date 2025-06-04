<template>
  <div>
    <div class="q-mr-md">
      <q-btn class="button-default" no-caps round style="padding: 20px;" @click.stop="() => openFreezeDialog()">
        <q-icon class="icon-default" size="30px" name="ac_unit"/> <br>                              
      </q-btn>
    <div class="q-pt-sm">{{ $t('Freeze') }}</div>
    </div>    
    <div class="q-ml-md">
      <q-btn class="button-default" round style="padding: 20px;" @click.stop="() => openUnfreezeDialog()">
        <q-icon class="icon-default" size="30px" name="img:ui-revamp/unfreeze.svg"/>                
      </q-btn>  
    <div class="q-pt-sm">{{ $t('Unfreeze') }}</div>
  </div>
    <!-- <q-btn
      rounded
      padding="2px 10px"
      no-caps :label="$t('Freeze')"
      class="q-mr-sm"
      :color="$q.dark.isActive ? 'grey' : 'grey-4'"
      :text-color="$q.dark.isActive ? '' : 'grey-8'"
      @click.stop="() => openFreezeDialog()"
    />

    <q-btn
      rounded
      padding="2px 10px"
      no-caps :label="$t('Unfreeze')"
      class="q-mr-sm"
      :color="$q.dark.isActive ? 'teal' : 'teal-2'"
      :text-color="$q.dark.isActive ? '' : 'teal-9'"
      @click.stop="() => openUnfreezeDialog()"
    /> -->

    <DepositFormDialog
      v-model="depositFormDialog.show"
      :redemptionContract="depositFormDialog.redemptionContract"
      :selectedDenomination="selectedDenomination"
      @ok="deposit"
    />
    <RedeemFormDialog
      v-model="redeemFormDialog.show"
      :redemptionContracts="redeemFormDialog.redemptionContracts"
      :selectedDenomination="selectedDenomination"
      @ok="redeem"
    />
  </div>
</template>
<script>
import { getStablehedgeBackend } from 'src/wallet/stablehedge/api';
import { useQuasar } from 'quasar';
import { useI18n } from 'vue-i18n';
import { useStore } from 'vuex';
import { ref, computed, watch, defineComponent } from 'vue';

import DepositFormDialog from './DepositFormDialog.vue';
import RedeemFormDialog from './RedeemFormDialog.vue';
import DepositDialog from './DepositDialog.vue';
import RedeemDialog from './RedeemDialog.vue';

export default defineComponent({
  name: 'StablehedgeButtons',
  components: {
    DepositFormDialog,
    RedeemFormDialog,
  },
  emits: [
    'deposit',
    'redeem',
  ],
  props: {
    selectedDenomination: String,
  },
  setup(props, { emit: $emit }) {
    const { t: $t } = useI18n()
    const $q = useQuasar();
    const $store = useStore();
    const darkMode = computed(() => $store.getters['darkmode/getStatus'])

    const isChipnet = computed(() => $store.getters['global/isChipnet'])
    watch(isChipnet, () => backend = getStablehedgeBackend(isChipnet.value))
    let backend = getStablehedgeBackend(isChipnet.value)

    window.test = () => $q.notify({
      message: 'Test',
      timeout: 20 * 1000,
      actions: [
        { icon: 'close', color: 'white', round: true, handler: () => {} }
      ]
    })

    const selectedMarketCurrency = computed(() => {
      const currency = $store.getters['market/selectedCurrency']
      return currency?.symbol
    })

    const tokenBalancesWithSats = computed(() => $store.getters['stablehedge/tokenBalancesWithSats'])

    const redeemFormDialog = ref({
      show: false,
      redemptionContracts: [],
    })
    const depositFormDialog = ref({
      show: false,
      redemptionContract: null,
    })
    async function openUnfreezeDialog() {
      const { redemptionContracts } = (await getContractsForUnfreeze())
      redeemFormDialog.value.show = true
      redeemFormDialog.value.redemptionContracts = redemptionContracts
    }

    async function openFreezeDialog() {
      const { contract } = (await findContractForFreeze())
      depositFormDialog.value.show = true
      depositFormDialog.value.redemptionContract = contract
    }

    async function findContractForFreeze() {
      const loadingKey = 'stablehedge-freeze-search'
      try {
        const updateLoading = $q.loading.show({ group: loadingKey, delay: 500 })
        const currencies = [
          selectedMarketCurrency.value,
          'USD',
          ...tokenBalancesWithSats.value.map(tokenBalance => tokenBalance?.currency)
        ].filter(Boolean)
          .filter((element, index, list) => list.indexOf(element) === index)
  
        const params = {
          has_treasury_contract: true,
          currencies: currencies.join(','),
          verified: true,
        }

        updateLoading({ message: $t('SearchingForContracts') })
        const response = await backend.get('stablehedge/redemption-contracts/', { params })
        const redemptionContracts = Array.isArray(response.data)
          ? response.data
          : response.data?.results

        let contract = redemptionContracts.find(contract => {
          return contract?.fiat_token?.currency === selectedMarketCurrency.value
        })
        if (!contract) {
          contract = redemptionContracts?.[0]
        }
        if (!contract) {
          delete params.currencies
          const response = await backend.get('stablehedge/redemption-contracts/', { params })
          const redemptionContracts = Array.isArray(response.data)
            ? response.data
            : response.data?.results
          contract = redemptionContracts?.[0]
        }
        if (!contract) throw $t('NoContractFound')

        updateLoading({ message: $t('GettingPriceData') })
        const category = contract?.fiat_token?.category
        await $store.dispatch('stablehedge/updateTokenPrices', { includeCategories: [category] })

        const token = $store.getters['stablehedge/token']?.(category)
        const priceValue = token?.priceMessage?.priceValue
        if (!Number.isFinite(priceValue)) throw $t('NoPriceDataFound')

        return { contract }
      } catch(error) {
        console.error(error)
        let message = $t('UnableToGetContractDetails')
        if (typeof error === 'string') message = error
        if (typeof error?.message === 'string') message = error?.message
        $q.notify({
          type: 'negative',
          message: message,
        })
      } finally {
        $q.loading.hide(loadingKey)
      }
    }

    async function getContractsForUnfreeze() {
      const loadingKey = 'stablehedge-unfreeze-search'
      try {
        const updateLoading = $q.loading.show({ group: loadingKey, delay: 500 })
        const tokenBalances = $store.getters['stablehedge/tokenBalances']
        const categories = tokenBalances.map(balance => balance.category)
          .filter((element, index, list) => list.indexOf(element) === index)

        if (!categories.length) throw $t('NoRedeemableTokens')

        const params = {
          categories: categories.join(','),
        }

        updateLoading({ message: $t('FetchingContracts') })
        const response = await backend.get('stablehedge/redemption-contracts/', { params })
        const redemptionContracts = Array.isArray(response.data)
          ? response.data
          : response.data?.results

        updateLoading({ message: $t('GettingPriceData') })
        await $store.dispatch('stablehedge/updateTokenPrices', { includeCategories: categories })

        if (Array.isArray(categories) && categories.length) {
          const hasPriceData = categories.some(category => {
            const token = $store.getters['stablehedge/token']?.(category)
            return Number.isFinite(parseFloat(token?.priceMessage?.priceValue))
          })

          if (!hasPriceData) throw $t('NoPriceDataFound')
        }

        return { redemptionContracts }
      } catch(error) {
        console.error(error)
        let message = $t('UnableToGetContractDetails')
        if (typeof error === 'string') message = error
        if (typeof error?.message === 'string') message = error?.message
        $q.notify({
          type: 'negative',
          message: message,
        })
      } finally {
        $q.loading.hide(loadingKey)
      }
    }

    /**
     * @typedef {Object} RedemptionContractTransactionParams
     * @property {Number} tokenUnits
     * @property {Object} redemptionContract
     * @property {Object} priceMessage
     */
    /**
     * @param {RedemptionContractTransactionParams} opts
     */
     function deposit(opts) {
      $q.dialog({
        component: DepositDialog,
        componentProps: {
          tokenUnits: opts?.tokenUnits,
          redemptionContract: opts?.redemptionContract,
          priceMessage: opts?.priceMessage,
          selectedDenomination: props.selectedDenomination,
        },
      }).onOk(result => {
        /** @type {import('quasar').QNotifyCreateOptions} */
        const notifyOpts = {
          timeout: 20 * 1000,
          actions: [
            { icon: 'close', color: 'white', round: true, handler: () => {} }
          ]
        }

        notifyOpts.message = result?.resultMessage
        if (result?.status === 'success') {
          notifyOpts.type = 'positive'
          notifyOpts.icon = 'check_circle'
          notifyOpts.message = notifyOpts.message || $t('Success')
          $emit('deposit', [result])
        } else if (result?.status === 'failed') {
          notifyOpts.type = 'negative'
          notifyOpts.icon = 'error'
        } else {
          notifyOpts.icon = 'pending'
          $emit('deposit', [result])
        }
        $q.notify(notifyOpts)
      })
    }

    /**
     * @param {RedemptionContractTransactionParams[]} opts 
     */
    function redeem(opts) {
      $q.dialog({
        component: RedeemDialog,
        componentProps: {
          selectedDenomination: props.selectedDenomination,
          redeemOpts: [
            ...opts,
          ],
        }
      }).onOk(results => {
        console.log(results)
        const successResults = results
          ?.filter(result => result?.success && result?.txData?.status !== 'failed')
          .map(result => result?.txData)
        const errors = results?.filter?.(result => !result?.success || result?.txData?.status === 'failed')
        const errorMessage = errors.reduce((msg, error) => {
          if (error?.txData?.resultMessage) return error?.txData?.resultMessage
          if (error?.error) return error?.error
          return msg
        }, '')

        /** @type {import('quasar').QNotifyCreateOptions} */
        const notifyOpts = {
          timeout: 20 * 1000,
          actions: [
            { icon: 'close', color: 'white', round: true, handler: () => {} }
          ]
        }

        if (successResults?.length && errorMessage) {
          notifyOpts.type = 'info'
          notifyOpts.icon = 'rule'
          notifyOpts.message = $t('PartiallyRedeemed')
          notifyOpts.caption = errorMessage
        } else if (successResults?.length && !errorMessage) {
          notifyOpts.type = 'positive'
          notifyOpts.icon = 'check_circle'
          notifyOpts.message = $t('Success')
          notifyOpts.caption = successResults.find(txData => txData?.resultMessage)?.resultMessage || ''
        } else if (!successResults?.length && errorMessage) {
          notifyOpts.type = 'negative'
          notifyOpts.icon = 'error'
          notifyOpts.message = errorMessage
        }

        if (notifyOpts.message) $q.notify(notifyOpts)

        if (successResults?.length) $emit('redeem', successResults)
      })
    }

    return {
      darkMode,
      
      redeemFormDialog,
      depositFormDialog,
      openUnfreezeDialog,
      openFreezeDialog,

      findContractForFreeze,

      deposit,
      redeem,
    }
  }
})
</script>
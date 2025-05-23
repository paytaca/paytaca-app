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
        </div>
        <q-btn
          flat
          padding="sm"
          icon="close"
          class="close-button"
          v-close-popup
        />
      </div>
      <q-card-section class="q-pt-none">
        <div
          class="text-center" :class="[loading ? 'text-grey' : '']"
          style="max-height:75vh; overflow-y:auto;"
        >
          <div class="text-h5 q-mb-sm text-uppercase">{{ $t('Unfreeze') }}</div>
          <div
            v-for="(opts, index) in parsedRedeemOpts" :key="index"
            class="row items-center justify-center no-wrap"
          >
            <div class="text-h5 col-5">
              {{ opts?.tokenAmount }} {{  opts?.currency }}
            </div>
            <template v-if="parsedRedeemOpts?.length > 1">
              <q-icon name="arrow_forward" color="grey" class="col-1"/>
              <div class="text-h5 col-5">{{ opts?.bch }} {{ denomination }}</div>
            </template>
          </div>

          <div class="text-h6 text-grey q-my-md">{{ $t('To') }}</div>
          <div class="text-h5">{{ totalDenominatedAmount }} {{ denomination }}</div>
        </div>
        <div class="text-center">
          <div v-if="loading" class="q-my-md">
            <ProgressLoader/>
            <div class="text-subtitle1 q-r-mt-lg">{{ loadingMsg }}</div>
          </div>
        </div>
      </q-card-section>
      <DragSlide v-if="!loading" disable-absolute-bottom @swiped="securityCheck"/>
    </q-card>
  </q-dialog>
</template>
<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils';
import { getAssetDenomination } from 'src/utils/denomination-utils';
import { StablehedgeWallet } from 'src/wallet/stablehedge/wallet';
import { tokenToSatoshis } from 'src/wallet/stablehedge/token-utils';
import { prepareUtxos, waitRedemptionContractTx } from 'src/wallet/stablehedge/transaction'
import { getMnemonic } from 'src/wallet';
import { binToHex } from '@bitauth/libauth';
import { useDialogPluginComponent, useQuasar } from 'quasar'
import { useI18n } from 'vue-i18n';
import { useStore } from 'vuex';
import { computed, defineComponent, ref, watch } from 'vue'
import DragSlide from 'src/components/drag-slide.vue';
import SecurityCheckDialog from 'src/components/SecurityCheckDialog.vue';
import ProgressLoader from 'src/components/ProgressLoader.vue';


export default defineComponent({
  name: 'RedeemDialog',
  components: {
    DragSlide,
    ProgressLoader,
  },
  emits: [
    'update:modelValue',
    ...useDialogPluginComponent.emits,
  ],
  props: {
    modelValue: Boolean,
    selectedDenomination: String,
    redeemOpts: {
      // for type annotation
      default: () => {
        return [].map(() => {
          return {
            tokenUnits: Number(),
            redemptionContract: {},
            priceMessage: {},
          }
        })
      }
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

    async function getStablehedgeWallet() {
      const walletIndex = $store.getters['global/getWalletIndex']
      const isChipnet = $store.getters['global/isChipnet']
      const mnemonic = await getMnemonic(walletIndex)
      const wallet = new StablehedgeWallet(
        mnemonic, undefined, isChipnet ? 'chipnet' : 'mainnet',
      )
      return wallet
    }


    const denomination = computed(() => {
      return props.selectedDenomination || $store.getters['global/denomination'] || 'BCH'
    })
    const denominationPerBchRate = computed(() => {
      const currentDenomination = denomination.value || 'BCH'
      return parseFloat(getAssetDenomination(currentDenomination, 1)) || 1
    })
    const redeemOpts = computed(() => {
      return [
        ...props.redeemOpts,
        // ...props.redeemOpts,
      ]
    })

    const parsedRedeemOpts = computed(() => {
      return redeemOpts.value.map(opts => {
        const tokenUnits = parseInt(opts?.tokenUnits)
        const redemptionContract = opts?.redemptionContract
        const fiatToken = redemptionContract?.fiat_token
        const priceMessage = opts?.priceMessage
        
        const currency = fiatToken?.currency
        const category = fiatToken?.category

        const decimals = parseInt(fiatToken?.decimals) || 0
        const priceValue = priceMessage?.priceValue

        const tokenAmount = tokenUnits / 10 ** decimals
        const satoshis = Number(tokenToSatoshis(tokenUnits, priceValue))
        const bch = satoshis / 10 ** 8
        const denominatedBch = bch * denominationPerBchRate.value
        return {
          redemptionContract,
          priceMessage,

          currency,
          category,

          tokenUnits,
          tokenAmount,
          satoshis,
          bch,
          denominatedBch,
        }
      })
    })
  
    const totalDenominatedAmount = computed(() => {
      const totalSatoshis = parsedRedeemOpts.value.reduce((subtotal, opts) => {
        return subtotal + opts?.satoshis
      }, 0)
      const totalBch = totalSatoshis / 10 ** 8
      return totalBch * denominationPerBchRate.value
    })

    function securityCheck(resetSwipe=() => {}) {
      $q.dialog({
        component: SecurityCheckDialog,
      })
        .onOk(() => startRedeem())
        .onCancel(() => resetSwipe?.())
    }

    const loadingMsg = ref('')
    const loading = ref(false)
    async function startRedeem() {
      const redeemOpts = [...parsedRedeemOpts.value]
      try {
        loading.value = true
        const wallet = await getStablehedgeWallet()
        const locktime = await wallet.getBlockheight()

        loadingMsg.value = $t('PreparingFunds')
        const prepareResult = await prepareUtxos({
          wallet, locktime,
          amounts: redeemOpts.map(opts => {
            return {
              satoshis: 1000,
              category: opts.category,
              tokenAmount: opts.tokenUnits,
            }
          }),
        })
        console.log({ prepareResult })

        if (!prepareResult.success) {
          let message = prepareResult.error
          if (message === 'insufficient-tokens') {
            const token = $store.getters['stablehedge/token'](prepareResult.category)
            message = $t('InsufficientCurrencyBalance', { currency: token?.currency })
          }
          throw message
        }

        loadingMsg.value = $t('SigningData')
        const signResults = await signRedeemUtxos({
          wallet, locktime,
          utxos: prepareResult.utxos,
          satoshis: redeemOpts.map(opts => opts.satoshis),
        })
        console.log({ signResults })

        if (prepareResult.transaction) {
          const broadcastResult = await wallet.broadcast(prepareResult.transaction)
          if (broadcastResult.data?.error) {
            throw broadcastResult?.data?.error || $t('ErrorPreparingFunds')
          }
        }

        loadingMsg.value = $t('CreatingTransaction')
        const redeemPromises = redeemOpts.map((opts, index) => {
          const utxo = prepareResult.utxos[index]
          const signResult = signResults[index]
          return redeem({
            wallet,
            redemptionContract: opts?.redemptionContract,
            priceMessage: opts?.priceMessage,
            utxo: {    
              txid: utxo?.txid,
              vout: utxo?.vout,
              satoshis: utxo?.value,
              category: utxo?.tokenid,
              amount: utxo?.amount,
              locking_bytecode: binToHex(signResult.output.lockingBytecode),
              unlocking_bytecode: binToHex(signResult.input.unlockingBytecode),
            },
          })
        })

        const results = await Promise.allSettled(redeemPromises)
        console.log({ results })
        const parsedResults = results.map(result => {
          const success = result.status === 'fulfilled' && Boolean(result?.value?.id)
          return {
            success: success,
            error: success ? undefined : resolveRedeemError(result?.reason),
            txData: result.value,
          }
        })

        if (parsedResults.some(result => result.success)) {
          onDialogOK(parsedResults)
        }
        return parsedResults
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
        loadingMsg.value = ''
        loading.value = false
      }
    }

    /**
     * @param {Object} opts
     * @param {StablehedgeWallet} opts.wallet
     * @param {Number} [opts.locktime]
     * @param {import("src/wallet/stablehedge/wallet").WatchtowerUtxo[]} opts.utxos 
     * @param {Number[]} opts.satoshis 
     */
    function signRedeemUtxos(opts) {
      return Promise.all(opts.utxos.map((utxo, index) => {
        return opts.wallet.signRedeemUtxo({
          locktime: opts?.locktime,
          utxo: {
            addressPath: utxo.address_path,
            txid: utxo.txid,
            vout: utxo.vout,
            category: utxo.tokenid,
            amount: utxo.amount,
          },
          valueSatoshis: opts.satoshis[index],
        })
      }))
    }

    /**
     * @param {Object} opts
     * @param {StablehedgeWallet} opts.wallet
     * @param {Object} opts.redemptionContract
     * @param {Object} opts.priceMessage
     * @param {Number} [opts.locktime]
     * @param {Object} opts.utxo
     * @param {String} opts.utxo.txid
     * @param {Number} opts.utxo.vout
     * @param {Number} opts.utxo.satoshis
     * @param {String} opts.utxo.category
     * @param {Number} opts.utxo.amount
     * @param {String} opts.utxo.locking_bytecode
     * @param {String} opts.utxo.unlocking_bytecode
     */
    async function redeem(opts) {
      const wallet = opts.wallet
      const data = {
        locktime: opts?.locktime,
        redemption_contract_address: opts.redemptionContract?.address,
        price_oracle_message: {
          pubkey: opts?.priceMessage?.pubkey,
          message: opts?.priceMessage?.message,
          signature: opts?.priceMessage?.signature,
        },
        wallet_hash: wallet.walletHash,
        transaction_type: 'redeem',
        utxo: opts.utxo,
      }

      const url = `stablehedge/redemption-contract-transactions/`
      // const url = `stablehedge/test-utils/test_redemption_contract_tx/`
      const response = await wallet.apiBackend.post(url, data)
      if (typeof response === 'string') return { resultMessage: response }
      const redemptionContractTxId = response?.data?.id

      if (loading.value) {
        loadingMsg.value = $t('WaitingForTransactionToComplete')
      }
      const txStatusData = await waitRedemptionContractTx({
        id: redemptionContractTxId,
        chipnet: wallet.isChipnet,
        timeout: 30 * 1000,
      }).catch(error => {
        if (error === 'timeout') {
          return {
            message: $t('TransactionSentButTookLongerToComplete'),
          }
        }
        return Promise.reject(error)
      })
      const resultData = {
        id: redemptionContractTxId,
        responseData: response?.data,
        redemptionContractAddress: data.redemption_contract_address,
        txType: data.transaction_type,
        category: opts?.redemptionContract?.fiat_token?.category,
        satoshis: data.utxo.satoshis,
        bch: data.utxo.satoshis / 10 ** 8,
        amount: data?.utxo?.amount,

        status: txStatusData?.status,
        txid: txStatusData?.txid,
        resultMessage: txStatusData?.message,
        // timestamp: Date.now(),
      }
      return resultData
    }

    /**
     * @param {import("axios").AxiosError | Error} error
     */
    function resolveRedeemError(error) {
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

    return {
      darkMode, getDarkModeClass,
      dialogRef, onDialogCancel, onDialogHide, onDialogOK,
      innerVal,

      denomination,
      parsedRedeemOpts,
      totalDenominatedAmount,

      securityCheck,
      loadingMsg,
      loading,
    }
  }
})
</script>
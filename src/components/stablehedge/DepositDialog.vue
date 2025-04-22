<template>
  <q-dialog
    ref="dialogRef"
    v-model="innerVal"
    :persistent="loading"
    full-width
    position="bottom"
    @hide="onDialogHide"
  >
    <q-card
      class="br-15 pt-card-2 text-bow"
      :class="getDarkModeClass(darkMode)"
    >
      <div class="row no-wrap items-center justify-center q-pl-md q-pr-sm q-pt-sm">
        <div class="text-h6 q-space q-mt-sm">  
        </div>
        <q-btn
          :disable="loading"
          flat
          padding="sm"
          icon="close"
          class="close-button"
          v-close-popup
        />
      </div>
      <q-card-section class="q-pt-none">
        <div class="text-center" :class="[loading ? 'text-grey' : '']">
          <div class="text-h5 text-uppercase">{{ $t('Freeze') }}</div>
          <div class="text-h5">{{ denominatedBchAmountText }}</div>
          <div>
            + {{ formatBch(2000 / 10 ** 8) }}
            <q-icon name="info" size="1em"/>
            <q-menu class="pt-card-2 text-bow q-py-sm q-px-md br-15" :class="getDarkModeClass(darkMode)">
              <div class="row items-center q-gutter-sm">
                <div>{{ formatBch(1000 / 10 ** 8) }}</div>
                <div class="q-space">{{ $t('TokenDustAmount') }}</div>
              </div>
              <div class="row items-center q-gutter-sm">
                <div>{{ formatBch(1000 / 10 ** 8) }}</div>
                <div class="q-space">{{ $t('NetworkFee') }}</div>
              </div>
            </q-menu>
          </div>
          <div class="q-my-md text-h6 text-grey">{{ $t('To') }}</div>
          <div class="text-h5">{{ tokenAmount }} {{ tokenCurrency }}</div>
        </div>
        <q-banner
          v-if="!hasLiquidityForRedemption"
          class="q-my-sm rounded-borders q-mx-md"
          :class="$q.dark.isActive ? 'bg-amber-4 text-brown-10' : 'bg-amber-2 text-brown-9'"
        >
          <template v-slot:avatar>
            <q-icon name="warning" class="q-my-sm"/>
          </template>
          <div style="line-height:1.2;">
            <div class="q-mb-sm">
              {{ $t('DepositWarningMessage', {}, 'Due to low liquidity, they may not be fully convertible back to BCH immediately.') }}
            </div>
            <template v-if="postDepositRedeemableSats">
              <div class="text-caption">
                {{ $t('AvailableBchMessage', {}, 'Available BCH after deposit')}}
              :</div>
              <div>{{ formatBch(postDepositRedeemableSats / 10 ** 8) }}</div>
            </template>
          </div>

        </q-banner>
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
import { getAssetDenomination, parseFiatCurrency } from 'src/utils/denomination-utils';
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils';
import { satoshisToToken, tokenToSatoshis } from 'src/wallet/stablehedge/token-utils';
import { StablehedgeWallet } from 'src/wallet/stablehedge/wallet';
import { prepareUtxos, waitRedemptionContractTx } from 'src/wallet/stablehedge/transaction';
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
  name: 'DepositDialog',
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
    tokenUnits: Number,
    redemptionContract: Object,
    priceMessage: Object,
    selectedDenomination: String,
  },
  setup(props, { emit: $emit }) {
    const { t: $t } = useI18n()
    const $q = useQuasar();
    const $store = useStore();
    const darkMode = computed(() => $store.getters['darkmode/getStatus'])
    const { dialogRef, onDialogCancel, onDialogHide, onDialogOK } = useDialogPluginComponent()
    const innerVal = ref(props.modelValue)
    watch(() => [props.modelValue], () => innerVal.value = props.modelValue)
    watch(innerVal, () => $emit('update:modelValue', innerVal.value))


    const denomination = computed(() => {
      return props.selectedDenomination || $store.getters['global/denomination']
    })
    const fiatToken = computed(() => props.redemptionContract?.fiat_token)
    const tokenCurrency = computed(() => fiatToken.value?.currency || '')
    const decimals = computed(() => fiatToken.value?.decimals)

    const priceUnitPerBch = computed(() => parseFloat(props.priceMessage?.priceValue))
    // const priceUnitPerBch = computed(() => parseFloat(41740))

    const satoshis = computed(() => {
      if (!Number.isFinite(priceUnitPerBch.value)) return NaN
      return parseInt(tokenToSatoshis(props.tokenUnits, priceUnitPerBch.value, true))
    })

    /**
     * - We recalculate token units since, deposit cashscript uses satoshisToToken formula
     * - Recalculating e.g. tokenUnits -> tokenToSatoshis -> satoshisToToken
     *    doesn't always give the same amount
     */
    const adjustedTokenUnits = computed(() => {
      if (!Number.isFinite(priceUnitPerBch.value)) return NaN
      return parseInt(satoshisToToken(satoshis.value, priceUnitPerBch.value))
    })
    const tokenAmount = computed(() => adjustedTokenUnits.value / 10 ** decimals.value)
    const bchAmount = computed(() => satoshis.value / 10 ** 8)
    const denominatedBchAmountText = computed(() => {
      if (!bchAmount.value) return ''
      return formatBch(bchAmount.value)
    })
    function formatBch(value) {
      const currentDenomination = denomination.value || 'BCH'
      return getAssetDenomination(currentDenomination, value)
    }

    const postDepositRedeemableSats = computed(() => {
      const currentRedeemable = props.redemptionContract.redeemable
      return currentRedeemable + Math.floor(satoshis.value / 2)
    })
    const hasLiquidityForRedemption = computed(() => {
      return postDepositRedeemableSats.value > satoshis.value
    })

    function securityCheck(resetSwipe=() => {}) {
      $q.dialog({
        component: SecurityCheckDialog,
      })
        .onOk(() => startDeposit())
        .onCancel(() => resetSwipe?.())
    }

    const loading = ref(false)
    const loadingMsg = ref('')
    async function startDeposit() {
      try {
        loading.value = true
        const wallet = await getStablehedgeWallet()

        loadingMsg.value = $t('PreparingFunds')
        const utxoPrep = await prepareUtxos({
          wallet: wallet,
          amounts: [{ satoshis: satoshis.value + 2000 }],
          locktime: 0,
        })
        console.log({ utxoPrep })
        if (!utxoPrep.success) throw utxoPrep.error

        const utxo = utxoPrep.utxos[0]
        utxo.addressPath = utxo.address_path
        loadingMsg.value = $t('SigningData')
        const signResult = await wallet.signDepositUtxo({
          utxo,
          token: {
            category: props.redemptionContract?.fiat_token?.category,
            amount: adjustedTokenUnits.value,
          }
        })
        console.log({ signResult })

        const signedUtxo = {
          txid: utxo?.txid,
          vout: utxo?.vout,
          satoshis: utxo?.value,
          locking_bytecode: binToHex(signResult.output.lockingBytecode),
          unlocking_bytecode: binToHex(signResult.input.unlockingBytecode),
        }

        if (utxoPrep?.transaction) {
          loadingMsg.value = $t('PreparingFunds')
          const broadcastResult = await wallet.broadcast(utxoPrep?.transaction)
          if (broadcastResult.data?.error) {
            return {
              status: 'failed',
              resultMessage: broadcastResult?.data?.error || $t('ErrorPreparingFunds'),
            }
          }
        }

        const data = {
          redemption_contract_address: props.redemptionContract?.address,
          price_oracle_message: {
            pubkey: props?.priceMessage?.pubkey,
            message: props?.priceMessage?.message,
            signature: props?.priceMessage?.signature,
          },
          wallet_hash: wallet.walletHash,
          // transaction_type: 'inject', // change to 'deposit' later
          transaction_type: 'deposit',
          utxo: signedUtxo,
        }

        loadingMsg.value = $t('CreatingTransaction')
        const url = `stablehedge/redemption-contract-transactions/`
        // const url = `stablehedge/test-utils/test_redemption_contract_tx/`
        const response = await wallet.apiBackend.post(url, data)
        const redemptionContractTxId = response?.data?.id

        loadingMsg.value = $t('WaitingForTransactionToComplete')
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
          category: props.redemptionContract?.fiat_token?.category,
          satoshis: data.utxo.satoshis,
          bch: data.utxo.satoshis / 10 ** 8,
          amount: adjustedTokenUnits.value,

          status: txStatusData?.status,
          txid: txStatusData?.txid,
          resultMessage: txStatusData?.message,
          // timestamp: Date.now(),
        }
        onDialogOK(resultData)
        return resultData
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
        loading.value = false
        loadingMsg.value = ''
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

    return {
      darkMode, getDarkModeClass,
      dialogRef, onDialogCancel, onDialogHide, onDialogOK,
      innerVal,

      tokenCurrency,
      adjustedTokenUnits,
      tokenAmount,
      bchAmount,
      denominatedBchAmountText,
      formatBch,

      postDepositRedeemableSats,
      hasLiquidityForRedemption,

      securityCheck,
      loading,
      loadingMsg,

      parseFiatCurrency,
    }
  }
})
</script>

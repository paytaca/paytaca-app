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
          <div class="text-h5">FREEZE</div>
          <div class="text-h5">{{ bchAmount }} BCH</div>
          <div>
            + {{ 2000 / 10 ** 8 }} BCH
            <q-icon name="info" size="1em"/>
            <q-menu class="pt-card-2 text-bow q-py-sm q-px-md br-15" :class="getDarkModeClass(darkMode)">
              <div class="row items-center q-gutter-sm">
                <div>{{ 1000 / 10 ** 8 }} BCH</div>
                <div class="q-space">Token dust amount</div>
              </div>
              <div class="row items-center q-gutter-sm">
                <div>{{ 1000 / 10 ** 8 }} BCH</div>
                <div class="q-space">{{ $t('NetworkFee') }}</div>
              </div>
            </q-menu>
          </div>
          <div class="q-my-md text-h6 text-grey">{{ $t('To') }}</div>
          <div class="text-h5">{{ tokenAmount }} {{ tokenCurrency }}</div>
        </div>
        <div class="text-center">
          <div v-if="loading" class="q-my-md">
            <ProgressLoader/>
            <div class="text-subtitle1 q-r-mt-xl">{{ loadingMsg }}</div>
          </div>
        </div>
      </q-card-section>
      <DragSlide v-if="!loading" disable-absolute-bottom @swiped="securityCheck"/>
    </q-card>
  </q-dialog>
</template>
<script>
import { customNumberFormatting, parseFiatCurrency } from 'src/utils/denomination-utils';
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils';
import { tokenToSatoshis } from 'src/wallet/stablehedge/token-utils';
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

    const tokenUnits = computed(() => props.tokenUnits)
    const fiatToken = computed(() => props.redemptionContract?.fiat_token)
    const tokenCurrency = computed(() => fiatToken.value?.currency || '')
    const decimals = computed(() => fiatToken.value?.decimals)

    const priceUnitPerBch = computed(() => parseFloat(props.priceMessage?.priceValue))
    // const priceUnitPerBch = computed(() => parseFloat(41740))
    const pricePerBch = computed(() =>  priceUnitPerBch.value / 10 ** decimals.value)
    const pricePerBchText = computed(() => customNumberFormatting(pricePerBch.value))

    const tokenAmount = computed(() => tokenUnits.value / 10 ** decimals.value)
    const satoshis = computed(() => {
      if (!Number.isFinite(priceUnitPerBch.value)) return NaN
      return parseInt(tokenToSatoshis(tokenUnits.value, priceUnitPerBch.value))
    })
    const bchAmount = computed(() => satoshis.value / 10 ** 8)
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

        loadingMsg.value = 'Preparing funds'
        const utxoPrep = await prepareUtxos({
          wallet: wallet,
          amounts: [{ satoshis: satoshis.value + 2000 }],
          locktime: 0,
        })
        console.log({ utxoPrep })
        if (!utxoPrep.success) throw utxoPrep.error

        const utxo = utxoPrep.utxos[0]
        utxo.addressPath = utxo.address_path
        loadingMsg.value = 'Signing data'
        const signResult = await wallet.signDepositUtxo({
          utxo,
          token: {
            category: props.redemptionContract?.fiat_token?.category,
            amount: tokenUnits.value
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
          loadingMsg.value = 'Preparing funds for deposit'
          const broadcastResult = await wallet.broadcast(utxoPrep?.transaction)
          if (broadcastResult.data?.error) {
            return {
              status: 'failed',
              resultMessage: broadcastResult?.data?.error || 'Error preparing funds',
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
          transaction_type: 'inject', // change to 'deposit' later
          utxo: signedUtxo,
        }

        loadingMsg.value = 'Finalizing'
        const url = `stablehedge/redemption-contract-transactions/`
        // const url = `stablehedge/test-utils/test_redemption_contract_tx/`
        const response = await wallet.apiBackend.post(url, data)
        const redemptionContractTxId = response?.data?.id

        loadingMsg.value = 'Waiting for transaction to complete'
        const txStatusData = await waitRedemptionContractTx({
          id: redemptionContractTxId,
          chipnet: wallet.isChipnet,
          timeout: 30 * 1000,
        }).catch(error => {
          if (error === 'timeout') {
            return {
              message: 'Transaction sent but took longer to complete',
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
          amount: tokenUnits.value,

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
      tokenAmount,
      bchAmount,
      pricePerBchText,

      securityCheck,
      loading,
      loadingMsg,

      parseFiatCurrency,
    }
  }
})
</script>

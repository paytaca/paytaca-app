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
          Transaction
        </div>
        <q-btn
          flat
          padding="sm"
          icon="close"
          class="close-button"
          v-close-popup
        />
      </div>
      <q-card-section style="max-height:calc(80vh - 4rem);overflow-y:auto;">
        <TransactionDetailsPanel :transaction="parsedTransactionDetails"/>
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
import { useDialogPluginComponent } from 'quasar'
import { useStore } from 'vuex';
import { computed, defineComponent, ref, watch } from 'vue'
import TransactionDetailsPanel from 'src/components/walletconnect/TransactionDetailsPanel.vue';

export default defineComponent({
  name: 'CustomPaytacaDialog',
  components: {
    TransactionDetailsPanel,
  },
  emits: [
    'update:modelValue',
    ...useDialogPluginComponent.emits,
  ],
  props: {
    modelValue: Boolean,
    transaction: {
      default() {
        /** @type {import("cashscript").Utxo[]} */
        const inputs = []
  
        /** @type {import("cashscript").Recipient[]} */
        const outputs = []
        return { locktime: 0, inputs, outputs }
      }
    }
  },
  setup(props, { emit: $emit }) {
    const $store = useStore();
    const darkMode = computed(() => $store.getters['darkmode/getStatus'])
    const { dialogRef, onDialogCancel, onDialogHide, onDialogOK } = useDialogPluginComponent()
    const innerVal = ref(props.modelValue)
    watch(() => [props.modelValue], () => innerVal.value = props.modelValue)
    watch(innerVal, () => $emit('update:modelValue', innerVal.value))

    const parsedTransactionDetails = computed(() => {
      const inputs = props.transaction.inputs?.map(input => {
        return {
          sourceOutput: {
            ...input,
            outpointTransactionHash: input?.txid,
            outpointIndex: input?.vout,
            valueSatoshis: input?.satoshis,
            token: input?.token,

            lockingBytecode: new Uint8Array(),
          },
        }
      })
      const outputs = props.transaction?.outputs?.map(output => {
        return {
          address: output?.to,
          valueSatoshis: output?.amount,
          token: output?.token,

          lockingBytecode: new Uint8Array(),
        }
      })

      return { inputs, outputs }
    })

    return {
      darkMode, getDarkModeClass,
      dialogRef, onDialogCancel, onDialogHide, onDialogOK,
      innerVal,

      parsedTransactionDetails,
    }
  }
})
</script>

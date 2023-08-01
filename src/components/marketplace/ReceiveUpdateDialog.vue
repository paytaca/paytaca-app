<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" position="bottom">
    <q-card class="q-dialog-plugin" :class="darkMode ? 'text-white pt-dark-card' : 'text-black'">
      <div class="row no-wrap items-center justify-center q-pl-md q-py-sm">
        <div class="text-h5 q-space q-mt-sm"> Received </div>
        <q-btn
          flat
          padding="sm"
          icon="close"
          v-close-popup
        />
      </div>
      <q-card-section>
        <div class="q-mb-md">
          <div class="row items-center justify-center q-gutter-x-sm">
            <div class="text-h5">
              {{ amount }} {{ tokenCurrency }}
            </div>
            <img v-if="logo" :src="logo" height="30"/>
          </div>
          <div v-if="marketValue && marketValueCurrency" class="text-center text-body2">
            {{ marketValue }} {{ marketValueCurrency }}
          </div>
        </div>

        <div class="text-grey" style="margin-bottom:-0.5em;">Transaction ID</div>
        <div class="row items-center no-wrap text-subtitle1">
          <div class="ellipsis">{{txid}}</div>
          <div class="row no-wrap">
            <q-btn
              rounded
              padding="xs"
              icon="content_copy"
              @click="copyText(txid, 'Transaction ID copied')"
            />
            <q-btn
              rounded
              padding="xs"
              icon="open_in_new"
              :href="`https://blockchair.com/bitcoin-cash/transaction/${txid}/`"
              target="_blank"
            />
          </div>
        </div>
        <q-separator class="q-my-md"/>
        <div class="q-mt-sm">
          <q-btn
            no-caps
            label="Okay"
            color="brandblue"
            class="full-width"
            @click="onOk()"
          />
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>
<script>
import { computed, defineComponent } from 'vue'
import { useDialogPluginComponent, useQuasar } from 'quasar'
import { useStore } from 'vuex'

export default defineComponent({
  name: 'ReceiveUpdateDialog',
  emits: [
    // REQUIRED; need to specify some events that your
    // component will emit through useDialogPluginComponent()
    ...useDialogPluginComponent.emits,
  ],
  props: {
    txid: String,
    address: String,
    amount: [String, Number],
    tokenCurrency: String,
    marketValue: [String, Number],
    marketValueCurrency: String,
    logo: [String, null],
    expectedAmount: [String, Number],
  },
  methods: {
    copyText(value, message='Copied address') {
      this.$copyText(value)
        .then(() => {
          this.$q.notify({
            message: message || 'Copied to clipboard',
            timeout: 800,
            icon: 'mdi-clipboard-check',
            color: 'blue-9'
          })
        })
        .catch(() => {})
    }
  },
  setup(props) {
    const $q = useQuasar()
    const $store = useStore()
    const darkMode = computed(() => $store.getters['darkmode/getStatus'])

    const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()

    function onOk() {
      if (!props.expectedAmount) return onDialogOK()

      const expectedAmount = parseFloat(props.expectedAmount)
      const amount = parseFloat(props?.amount)
      const errorAmount = Math.abs(expectedAmount - amount)
      const allowedErrorAmount = 1000 / 10 ** 8
      if (errorAmount > allowedErrorAmount ) {
        $q.dialog({
          title: 'Amount does not match',
          message: 'Amount does not match with expected amount. Continue?',
          ok: { color: 'brandblue' },
          cancel: true,
        }).onOk(() => onDialogOK())
          .onDismiss(() => onDialogHide())
      } else {
        onDialogOK()
      }
    }

    return {
      darkMode,
      dialogRef, onDialogHide, onDialogOK, onDialogCancel,
      onOk,
    }
  },
})
</script>
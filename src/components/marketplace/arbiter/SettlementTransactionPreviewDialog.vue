<template>
  <q-dialog v-model="innerVal" ref="dialogRef" @hide="onDialogHide" position="bottom" full-height>
    <q-card class="bottom-card" :class="darkMode ? 'text-white pt-card-3' : 'text-black'">
      <q-card-section>
        <div class="row items-center no-wrap">
          <div class="text-h6">{{ $t('SettlementTransaction') }}</div>
          <q-space/>
          <q-btn v-close-popup flat icon="close" class="q-r-mr-sm"/>
        </div>
        <div style="max-height: calc(90vh - 5rem);overflow-y: auto;">
          <div class="q-mb-sm">
            <q-badge class="text-body2" multi-line>
              {{ transaction?.abiFunction?.name }}
              <template v-if="transaction?.abiFunction?.inputs?.length">
                <!-- \xa0 is a non breaking space -->
                ({{ transaction?.abiFunction?.inputs?.map(inp => `${inp?.type}\xa0${inp?.name}`).join(', ') }})
              </template>
            </q-badge>
          </div>
          <div class="row items-start">
            <div class="col-6 col-sm-6 q-mb-sm q-pr-xs">
              <div class="text-subtitle1">{{ $t('Inputs') }}</div>
              <div
                v-for="(input, index) in transaction?.inputs" :key="index"
                class="q-mb-xs"
              >
                <div class="row items-center no-wrap" style="column-gap:2px;">
                  <div>#{{ index }}</div>
                  <q-space/>
                  <div class="text-caption">
                    {{ parseInt(input?.satoshis)/ 10 ** 8 }} BCH
                  </div>
                </div>
                <div
                  style="word-wrap:break-word;position:relative;"
                  v-ripple @click="() => copyToClipboard(input?.txid)"
                >
                  {{ input?.txid }}
                </div>
                <q-separator :dark="darkMode" spaced/>
              </div>
            </div>
            <div class="col-6 col-sm-6 q-mb-sm q-pl-xs">
              <div class="text-subtitle1">{{ $t('Outputs') }}</div>
              <div
                v-for="(output, index) in transaction?.outputs" :key="index"
                class="q-mb-xs"
              >

                <div class="row items-center no-wrap" style="column-gap:2px;">
                  <div>#{{ index }}</div>
                  <q-space/>
                  <div class="text-caption">
                    {{ parseInt(output?.amount)/ 10 ** 8 }} BCH
                  </div>
                </div>
                <div
                  style="word-wrap:break-word;position:relative;"
                  v-ripple @click="() => copyToClipboard(output?.to)"
                >
                  {{ output?.to }}
                </div>
                <div v-if="output?.token" class="q-pa-sm q-mt-xs shadow-1">
                  <div class="text-body2">{{ $t('Token') }}</div>
                  <div
                    style="word-wrap:break-word;position:relative;"
                    v-ripple @click="() => copyToClipboard(output?.token?.category)"
                  >
                    {{ output?.token?.category }}
                  </div>
                  <div v-if="output?.token?.amount">
                    {{ $t('Amount') }}: {{ output?.token?.amount }}
                  </div>
                  <div v-if="output?.token?.nft">
                    <div class="row items-center no-wrap">
                      <div>NFT:</div>
                      <q-space/>
                      <q-badge>{{ output?.token?.nft?.capability }}</q-badge>
                    </div>
                    <div
                      class="ellipsis-2-lines"
                      style="word-wrap:break-word;position:relative;"
                      v-ripple @click="() => copyToClipboard(output?.token?.nft?.commitment)"
                    >
                      {{ output?.token?.nft?.commitment }}
                    </div>
                  </div>
                </div>
                <q-separator :dark="darkMode" spaced/>
              </div>
            </div>
          </div>
          <div class="q-ma-xs" style="position:sticky;bottom:0;">
            <slot name="action-buttons">
              <q-btn v-if="okButton" v-bind="okButton" @click="onDialogOK"/>
              <q-btn v-if="cancelButton" v-bind="cancelButton" @click="onDialogCancel"/>
            </slot>
          </div>
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>
<script>
import { useDialogPluginComponent, useQuasar } from 'quasar'
import { EscrowContract } from 'src/marketplace/objects'
import { useStore } from 'vuex'
import { computed, defineComponent, inject, ref, watch } from 'vue'
import { i18n } from 'src/boot/i18n'

const { t: $t } = i18n.global

export default defineComponent({
  name: 'SettlementTransactionPreviewDialog',
  emits: [
    'update:modelValue',
    ...useDialogPluginComponent.emits,
  ],
  props: {
    modelValue: Boolean,
    escrowContract: EscrowContract,
    transaction: Object,
    okButton: {
      type: [Object, null],
      default: () => Object({ label: $t('OK'), color: 'brandblue', class: 'full-width q-mb-xs' }),
    },
    cancelButton: {
      type: [Object, null],
      default: () => Object({ label: $t('Cancel'), color: 'grey', class: 'full-width q-mb-xs' }),
    },
  },
  setup(props, { emit: $emit }) {
    const $q = useQuasar()
    const $store = useStore()
    const darkMode = computed(() => $store?.state?.darkmode?.darkmode)
    const $copyText = inject('$copyText')

    const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()

    const innerVal = ref(props.modelValue)
    watch(() => [props.modelValue], () => innerVal.value = props.modelValue)
    watch(innerVal, () => $emit('update:modelValue', innerVal.value))

    function copyToClipboard(value, message) {
      $copyText(value)
      $q.notify({
        message: message || $t('CopiedToClipboard', undefined, 'Copied to clipboard'),
        timeout: 800,
        color: 'blue-9',
        icon: 'mdi-clipboard-check'
      })
    }

    return {
      darkMode,
      dialogRef, onDialogHide, onDialogOK, onDialogCancel,
      innerVal,

      copyToClipboard,
    }
  },
})
</script>

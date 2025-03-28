<template>
  <q-dialog ref="dialogRef" v-model="innerVal" @hide="onDialogHide">
    <q-card class="br-15 pt-card-2 text-bow" :class="getDarkModeClass(darkMode)">
      <div class="row no-wrap items-center justify-center q-pl-md">
        <div class="text-h6 q-space q-mt-sm">
          {{ $t('Invoice') }}
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
        <div class="row items-center no-wrap q-gutter-xs">
          <div class="q-space" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">{{ $t('PaymentID') }}:</div>
          <div class="ellipsis">#{{ jpp?.parsed?.paymentId }}</div>
          <q-btn
            flat
            icon="content_copy"
            size="sm"
            padding="xs"
            @click="copyToClipboard(jpp?.parsed?.paymentId, $t('PaymentIdCopied'))"
          />
        </div>
        <div v-if="jpp?.parsed?.paymentUrl" class="row items-center no-wrap q-gutter-xs">
          <div class="q-space" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">{{ $t('URL') }}:</div>
          <div class="ellipsis">{{ jpp?.parsed?.paymentUrl }}</div>
          <q-btn
            flat
            icon="content_copy"
            size="sm"
            padding="xs"
            @click="copyToClipboard(jpp?.parsed?.paymentUrl, $t('LinkCopied'))"
          />
        </div>
        <div v-if="jpp?.parsed?.time" class="row items-center no-wrap q-gutter-xs">
          <div class="q-space" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">{{ $t('Created') }}:</div>
          <div>{{ formatTimestampToText(jpp?.parsed?.time) }}</div>
        </div>
        <div v-if="jpp?.parsed?.memo" class="q-my-sm">
          <div :class="darkMode ? 'text-grey-5' : 'text-grey-8'">{{ $t('Memo') }}:</div>
          <q-banner
            class="text-body1 rounded-borders memo-banner"
            :class="{'text-white': darkMode}"
          >
            {{ jpp.parsed?.memo }}
          </q-banner>
        </div>
        <div>
          <div :class="darkMode ? 'text-grey-5' : 'text-grey-8'">
            <template v-if="jpp?.parsed?.outputs?.length > 1">
              {{ $t('Recipients') }}:
            </template>
            <template v-else>
              {{ $t('Recipient') }}:
            </template>
          </div>
          <div
            v-for="(output, index) in jpp?.parsed?.outputs?.slice(0,10)" :key="index"
            class="row no-wrap items-start q-mb-sm q-gutter-x-xs"
          >
            <div class="q-space">
              {{ ellipsisText(output.address, {start: 16, end: 5 }) }}
              <q-popup-proxy :breakpoint="0">
                <div
                  class="text-body2 pt-card pt-label address-popup q-px-md q-py-sm"
                  :class="getDarkModeClass(darkMode)"
                >
                  {{ output.address }}
                </div>
              </q-popup-proxy>
            </div>
            <div class="text-right">{{ output.amount / 10 ** 8 }} BCH</div>
          </div>
          <strong v-if="jpp?.parsed?.outputs?.length > 10">
            {{
              $t(
                "AndMoreAddresses",
                { addressCount: jpp?.parsed?.outputs?.length - 10 },
                `and ${jpp?.parsed?.outputs?.length - 10} more addresses`
              )
            }}
          </strong>
          <div v-if="jpp?.parsed?.outputs?.length > 1" class="row items-center q-mb-sm text-subtitle1">
            <div class="q-space">{{ $t('Total') }}:</div>
            <div>{{ jpp.total / 10 ** 8 }} BCH</div>
          </div>
        </div>
        <div v-if="jpp.txids.length">
          <q-separator spaced/>
          <div class="row items-center transactions">
            <div class="text-subtitle1 q-space">
              <template v-if="jpp.txids.length > 1">
                {{ $t('Transactions') }}:
              </template>
              <template v-else>
                {{ $t('Transaction') }}:
              </template>
            </div>
            <div v-if="jpp?.paymentData?.paidAt" class="row items-center no-wrap">
              <div class="q-space" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">{{ $t('PaidAt') }}:&nbsp;</div>
              <div>{{ formatTimestampToText(jpp?.paymentData?.paidAt) }}</div>
            </div>
          </div>
          <div v-for="(txid, index) in jpp.txids" :key="index" class="row items-center">
            <div class="q-space ellipsis">{{ ellipsisText(txid, {start: 10, end: 10 }) }}</div>
            <div class="row q-gutter-x-sm">
              <q-btn size="0.7em" padding="0.8em" rounded icon="content_copy" @click="copyToClipboard(txid)"/>
              <q-btn size="0.7em" padding="0.8em" rounded icon="open_in_new" target="_blank" :href="txLink(txid)"/>
            </div>
          </div>
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>
<script setup>
import { getDarkModeClass } from "src/utils/theme-darkmode-utils";
import { ellipsisText, formatTimestampToText } from "src/wallet/anyhedge/formatters";
import { JSONPaymentProtocol } from "src/wallet/payment-uri";
import { useDialogPluginComponent, useQuasar } from "quasar";
import { useI18n } from "vue-i18n";
import { useStore } from "vuex";
import { computed, inject, ref, watch } from "vue";

const $t = useI18n().t

const $emit = defineEmits([
  'update:modelValue',
  // REQUIRED; need to specify some events that your
  // component will emit through useDialogPluginComponent()
  ...useDialogPluginComponent.emits
])

const props = defineProps({
  modelValue: Boolean,
  jpp: {
    type: JSONPaymentProtocol,
    required: true,
  },
})

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()
const innerVal = ref(props.modelValue)
watch(innerVal, () => $emit('update:modelValue', innerVal.value))
watch(() => [props.modelValue], () => innerVal.value = props.modelValue)

const store = useStore()
const darkMode = computed(() => store.getters['darkmode/getStatus'])
const denomination = computed(() => store.getters['global/denomination'])
const $q = useQuasar()

const $copyText = inject('$copyText')
function copyToClipboard(value) {
  $copyText(value)
  $q.notify({
    color: 'blue-9',
    message: $t('CopiedToClipboard'),
    icon: 'mdi-clipboard-check',
    timeout: 200
  })
}

function txLink(txid) {
  return `https://blockchair.com/bitcoin-cash/transaction/${txid}/`
}
</script>
<style lang="scss" scoped>
  .memo-banner {
    border: 1px solid grey;
    background-color: inherit;
  }
  .drag-slide {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 1500;
  }
  .address-popup {
    word-break: break-all;
  }
</style>

<template>
  <q-dialog
    ref="dialogRef"
    v-model="innerVal"
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
          flat
          padding="sm"
          icon="close"
          class="close-button"
          v-close-popup
        />
      </div>
      <q-card-section class="q-pt-none">
        <div class="text-center text-uppercase text-h6">{{ record?.txTypeText }}</div>
        <div v-if="record?.status === 'pending'" class="text-center">
          <q-badge color="grey">
            {{ $t('Pending') }}
          </q-badge>
        </div>
        <div v-if="record?.status === 'failed'" class="text-center">
          <q-badge color="red">
            {{ $t('Failed') }}
          </q-badge>
        </div>
        <div
          class="q-my-md text-center column items-center justify-center"
          :class="[record?.txType === 'redeem' ? 'reverse' : '']"
        >
          <div class="text-h5">
            {{ formatBCH(record?.bch) }}
          </div>
          <div class="text-subtitle1 text-grey q-px-sm">{{ $t('To') }}</div>
          <div class="text-h5">
            {{ formatTokenUnits(record?.amount, record?.category) }}
          </div>
        </div>
        <q-item v-if="record?.timestamp" clickable v-ripple @click="() => copyToClipboard(record.timestamp)">
          <q-item-section>
            <q-item-label class="text-gray" caption>{{ $t('Date') }}</q-item-label>
            <q-item-label>
              {{ formatDate(record?.timestamp) }}
            </q-item-label>
          </q-item-section>
        </q-item>
        <q-item
          v-if="record?.txid"
          clickable
          v-ripple
          @click="copyToClipboard(record.txid.substring(0, 6).toUpperCase())" style="overflow-wrap: anywhere;"
        >
          <q-item-section>
            <q-item-label class="text-gray" caption>{{ $t('ReferenceId') }}</q-item-label>
            <q-item-label>{{ record.txid.substring(0, 6).toUpperCase() }}</q-item-label>
          </q-item-section>
        </q-item>
        <q-item
          v-if="record?.txid"
          clickable
          v-ripple
          @click="copyToClipboard(record.txid)" style="overflow-wrap: anywhere;"
        >
          <q-item-section>
            <q-item-label class="text-gray" caption>{{ $t('TransactionId') }}</q-item-label>
            <q-item-label>{{ record.txid }}</q-item-label>
          </q-item-section>
        </q-item>
        <q-item
          style="overflow-wrap: anywhere;"
          clickable v-ripple
          @click="copyToClipboard(record?.redemptionContractAddress)"
        >
          <q-item-section>
            <q-item-label class="text-gray" caption>{{ $t('ContractAddress') }}</q-item-label>
            <q-item-label>{{ record?.redemptionContractAddress }}</q-item-label>
          </q-item-section>
        </q-item>
        <q-item
          v-if="record?.fee"
          style="overflow-wrap: anywhere;"
        >
          <q-item-section>
            <q-item-label class="text-gray" caption>{{ $t('Fee') }}</q-item-label>
            <q-item-label>{{ formatBCH(record?.fee) }}</q-item-label>
          </q-item-section>
        </q-item>
        <q-item
          v-if="record?.priceValue"
          style="overflow-wrap: anywhere;"
          clickable v-ripple
          @click="copyToClipboard(formatPriceDenomination(record?.priceValue, record?.category))"
        >
          <q-item-section>
            <q-item-label class="text-gray" caption>{{ $t('Price') }}</q-item-label>
            <q-item-label>{{ formatPriceDenomination(record?.priceValue, record?.category) }}</q-item-label>
          </q-item-section>
        </q-item>
        <q-item
          v-if="record?.resultMessage"
          style="overflow-wrap: anywhere;"
          clickable v-ripple
          @click="copyToClipboard(record?.resultMessage)"
        >
          <q-item-section>
            <q-item-label class="text-gray" caption>{{ $t('Message') }}</q-item-label>
            <q-item-label>{{ record?.resultMessage }}</q-item-label>
          </q-item-section>
        </q-item>
        <q-item v-if="record?.txid" clickable>
          <q-item-section>
            <q-item-label class="text-gray" caption>{{ $t('ExplorerLink') }}</q-item-label>
            <q-item-label>
              <a
                style="text-decoration: none;"
                class="button button-text-primary"
                :class="getDarkModeClass(darkMode)"
                :href="explorerLink"
                target="_blank"
              >
                {{ $t('ViewInExplorer') }}
              </a>
            </q-item-label>
          </q-item-section>
        </q-item>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>
<script>
import { getAssetDenomination } from 'src/utils/denomination-utils';
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils';
import { parseStablehedgeHistory } from 'src/wallet/stablehedge/history-utils';
import { copyToClipboard, useDialogPluginComponent, useQuasar } from 'quasar'
import { useI18n } from 'vue-i18n';
import { useStore } from 'vuex';
import { computed, defineComponent, ref, watch, inject } from 'vue'

export default defineComponent({
  name: 'StablehedgeHistoryDetailDialog',
  emits: [
    'update:modelValue',
    ...useDialogPluginComponent.emits,
  ],
  props: {
    modelValue: Boolean,
    selectedDenomination: String,
    record: {
      default: () => parseStablehedgeHistory()
    }
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

    const isChipnet = computed(() => $store.getters['global/isChipnet'])
    const explorerLink = computed(() => {
      const txid = props.record?.txid
      let url = 'https://explorer.paytaca.com/tx/'

      if (isChipnet.value) url = `${process.env.TESTNET_EXPLORER_URL}/tx/`

      return `${url}${txid}`
    })

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

    const denomination = computed(() => {
      return props.selectedDenomination || $store.getters['global/denomination']
    })
    function formatBCH(balance) {
      const currentDenomination = denomination.value || 'BCH'
      const parsedBCHBalance = getAssetDenomination(currentDenomination, balance)

      if (currentDenomination === $t('DEEM')) {
        const commaBalance = parseFloat(parsedBCHBalance).toLocaleString('en-us', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        })
        return `${commaBalance} ${currentDenomination}`
      }

      return parsedBCHBalance
    }

    function formatPriceDenomination(price, category) {
      const token = $store.getters['stablehedge/token'](category)
      const decimals = parseInt(token?.decimals) || 0
      const currency = token?.currency || 'UNIT'
      const priceValue = price / 10 ** decimals

      const currentDenomination = denomination.value || 'BCH'
      const conversionRate = parseFloat(getAssetDenomination(currentDenomination, 1)) || 1

      const convertedPrice = Number(priceValue / conversionRate)
      return `${convertedPrice} ${currency}/${currentDenomination}`
    }

    function formatTokenUnits(amount, category) {
      const token = $store.getters['stablehedge/token'](category)
      const decimals = parseInt(token?.decimals) || 0
      const currency = token?.currency || 'UNIT'

      const tokens = amount / 10 ** decimals
      return `${tokens} ${currency}`
    }

    function formatDate (date) {
      const dateObj = new Date(date)
      return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'medium' }).format(dateObj)
    }

    return {
      darkMode, getDarkModeClass,
      dialogRef, onDialogCancel, onDialogHide, onDialogOK,
      innerVal,

      explorerLink,

      copyToClipboard,
      formatBCH,
      formatPriceDenomination,
      formatTokenUnits,
      formatDate,
    }
  }
})
</script>

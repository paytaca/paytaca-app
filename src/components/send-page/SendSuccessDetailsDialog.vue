<template>
  <q-dialog persistent seamless ref="dialog" class="no-click-outside">
    <q-card class="q-pa-md pt-card text-bow full-width" :class="getDarkModeClass(darkMode)">
      <div class="row justify-between items-center q-mb-sm">
        <span
          class="text-uppercase text-bold section-title"
          style="font-size: 18px;"
          :class="getDarkModeClass(darkMode)"
        >
          {{ $t('TransactionDetails') }}
        </span>
        <q-btn
          flat
          round
          padding="xs"
          icon="close"
          class="close-button"
          v-close-popup
        />
      </div>

      <div class="row col-12 items-center q-gutter-y-sm">
        <template v-if="!isNFT">
          <span class="col-4 text-bold">{{ $t('TotalAmountSent') }}:</span>
          <span class="col-8">
            {{ totalSent }}
            <span v-if="!isCashToken">({{ totalFiatSent }})</span>
          </span>
        </template>
        <template v-else>
          <span class="col-4 text-bold">{{ $t('Sent') }}:</span>
          <span class="col-8">{{ name }}</span>
        </template>

        <span class="col-4 text-bold">{{ $t('ReferenceId') }}:</span>
        <span class="col-8">{{ txid.substring(0, 6).toUpperCase() }}</span>

        <span class="col-4 text-bold">{{ $t('TransactionId') }}:</span>
        <span class="col-8">
          {{ txid.slice(0, 8) }}<span>***</span>{{ txid.substr(txid.length - 8) }}<br>
        </span>

        <span class="col-4 text-bold">{{ $t('TimeSent') }}:</span>
        <span class="col-8">{{ timestamp }}</span>
      </div>

      <div class="row q-mt-md">
        <span class="col-12 q-mb-sm text-center text-bold text-subtitle1">
          {{ $t('Recipients') }}
        </span>
      </div>

      <q-scroll-area style="height: 45vh">
        <div
          v-for="(data, index) in breakdownSublist"
          :key="index"
          class="row col-12 q-gutter-x-sm q-gutter-y-xs"
        >
          <span class="col-1">#{{ index + 1 + (8 * (breakdownPage - 1)) }}</span>
          <span class="col-5" style="overflow-wrap: anywhere;">{{ data.address }}</span>
          <span class="col-5">{{ data.amount }}</span>
        </div>
      </q-scroll-area>

      <div class="row justify-center q-mt-sm">
        <q-pagination
          padding="xs"
          :modelValue="breakdownPage"
          :max="maxPages"
          :max-pages="6"
          :dark="darkMode"
          :class="getDarkModeClass(darkMode)"
          :hide-below-pages="2"
          @update:modelValue="(val) => {
            breakdownPage = val,
            paginateList()
          }"
        />
      </div>
    </q-card>
  </q-dialog>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

export default {
  name: 'SendSuccessDetailsDialog',

  props: {
    isNFT: { type: Boolean, default: false },
    isCashToken: { type: Boolean, default: false },

    totalSent: { type: String, default: '' },
    totalFiatSent: { type: String, default: '' },
    txid: { type: String, default: '' },
    timestamp: { type: String, default: '' },
    name: { type: String, default: '' },

    breakdownList: { type: Array, default: Array }
  },

  data () {
    return {
      breakdownPage: 1,
      maxPages: 0,
      breakdownSublist: []
    }
  },

  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    }
  },

  mounted () {
    this.maxPages = Math.ceil(this.breakdownList.length / 8)
    this.breakdownSublist = this.breakdownList.slice(0, 8)
  },

  methods: {
    getDarkModeClass,
    paginateList () {
      this.breakdownSublist = this.breakdownList.slice(
        (8 * (this.breakdownPage - 1)), (8 * this.breakdownPage)
      )
    }
  }
}
</script>

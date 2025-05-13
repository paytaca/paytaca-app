<template>
  <q-card
    class="q-py-sm q-px-md pt-card"
    :class="getDarkModeClass(darkMode)"
  >
    <div class="row text-body1">
      <span
        class="q-pb-xs col-12 text-center text-bold text-uppercase"
        style="font-size: 18px;"
      >
        {{ `${saleGroup} Sale Contract` }}
      </span>
      <span class="col-12">
        Created on {{ parseLocaleDate(saleContract.dateCreated) }}
      </span>
      <div @click="copyToClipboard(saleContract.ctAddress)">
        <span>Token address: </span>
        <span class="q-px-sm">
          {{ parseTokenAddress(saleContract.ctAddress) }}
        </span>
        <q-icon name="fas fa-copy" style="font-size: 14px;" />
      </div>
    </div>  
  </q-card>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { parseLocaleDate } from 'src/utils/engagementhub-utils/rewards'

export default {
  name: 'SaleContractCard',

  props: {
    saleContract: { type: Object, default: null },
    saleGroup: { type: String, default: '' }
  },

  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    }
  },

  methods: {
    getDarkModeClass,
    parseLocaleDate,

    parseTokenAddress (address) {
      const textLen = address.length
      const prefix = address.substring(0, 18)
      const suffix = address.substring(textLen - 8, textLen)
      return `${prefix}...${suffix}`
    },
    copyToClipboard (value) {
      this.$copyText(value)
      this.$q.notify({
        message: this.$t('CopiedToClipboard'),
        timeout: 800,
        color: 'blue-9',
        icon: 'mdi-clipboard-check'
      })
    }
  }
}
</script>
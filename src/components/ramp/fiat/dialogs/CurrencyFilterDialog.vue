<template>
  <q-dialog ref="dialog" full-width>
    <q-card class="br-15 pt-card-2 text-bow q-pb-sm" :class="getDarkModeClass(darkMode)">
      <div class="row no-wrap items-center justify-center q-pl-lg q-pr-sm q-pt-md">
        <div class="text-bold q-space q-mt-sm pt-label" :class="getDarkModeClass(darkMode)"></div>
        <q-btn
          flat
          padding="sm"
          icon="close"
          class="close-button"
          v-close-popup
        />
      </div>
      <q-card-section>
        <q-input
          dense
          outlined
          rounded
          v-model="searchText"
          :placeholder="$t('SelectCurrency')"
        >
          <template v-slot:append>
            <q-icon name="search" color="grey-5" />
          </template>
        </q-input>
      </q-card-section>
      <q-card-section class="q-pt-none fiat-list-container">
        <q-virtual-scroll :items="filteredList">
          <template v-slot="{ item: currency, index }">
            <q-item clickable @click="onOKClick(currency)">
              <q-item-section v-if="typeof currency === 'string'">
                {{ $t('AllCurrencies') }}
              </q-item-section>
              <q-item-section v-else>
                <div>
                  {{ currency.symbol }}
                </div>
                <div class="text-grey" style="font-size: 13px;">{{ currency.name }}</div>
              </q-item-section>
            </q-item>
          </template>
        </q-virtual-scroll>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>
<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

export default {
  data () {
    return {
      searchText: null
    }
  },
  props: {
    fiatList: Array
  },
  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    filteredList () {
      if (!this.searchText) return this.fiatList

      const needle = String(this.searchText).toLowerCase()

      return this.fiatList
        .filter(currency => {
          if (!this.searchText) return true
          if (!currency) return false
          if (/0x[0-9a-f]+/.test(needle) && (currency.symbol.toLowerCase() === needle || currency.name.toLowerCase() === needle)) return true

          return String(currency.symbol).toLowerCase().includes(needle) || String(currency.name).toLowerCase().includes(needle)
        })
    }
  },
  methods: {
    getDarkModeClass,
    onOKClick (currency) {
      // if (coin.offline === false) {
      this.$emit('ok', currency)
      this.$refs.dialog.hide()
      // }
    },
  }
}
</script>
<style lang="scss" scoped>
  .fiat-list-container {
    max-height: 50vh;
    overflow-y: auto;
    .token-icon {
      height: 30px;
      width: 30px;
      &.icon-div {
        border-radius: 50%;
      }
    }
  }
</style>

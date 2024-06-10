<template>
    <q-dialog v-model="showDialog" full-width @before-hide="$emit('back')">
    <q-card class="br-15 pt-card-2 text-bow q-pb-sm" :class="getDarkModeClass(darkMode)">
      <div class="row no-wrap items-center justify-center q-pl-lg q-pr-sm q-pt-md">
        <div class="md-font-size q-mt-sm pt-label" :class="getDarkModeClass(darkMode)">Arbiter Fiat Currencies</div>
      </div>
      <q-card-section>
        <q-input
        dense
        outlined
        rounded
        v-model="searchText"
        placeholder="Search Currency">
        <template v-slot:append>
            <q-icon name="search" color="grey-5" />
        </template>
        </q-input>
      </q-card-section>
      <div style="height: 400px; overflow: auto;">
        <q-card-section class="q-pt-none fiat-list-container">
            <q-virtual-scroll :items="filteredCurrencies">
            <template v-slot="{ item: currency }">
                <q-item>
                    <q-item-section>
                        <div>
                            <q-badge outline class="q-mr-sm">{{ currency.symbol }}</q-badge>
                            <span>{{ currency.name }}</span>
                        </div>
                    </q-item-section>
                </q-item>
            </template>
            </q-virtual-scroll>
        </q-card-section>
      </div>
    </q-card>
  </q-dialog>
</template>
<script>
import { debounce } from 'quasar'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      showDialog: true,
      searchText: null,
      filteredCurrencies: this.currencies
    }
  },
  emits: ['back'],
  props: {
    currencies: Array
  },
  watch: {
    searchText (value) {
      this.filterCurrencies(value)
    }
  },
  methods: {
    getDarkModeClass,
    filterCurrencies: debounce(function (searchString) {
      this.filteredCurrencies = this.currencies.filter(item =>
        (item.name.toLowerCase().includes(searchString.toLowerCase()) || item.symbol.toLowerCase().includes(searchString.toLowerCase()))
      )
    })
  }
}
</script>

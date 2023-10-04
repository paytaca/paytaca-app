<template>
  <q-select
    :style="{ width: this.$q.platform.is.mobile ? '75%' : '100%' }"
    v-model="denomination"
    :options="filteredDenominationOptions"
    :dark="darkMode"
    @filter="filterDenominationSelection"
    popup-content-style="color: black;"
    dense
    use-input
    fill-input
    borderless
    hide-selected
  >
    <template v-slot:option="scope">
      <q-item v-bind="scope.itemProps">
        <q-item-section>
          <q-item-label :class="{ 'text-black': !darkMode && !scope.selected }">
            {{ scope.opt.label }}
          </q-item-label>
        </q-item-section>
      </q-item>
    </template>
  </q-select>
</template>

<script>
export default {
  props: {
    darkMode: { type: Boolean, default: false },
    currentCountry: { type: String }
  },
  data () {
    return {
      denominationOptions: [
        { value: 'BCH', label: 'BCH' },
        { value: 'mBCH', label: 'mBCH' },
        { value: 'Satoshis', label: 'Satoshis' }
      ],
      filteredDenominationOptions: []
    }
  },
  methods: {
    filterDenominationSelection (val, update) {
      if (!val) {
        this.filteredDenominationOptions = this.hkSelection(this.denominationOptions)
      } else {
        const needle = String(val).toLowerCase()
        this.filteredDenominationOptions = this.hkSelection(this.denominationOptions)
          .filter(denom => String(denom?.label).toLowerCase().indexOf(needle) >= 0)
      }
      update()
    },
    hkSelection (options) {
      if (this.currentCountry === 'HK' && !options.some((a) => a.value === 'DEEM')) {
        options.push({ value: 'DEEM', label: this.$t('DEEM') })
      } else if (this.currentCountry !== 'HK' && options.some((a) => a.value === 'DEEM')) {
        options.pop()
      }
      return options
    }
  },
  computed: {
    denomination: {
      get () {
        return this.$store.getters['global/denomination']
      },
      set (denom) {
        const newDenomination = denom.value
        this.$store.commit('global/setDenomination', newDenomination)
      }
    }
  }
}
</script>

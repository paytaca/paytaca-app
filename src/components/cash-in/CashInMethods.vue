<template>
  <div class="cash-in-methods q-gutter-md" :class="getDarkModeClass(darkMode)">
    <q-card
      v-if="cryptoSwapEnabled"
      class="cash-in-method-card br-15 cursor-pointer"
      :class="getDarkModeClass(darkMode)"
      @click="$emit('select', 'swap')"
    >
      <q-card-section class="row items-center q-pa-lg">
        <div class="col-auto q-mr-lg">
          <div class="icon-container">
            <q-icon name="mdi-swap-horizontal-bold" size="2.2em" class="text-grad" />
          </div>
        </div>
        <div class="col">
          <div class="text-h6 text-weight-bold q-mb-xs" :class="getDarkModeClass(darkMode)">
            {{ $t('CashIn.ConvertTitle', {}, 'Convert other cryptocurrencies') }}
          </div>
          <div class="text-caption" :class="darkMode ? 'text-grey-5' : 'text-grey-7'">
            {{ $t('CashIn.ConvertDescription', {}, 'Swap BTC, ETH, SOL, USDT, and other coins into BCH.') }}
          </div>
        </div>
        <div class="col-auto">
          <q-icon name="chevron_right" size="1.6em" :class="darkMode ? 'text-grey-5' : 'text-grey-6'" />
        </div>
      </q-card-section>
    </q-card>

    <q-card
      class="cash-in-method-card br-15 cursor-pointer"
      :class="getDarkModeClass(darkMode)"
      @click="$emit('select', 'p2p')"
    >
      <q-card-section class="row items-center q-pa-lg">
        <div class="col-auto q-mr-lg">
          <div class="icon-container">
            <q-icon name="mdi-handshake" size="2.2em" class="text-grad" />
          </div>
        </div>
        <div class="col">
          <div class="text-h6 text-weight-bold q-mb-xs" :class="getDarkModeClass(darkMode)">
            {{ $t('CashIn.P2PTitle', {}, 'Buy from other people') }}
          </div>
          <div class="text-caption" :class="darkMode ? 'text-grey-5' : 'text-grey-7'">
            {{ $t('CashIn.P2PDescription', {}, 'Buy BCH with fiat from peers in the P2P Ramp.') }}
          </div>
        </div>
        <div class="col-auto">
          <q-icon name="chevron_right" size="1.6em" :class="darkMode ? 'text-grey-5' : 'text-grey-6'" />
        </div>
      </q-card-section>
    </q-card>
  </div>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

export default {
  name: 'CashInMethods',
  props: {
    cryptoSwapEnabled: {
      type: Boolean,
      default: true
    }
  },
  emits: ['select'],
  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    }
  },
  methods: {
    getDarkModeClass
  }
}
</script>

<style lang="scss" scoped>
.cash-in-method-card {
  transition: all 0.3s ease;
  border: 1px solid transparent;

  &.cursor-pointer:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(59, 123, 246, 0.15);
    border-color: rgba(59, 123, 246, 0.2);
  }

  .icon-container {
    width: 70px;
    height: 70px;
    border-radius: 50%;
    background: rgba(59, 123, 246, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
  }
}

.cash-in-methods.dark .cash-in-method-card {
  &.cursor-pointer:hover {
    border-color: rgba(255, 255, 255, 0.15);
    box-shadow: 0 4px 12px rgba(255, 255, 255, 0.05);
  }

  .icon-container {
    background: rgba(255, 255, 255, 0.08);
  }
}
</style>

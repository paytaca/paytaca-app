<template>
  <q-card class="text-light card-light br-15 home-header-card">
    <!-- <div class="row justify-end" style="z-index: 2;">
        <-- <div></div> --

      </div> -->
    <q-btn class="button-default price-chart" round icon="show_chart" size="xs" @click="openPriceChart()"/>
    <div class="card-container">
      <!-- token selector -->
      <div class="label-small">
        <q-icon name="keyboard_arrow_down" class="q-pr-sm"/> Select token (1 of 9)
      </div>
      <div class="row">
        <!-- Price -->
        <q-skeleton type="rect" v-if="!loaded" style="width: 250px"/>
        <div v-else class="headline-large">{{ balance }} <span class="headline-small">BCH</span></div>
        <!-- Token Icon -->
        <q-img src="bch-logo.png" id="header-logo"/>
      </div>
      <!-- Fiat Equivalent -->
        <q-skeleton v-if="!loaded" type="text" style="width: 50px;"/>
       <div v-else class="label-medium">
        <span class="text-uppercase">{{ this.selectedMarketCurrency }}</span> &nbsp; {{ equivalentExchangeText }}
       </div>

       <!-- Services -->
       <div class="services">
          <div class="row q-gutter-xs">
            <div class="col-10 row q-gutter-sm">
              <!-- {{ iconPath+opt.icon }} -->
              <div v-for="opt in coinsOptions">
                <q-btn  class="button-default" round :disable="!loaded || opt.name === 'freeze'" @click="handleButton(opt.name)">
                  <q-icon size="18px" :name="`img:ui-revamp/${opt.icon}`"/>
                </q-btn>
                <div class="q-pt-sm text-center text-capitalize title-smaller text-primary">{{ opt.name }}</div>
              </div>
            </div>
            <div class="col-2 row justify-end">
              <q-btn padding="0" icon="arrow_back_ios" size="12px" flat color="black"/>
              <q-btn padding="0" icon="arrow_forward_ios" size="12px" flat color="black"/>
            </div>
          </div>
       </div>
    </div>
  </q-card>
</template>
<script>
import PriceChart from 'src/pages/transaction/dialog/PriceChart.vue'
import { getAssetDenomination, parseAssetDenomination, parseFiatCurrency } from 'src/utils/denomination-utils'

export default {
  data () {
    return {
      coinsOptions: [
        { name: 'freeze', icon: 'freeze.png', path: ''},
        { name: 'send', icon: 'send-bch.png', path: 'transaction-send-select-asset'},
        { name: 'receive', icon: 'receive-bch.png', path: 'transaction-receive-select-asset'},
        { name: 'cashin', icon: 'cashin.png', path: ''}
      ]
    }
  },
  props: {
    balance: String,
    equivalentExchange: String,
    loaded: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    equivalentExchangeText () {
      return this.equivalentExchange.replace(/[^0-9.]/g, '')
    },
    selectedMarketCurrency (){
      const currency = this.$store.getters['market/selectedCurrency']
      return currency && currency.symbol
    }

  },
  emits: ['cashin'],
  methods: {
    parseFiatCurrency,
    openPriceChart () {
       this.$q.dialog({
          component: PriceChart
        })
    },
    handleButton (name) {
      switch (name) {
        case 'freeze': 
          break
        case 'send':
          this.$router.push({ name: 'transaction-send-select-asset' })
          break 
        case 'receive':
          this.$router.push({ name: 'transaction-receive-select-asset' })
          break
        case 'cashin':
          this.$emit('cashin')

      } 
    }

  }
}
</script>
<style lang="scss" scoped>
.home-header-card {
  z-index: 1;
  margin: 24px 16px 0px;
  .card-container {
    margin: 24px 24px 24px;
  }
}
#header-logo {
    margin: 5px 5px 0px;
    height: 28px;
    width: 28px;
  }
.token-select {
  // margin: 24px 24px 0px;
}
.services {
  margin-top: 24px;
}
.price-chart {
    position: absolute;
    right: 24px;
    top: 5%;
    // background-color: $primary !important;
    // color: #fff !important;
  }
</style>

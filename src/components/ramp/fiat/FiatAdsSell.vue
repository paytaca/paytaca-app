<template>
  <div class="q-pb-md">
    <div>
      <q-btn
        flat
        padding="md"
        icon="arrow_back"
        @click="$emit('back')"
      />
    </div>
    <div>
      <div class="text-h5 q-mx-lg text-center bold-text lg-font-size" :style="darkMode ? 'border-bottom: 1px solid grey' : 'border-bottom: 1px solid #DAE0E7'">
        POST SELL AD
      </div>
    </div>
    <!-- Price Settings -->
    <div class="q-px-lg">
      <div class="q-mx-lg q-pb-sm q-pt-md bold-text">
        Price Setting
      </div>
      <div class="text-center q-mx-md">
        <q-btn-toggle
          dense
          v-model="adData.priceType"
          spread
          class="my-custom-toggle br-15"
          no-caps
          unelevated
          toggle-color="red-6"
          text-color="red-6"
          :options="[
            {label: 'Fixed', value: 'FIXED'},
            {label: 'Floating', value: 'FLOAT'}
          ]"
        />
      </div>
      <div class="row q-pt-sm q-gutter-sm q-px-md md-font-size">
        <div class="col-4">
          <div class="q-pl-sm q-pb-xs">Fiat</div>
          <q-select dense :dark="darkMode" rounded outlined v-model="selectedCurrency" :options="Object.keys(availableFiat)" />
        </div>
        <div class="col">
          <!-- <q-select :dark="darkMode" rounded outlined v-model="selectedCurrency" :options="Object.keys(availableFiat)" label="Fiat Currency" /> -->
          <div class="q-pl-sm q-pb-xs">{{ adData.priceType === 'FIXED'? 'Fixed Price' : 'Floating Price Margin' }}</div>
          <q-input dense rounded :dark="darkMode" outlined bottom-slots v-model="amount">
            <template v-slot:prepend>
              <q-icon name="remove" @click="amount--"/>
            </template>
            <template v-slot:append>
              <q-icon name="add" @click="amount++" />
            </template>
          </q-input>
        </div>
      </div>
      <div class="md-font-size">
        <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row subtext justify-between no-wrap q-mx-lg">
          <div>
            <span>Your Price</span><br>
            <span class="bold-text lg-font-size">{{ fixedAmount }} {{ selectedCurrency }}</span>
          </div>
          <div >
            <span>Lowest Order Price</span><br>
            <span class="lg-font-size" style="float: right;">{{ lowerstOrderPrice }} {{ selectedCurrency }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script>
export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      adData: {
        tradeType: 'BUY',
        priceType: 'FIXED',
        fiatCurrency: {
          name: 'Philippine Peso',
          abbrev: 'PHP'
        },
        cryptoCurrency: {
          name: 'Bitcoin Cash',
          abbrev: 'BCH'
        },
        fixedPrice: null,
        floatingPrice: null,
        tradeFloor: 0,
        tradeCeiling: 0,
        cryptoAmount: 0,
        timeDurationChoice: 1440
        // paymentMethods: [3, 4]
      },
      lowerstOrderPrice: '7311.71',
      priceSetToggle: 'FIXED',
      amount: 0,
      selectedCurrency: 'PHP',
      floatingPriceMargin: 100,
      fixedAmount: 0,
      ptlSelection: [
        {
          label: '10 hrs',
          value: 10
        }, {
          label: '15 hrs',
          value: 15
        }, {
          label: '24 hrs',
          value: 24
        }],
      ptl: '24 hrs',
      availableFiat: {
        PHP: 'Philippine Peso',
        USD: 'United States Dollar',
        CAD: 'Canadian Dollar',
        JPY: 'Japanese Yen',
        RUB: 'Russian Ruble'
      }
    }
  },
  // props: {
  //   transactionType: String,
  //   adsState: String
  // },
  emits: ['back'],
  async mounted () {
    const vm = this

    // console.log(vm.transactionType)
    // console.log(vm.adsState)
  }
}
</script>
<style lang="scss" scoped>
.bold-text {
  font-weight: 500;
}
.sm-font-size {
  font-size: 12px;
}
.md-font-size {
  font-size: 13px
}
.lg-font-size {
  font-size: 18px;
}
</style>

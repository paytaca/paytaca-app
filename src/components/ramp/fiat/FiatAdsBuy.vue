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
      <div class="text-h5 q-mx-lg text-center bold-text lg-font-size" style="color: rgb(60, 100, 246);" :style="darkMode ? 'border-bottom: 1px solid grey' : 'border-bottom: 1px solid #DAE0E7'">
        <span v-if="adsState === 'create'">POST BUY AD</span>
        <span v-if="adsState === 'edit'">EDIT BUY AD</span>
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
          toggle-color="blue-6"
          text-color="blue-6"
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
            <span class="bold-text lg-font-size">{{ amount }} {{ selectedCurrency }}</span>
          </div>
          <div >
            <span>Lowest Order Price</span><br>
            <span class="lg-font-size" style="float: right;">{{ lowerstOrderPrice }} {{ selectedCurrency }}</span>
          </div>
        </div>
      </div>
    </div>
    <q-separator :dark="darkMode" class="q-mt-sm q-mx-md"/>
    <!-- Total Amount -->
    <div class="q-mx-lg">
      <div class="q-mt-md q-px-md">
        <div class="q-pb-xs q-pl-sm bold-text">Total Amount</div>
          <q-input
            dense
            outlined
            rounded=""
            :dark="darkMode"
            v-model="adData.cryptoAmount"
          >
            <template v-slot:prepend>
              <span class="bold-text sm-font-size">
                BCH
              </span>
            </template>
            <template v-slot:append>
              <q-icon size="xs" name="close" @click="amount = 0"/>
              <!-- <q-btn padding="none" style="font-size: 12px;" flat color="primary" label="MAX" /> -->
            </template>
          </q-input>
        </div>
      <div class="q-mt-sm q-px-md">
        <div class="q-pl-sm q-pb-xs md-font-size">Trade Limit</div>
        <div class="row">
          <div class="col-5">
            <q-input
              dense
              outlined
              rounded=""
              :dark="darkMode"
              v-model="adData.tradeFloor"
            >
              <template v-slot:append>
                <span class="sm-font-size">{{ selectedCurrency  }}</span>
                <!-- <q-btn padding="none" style="font-size: 12px;" flat color="primary" label="MAX" /> -->
              </template>
            </q-input>
          </div>
          <div class="col text-center">
            <q-icon class="q-pt-sm" name="remove"/>
          </div>
          <div class="col-5">
            <q-input
              dense
              outlined
              rounded=""
              :dark="darkMode"
              v-model="adData.tradeCeiling"
            >
              <template v-slot:append>
                <span class="sm-font-size">{{ selectedCurrency  }}</span>
                <!-- <q-btn padding="none" style="font-size: 12px;" flat color="primary" label="MAX" /> -->
              </template>
            </q-input>
          </div>
        </div>
      </div>
    </div>

    <q-separator :dark="darkMode" class="q-mt-lg q-mx-md"/>

    <!-- Payment Time Limit -->
    <div class="q-mx-lg q-pt-md">
      <div class="q-px-lg">
        <div class="q-pt-sm bold-text">Payment Time Limit</div>
      </div>
      <div class="q-mx-md q-pt-sm">
        <div>
          <q-select
              dense
              outlined
              rounded
              :dark="darkMode"
              v-model="ptl"
              :options="ptlSelection"
            />
              <!-- <template v-slot:append>
                <q-icon size="xs" name="close" @click.stop.prevent="ptl = ''"/>&nbsp;
              </template> -->
            <!-- </q-select> -->
        </div>
      </div>
    </div>

    <!-- Post Ad -->
    <div class="q-mx-lg">
      <div class="row q-mx-sm q-py-lg">
        <q-btn
          rounded
          no-caps
          label='Post Ad'
          color="blue-6"
          class="q-space"
          @click="postAd"
        />
      </div>
    </div>
  </div>
</template>
<script>
export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      lowerstOrderPrice: '7311.71',
      priceSetToggle: 'FIXED',
      amount: 0,
      selectedCurrency: 'PHP',
      floatingPriceMargin: 100,
      fixedAmount: 0,
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
      },
    }
  },
  props: {
    transactionType: String,
    adsState: String,
    listing: {
      type: Object,
      default: null
    }
  },
  emits: ['back'],
  methods: {
    postAd () {
      if (this.adData.priceType === 'FIXED') {
        this.adData.fixedPrice = this.amount
      } else {
        this.adData.floatingPrice = this.amount
      }
      console.log(this.adData)
    }
  },
  async mounted () {
    const vm = this

    // console.log(vm.transactionType)
    // console.log(vm.adsState)
    console.log(vm.listing)
  }
}
</script>
<style lang="scss" scoped>
.my-custom-toggle {
  border: 1px solid #2196F3
}
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

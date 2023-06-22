<template>
  <div class="q-pb-md">
    <div v-if="step < 3">
      <q-btn
        flat
        padding="md"
        icon="arrow_back"
        @click="step > 1 ? step-- : $emit('back')"
      />
    </div>
    <div v-if="step === 1">
      <div>
        <div class="text-h5 q-mx-lg text-center bold-text lg-font-size" :class="transactionType === 'buy' ? 'buy-color' : 'sell-color'" :style="darkMode ? 'border-bottom: 1px solid grey' : 'border-bottom: 1px solid #DAE0E7'">
          <span v-if="adsState === 'create'">POST {{ transactionType.toUpperCase() }} AD</span>
          <span v-if="adsState === 'edit'">EDIT {{ transactionType.toUpperCase() }} AD</span>
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
            class="br-15"
            :style="transactionType === 'buy' ? 'border: 1px solid #2196F3' : 'border: 1px solid #ed5f59'"
            no-caps
            unelevated
            :toggle-color="transactionType === 'buy' ? 'blue-6': 'red-6'"
            :text-color="transactionType === 'buy' ? 'blue-6': 'red-6'"
            :options="[
              {label: 'Fixed', value: 'FIXED'},
              {label: 'Floating', value: 'FLOAT'}
            ]"
            @update:model-value="updateConvertionRate()"
          />
        </div>
        <div class="row q-pt-sm q-gutter-sm q-px-md md-font-size">
          <div class="col-4">
            <div class="q-pl-sm q-pb-xs">Fiat</div>
            <q-select
              dense
              rounded
              outlined
              :color="transactionType === 'buy' ? 'blue-6': 'red-6'"
              :dark="darkMode"
              v-model="selectedCurrency"
              :options="availableFiat"
              option-label="abbrev"
              @update:model-value="updateFiatCurrency()"
            >
              <template v-slot:option="scope">
                <q-item v-bind="scope.itemProps">
                  <q-item-section>
                    <q-item-label>{{ scope.opt.name }} ({{ scope.opt.abbrev }})</q-item-label>
                  </q-item-section>
                </q-item>
              </template>
            </q-select>
          </div>
          <div class="col">
            <!-- <q-select :dark="darkMode" rounded outlined v-model="selectedCurrency" :options="Object.keys(availableFiat)" label="Fiat Currency" /> -->
            <div class="q-pl-sm q-pb-xs">{{ adData.priceType === 'FIXED'? 'Fixed Price' : 'Floating Price Margin' }}</div>
            <q-input
              dense
              rounded
              outlined
              :color="transactionType === 'buy' ? 'blue-6': 'red-6'"
              :dark="darkMode"
              bottom-slots
              v-model="priceAmount"
              @update:model-value="updateConvertionRate()"
              >
              <template v-slot:prepend>
                <q-icon name="remove" @click="decPrice()"/>
              </template>
              <template v-slot:append>
                <q-icon name="add" @click="priceAmount++" />
              </template>
            </q-input>
          </div>
        </div>
        <div class="md-font-size">
          <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row justify-between no-wrap q-mx-lg">
            <div>
              <span>Your Price</span><br>
              <span class="bold-text lg-font-size">{{ priceAmount }} {{ selectedCurrency.abbrev }}</span>
            </div>
            <div >
              <span>Lowest Order Price</span><br>
              <span class="lg-font-size" style="float: right;">{{ lowestOrderPrice }} {{ selectedCurrency.abbrev }}</span>
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
              rounded
              :dark="darkMode"
              :color="transactionType === 'buy' ? 'blue-6': 'red-6'"
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
                :color="transactionType === 'buy' ? 'blue-6': 'red-6'"
                v-model="adData.tradeFloor"
              >
                <template v-slot:append>
                  <span class="sm-font-size">{{ selectedCurrency.abbrev  }}</span>
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
                :color="transactionType === 'buy' ? 'blue-6': 'red-6'"
                v-model="adData.tradeCeiling"
              >
                <template v-slot:append>
                  <span class="sm-font-size">{{ selectedCurrency.abbrev  }}</span>
                  <!-- <q-btn padding="none" style="font-size: 12px;" flat color="primary" label="MAX" /> -->
                </template>
              </q-input>
            </div>
          </div>
        </div>
      </div>
      <q-separator :dark="darkMode" class="q-mt-sm q-mx-md"/>

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
                :color="transactionType === 'buy' ? 'blue-6': 'red-6'"
                :dark="darkMode"
                v-model="paymentTimeLimit"
                :options="ptlSelection"
                @update:modelValue="updatePaymentTimeLimit()"
              />
                <!-- <template v-slot:append>
                  <q-icon size="xs" name="close" @click.stop.prevent="ptl = ''"/>&nbsp;
                </template> -->
              <!-- </q-select> -->
          </div>
        </div>
      </div>

      <!-- NEXT STEP -->
      <div class="q-mx-lg">
        <div class="row q-mx-sm q-py-lg">
          <q-btn
            :disable="checkPostData()"
            rounded
            no-caps
            :label="transactionType === 'buy' ? 'Post Ad' : 'Next'"
            color="blue-6"
            class="q-space"
            @click="checkSubmitOption()"
          />
        </div>
      </div>
    </div>
    <div v-if="step === 2">
      <div class="q-px-md">
        <AddPaymentMethods
          :confirm-label="'Post Ad'"
          :currentPaymentMethods="adData.paymentMethods"
          v-on:submit="postAd"
        />
      </div>
    </div>
    <div v-if="step === 3">
      <DisplayConfirmation/>
    </div>
  </div>
</template>
<script>
import { debounce } from 'quasar'
import AddPaymentMethods from './AddPaymentMethods.vue'
import DisplayConfirmation from './DisplayConfirmation.vue'

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      step: 1,

      // V-MODELS
      priceAmount: 0,
      lowestOrderPrice: 7311.71,
      paymentTimeLimit: '1 day',
      selectedCurrency: {
        name: 'Philippine Peso',
        abbrev: 'PHP'
      },

      // AD DATA
      adData: {
        tradeType: '',
        priceType: 'FIXED',
        fiatCurrency: {   // get fiat_currency ID
          name: 'Philippine Peso',
          abbrev: 'PHP'
        },
        cryptoCurrency: {   // get crypro_currency ID
          name: 'Bitcoin Cash',
          abbrev: 'BCH'
        },
        fixedPrice: null,
        floatingPrice: null,
        tradeFloor: 0,
        tradeCeiling: 0,
        cryptoAmount: 0,
        timeDurationChoice: 1440,
        paymentMethods: []
      },

      // SELECTION OPTIONS
      availableFiat: [  //api/ramp-p2p/currency/fiat/
        {
          name: 'Philippine Peso',
          abbrev: 'PHP'
        },
        {
          name: 'United States Dollar',
          abbrev: 'USD'
        },
        {
          name: 'Canadian Dollar',
          abbrev: 'CAD'
        },
        {
          name: 'Japanese Yen',
          abbrev: 'JPY'
        },
        {
          name: 'Russian Ruble',
          abbrev: 'RUB'
        }
      ],
      ptlSelection: [
        {
          label: '15 min',
          value: 15
        }, {
          label: '30 min',
          value: 30
        }, {
          label: '1 hr',
          value: 60
        }, {
          label: '5 hrs',
          value: 300
        }, {
          label: '12 hrs',
          value: 720
        }, {
          label: '1 day',
          value: 1440
        }]
    }
  },
  props: {
    transactionType: String,
    adsState: String
  },
  components: {
    AddPaymentMethods,
    DisplayConfirmation
  },
  emits: ['back'],
  methods: {
    checkSubmitOption () {
      const vm = this

      switch (vm.transactionType) {
        case 'buy':
          console.log(vm.adData)
          break
        case 'sell':
          vm.step++
          break
      }
    },
    postAd (methods) {
      const vm = this
      // Finalize Data
      // console.log(methods)

      vm.adData.paymentMethods = methods
      console.log(vm.adData)
      vm.step++
    },
    decPrice () {
      const vm = this
      if (vm.priceAmount <= vm.lowestOrderPrice) {
        vm.priceAmount = vm.lowestOrderPrice
      } else {
        vm.priceAmount--
      }
    },
    updatePaymentTimeLimit () {
      const vm = this
      vm.adData.timeDurationChoice = vm.paymentTimeLimit.value
    },
    updateFiatCurrency () {
      const vm = this
      vm.adData.fiatCurrency = vm.selectedCurrency
    },
    checkPostData () {
      const vm = this
      // return false
      // check if valid amount
      if (!vm.isAmountValid(vm.priceAmount) || !vm.isAmountValid(vm.adData.cryptoAmount) || !vm.isAmountValid(vm.adData.tradeCeiling) || !vm.isAmountValid(vm.adData.tradeFloor)) {
        return true
      } else {
        return false
      }
    },
    isAmountValid (value) {
      // amount with comma and decimal regex
      const regex = /^(\d*[.]\d+)$|^(\d+)$|^((\d{1,3}[,]\d{3})+(\.\d+)?)$/
      value = String(value)

      if (regex.test(value) && value !== '0') {
        return true
      } else {
        return false
      }
    },
    updateConvertionRate: debounce(async function () {
      const vm = this

      switch (vm.adData.priceType) {
        case 'FIXED':
          vm.adData.fixedPrice = vm.priceAmount

          vm.adData.floatingPrice = null
          break
        case 'FLOAT':
          vm.adData.floatingPrice = vm.priceAmount

          vm.adData.fixedPrice = null
          break
      }
    }, 500)
  },
  async mounted () {
    const vm = this

    vm.priceAmount = vm.lowestOrderPrice
    vm.adData.tradeType = vm.transactionType.toUpperCase()
    vm.updateConvertionRate()
    // call list of payment types
  }
}
</script>
<style lang="scss" scoped>
.my-custom-toggle {
  border: 1px solid #ed5f59
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
.subtext {
  opacity: .5;
}
.buy-color {
  color: rgb(60, 100, 246);
}
.sell-color {
  color: #ed5f59;
}
</style>

<template>
  <q-card
    class="br-15 q-pt-sm q-mx-md q-mx-none"
    :class="[ darkMode ? 'text-white pt-dark-card-2' : 'text-black',]"
    style="min-height:78vh;"
    v-if="state === 'SELECT'"
  >
    <div v-if="dataLoaded">
      <div class="row no-wrap items-center q-pa-sm q-pt-md">
        <div>
          <div v-if="selectedFiat" class="q-ml-md text-h5 md-font-size">
            {{ selectedFiat.abbrev }} <q-icon size="sm" name='mdi-menu-down'/>
          </div>
          <q-menu anchor="bottom left" self="top left" >
            <q-list class="text-h5 subtext md-font-size" :class="{'pt-dark-card': darkMode}" style="min-width: 150px;">
              <q-item
                v-for="(currency, index) in fiatCurrencies"
                :key="index"
                clickable
                v-close-popup
                @click="selectFiatCurrency(index)"
              >
                <!-- <q-item-section :class="[$store.getters['darkmode/getStatus'] ? 'pt-dark-label' : 'pp-text']">{{ currency }} ({{ index }})</q-item-section> -->
                <q-item-section :class="[ darkMode ? 'text-white pt-dark-card-2' : 'text-black',]">{{ currency.name }} ({{ currency.abbrev }})</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </div>
        <q-space />
        <div class="q-pr-md">
          <q-icon size="sm" name='sym_o_filter_list'/>
        </div>
      </div>
      <div class="br-15 q-py-md q-gutter-sm q-mx-lg text-center btn-transaction md-font-size" :class="{'pt-dark-card': darkMode}">
        <button class="btn-custom q-mt-none" :class="{'pt-dark-label': darkMode, 'active-buy-btn': transactionType == 'BUY' }" @click="transactionType='BUY'">Buy BCH</button>
        <button class="btn-custom q-mt-none" :class="{'pt-dark-label': darkMode, 'active-sell-btn': transactionType == 'SELL'}" @click="transactionType='SELL'">Sell BCH</button>
      </div>
      <div class="q-mt-md">
        <div v-if="dataLoaded == true && getFilteredListings().length == 0" class="relative text-center" style="margin-top: 50px;">
          <q-img class="vertical-top q-my-md" src="empty-wallet.svg" style="width: 75px; fill: gray;" />
          <p :class="{ 'text-black': !darkMode }">{{ $t('NoTransactionsToDisplay') }}</p>
        </div>
        <div v-else>
          <q-card-section style="max-height:58vh;overflow-y:auto;">
            <q-virtual-scroll :items="getFilteredListings()">
              <template v-slot="{ item: listing }">
                <q-item clickable @click="selectListing(listing)">
                  <q-item-section>
                    <div class="q-pt-sm q-pb-sm q-pl-md" :style="darkMode ? 'border-bottom: 1px solid grey' : 'border-bottom: 1px solid #DAE0E7'">
                      <div class="row">
                        <div class="col ib-text">
                          <span
                            :class="{'pt-dark-label': darkMode}"
                            class="q-mb-none text-uppercase sm-font-size"
                          >
                            {{ listing.owner }}
                          </span><br>
                          <div class="row">
                              <span class="q-mr-sm subtext">{{ listing.trade_count }} total trades </span>
                              <span class="q-ml-sm subtext">{{ formatCompletionRate(listing.completion_rate) }}% completion</span><br>
                          </div>
                          <span
                            :class="{'pt-dark-label': darkMode}"
                            class="col-transaction text-uppercase xm-font-size"
                          >
                            {{ listing.price }} {{ selectedFiat.abbrev }}
                            <!-- {{ listing.priceType === 'FIXED' ? listing.fixedPrice : listing.floatingPrice }} {{ listing.fiatCurrency.abbrev }} -->
                          </span>
                          <span class="sm-font-size">
                            /BCH
                          </span><br>
                          <div class="row">
                              <span class="q-mr-md">Quantity</span>
                              <span>{{ listing.crypto_amount }} BCH</span>
                          </div>
                          <div class="row">
                              <span class="q-mr-md">Limit</span>
                              <span> {{ listing.trade_floor }} {{ selectedFiat.abbrev }} - {{ listing.trade_ceiling }} {{ selectedFiat.abbrev }}</span>
                          </div>
                        </div>
                        <!-- <div class="text-right sm-font-size">
                          <span class="subtext">Quantity: {{ listing.cryptoAmount }} BCH</span><br>
                          <span class="subtext">Limit: {{ listing.tradeFloor }} {{ listing.fiatCurrency.abbrev }} - {{ listing.tradeCeiling }} {{ listing.fiatCurrency.abbrev }}</span> -->
                          <!-- <span class="subtext">{{ listing.trades }} trades</span><br>
                          <span class="subtext">{{ listing.completion }}% completion</span> -->
                        <!-- </div> -->
                      </div>
                      <div class="q-gutter-sm q-pt-sm">
                        <q-badge v-for="method in listing.payment_methods" :key="method.id"
                        rounded outline :color="transactionType === 'BUY'? 'blue': 'red'">
                        {{ method.payment_type }}
                        </q-badge>
                        <!-- <q-badge v-for="method in listing.paymentMethods" rounded outline :color="transactionType === 'buy'? 'blue': 'red'" :label="method.name" /> -->
                      </div>
                    </div>
                  </q-item-section>
                </q-item>
              </template>
            </q-virtual-scroll>
          </q-card-section>
        </div>
      </div>
    </div>
    <div v-if="!dataLoaded">
      <div class="row justify-center q-py-lg" style="margin-top: 50px">
        <ProgressLoader/>
      </div>
    </div>
  </q-card>
  <!-- Buy/Sell Form Here -->
  <div v-if="state !== 'SELECT'">
    <FiatStoreForm
      v-on:back="state = 'SELECT'"
      :listingData="selectedListing"
      :transactionType="state"
    />
  </div>
</template>
<script>
import FiatStoreForm from './FiatStoreForm.vue'
import ProgressLoader from '../../ProgressLoader.vue'
import { loadP2PWalletInfo, signMessage } from 'src/wallet/ramp'

export default {
  components: {
    FiatStoreForm,
    ProgressLoader
  },
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      apiURL: process.env.WATCHTOWER_BASE_URL + '/ramp-p2p',
      wallet: null,
      transactionType: 'BUY',
      dataLoaded: false,
      loading: true,
      peerInfo: null,
      selectedFiat: null,
      state: 'SELECT',
      selectedListing: {},
      availableFiat: [ // api/ramp-p2p/currency/fiat/
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
      test_data: [
        {
          trade_type: 'BUY',
          price_type: 'FIXED',
          fiat_currency: {
            name: 'Philippine Peso',
            abbrev: 'PHP'
          },
          crypto_currency: {
            name: 'Bitcoin Cash',
            abbrev: 'BCH'
          },
          completion_rate: 100,
          trade_count: 1230,
          price: 1000, // Work on later
          floating_price: null,
          trade_floor: 100,
          trade_ceiling: 1000,
          crypto_amount: 1,
          time_duration_choice: 1440,
          payment_methods: [
            {
              payment_type: 'gcash',
              account_name: 'Andy Webber',
              account_number: 123845893
            },
            {
              payment_type: 'paymaya',
              account_name: 'James Watson',
              account_number: 'jasbdvndsakXZc'
            },
            {
              payment_type: 'paypal',
              account_name: 'Stephen King',
              account_number: 'sample@gmail.com'
            }
          ]
        },
        {
          trade_type: 'BUY',
          price_type: 'FIXED',
          fiat_currency: {
            name: 'Philippine Peso',
            abbrev: 'PHP'
          },
          crypto_currency: {
            name: 'Bitcoin Cash',
            abbrev: 'BCH'
          },
          completion_rate: 100,
          trade_count: 1230,
          price: 1000,
          floating_price: null,
          trade_floor: 100,
          trade_ceiling: 1000,
          crypto_amount: 1,
          time_duration_choice: 300,
          payment_methods: [
            {
              payment_type: 'gcash',
              account_name: 'Agnes Christy',
              account_number: 123845893
            },
            {
              payment_type: 'paymaya',
              account_name: 'Jane Austin',
              account_number: 'jasbdvndsakXZc'
            },
            {
              payment_type: 'paypal',
              account_name: 'Charlotte Bronte',
              account_number: 'sample@gmail.com'
            }
          ]
        },
        {
          trade_type: 'BUY',
          price_type: 'FIXED',
          fiat_currency: {
            name: 'Philippine Peso',
            abbrev: 'PHP'
          },
          crypto_currency: {
            name: 'Bitcoin Cash',
            abbrev: 'BCH'
          },
          completion_rate: 100,
          trade_count: 1230,
          price: 1000,
          floating_price: null,
          trade_floor: 100,
          trade_ceiling: 1000,
          crypto_amount: 1,
          time_duration_choice: 1440,
          payment_methods: [
            {
              payment_type: 'gcash',
              account_name: 'Jane Austin',
              account_number: 123845893
            },
            {
              payment_type: 'paymaya',
              account_name: 'James Watson',
              account_number: 'jasbdvndsakXZc'
            },
            {
              payment_type: 'paypal',
              account_name: 'Stephen King',
              account_number: 'sample@gmail.com'
            }
          ]
        },
        {
          trade_type: 'BUY',
          price_type: 'FIXED',
          fiat_currency: {
            name: 'Philippine Peso',
            abbrev: 'PHP'
          },
          crypto_currency: {
            name: 'Bitcoin Cash',
            abbrev: 'BCH'
          },
          completion_rate: 100,
          trade_count: 1230,
          price: 1000,
          floating_price: null,
          trade_floor: 100,
          trade_ceiling: 1000,
          crypto_amount: 1,
          time_duration_choice: 300,
          payment_methods: [
            {
              payment_type: 'gcash',
              account_name: 'Stephen King',
              account_number: 123845893
            },
            {
              payment_type: 'paymaya',
              account_name: 'James Watson',
              account_number: 'jasbdvndsakXZc'
            },
            {
              payment_type: 'paypal',
              account_name: 'Stephen King',
              account_number: 'sample@gmail.com'
            }
          ]
        },
        {
          trade_type: 'BUY',
          price_type: 'FIXED',
          fiat_currency: {
            name: 'Philippine Peso',
            abbrev: 'PHP'
          },
          crypto_currency: {
            name: 'Bitcoin Cash',
            abbrev: 'BCH'
          },
          completion_rate: 100,
          trade_count: 1230,
          price: 1000,
          floating_price: null,
          trade_floor: 100,
          trade_ceiling: 1000,
          crypto_amount: 1,
          time_duration_choice: 1440,
          payment_methods: [
            {
              payment_type: 'gcash',
              account_name: 'Stephen King',
              account_number: 123845893
            },
            {
              payment_type: 'paymaya',
              account_name: 'James Watson',
              account_number: 'jasbdvndsakXZc'
            },
            {
              payment_type: 'paypal',
              account_name: 'Stephen King',
              account_number: 'sample@gmail.com'
            }
          ]
        },
        {
          trade_type: 'BUY',
          price_type: 'FIXED',
          fiat_currency: {
            name: 'Philippine Peso',
            abbrev: 'PHP'
          },
          crypto_currency: {
            name: 'Bitcoin Cash',
            abbrev: 'BCH'
          },
          completion_rate: 100,
          trade_count: 1230,
          price: 1000,
          floating_price: null,
          trade_floor: 100,
          trade_ceiling: 1000,
          crypto_amount: 1,
          time_duration_choice: 300,
          payment_methods: [
            {
              payment_type: 'gcash',
              account_name: 'James Watson',
              account_number: 123845893
            },
            {
              payment_type: 'paymaya',
              account_name: 'James Watson',
              account_number: 'jasbdvndsakXZc'
            },
            {
              payment_type: 'paypal',
              account_name: 'Stephen King',
              account_number: 'sample@gmail.com'
            }
          ]
        },
        {
          trade_type: 'SELL',
          price_type: 'FIXED',
          fiat_currency: {
            name: 'Philippine Peso',
            abbrev: 'PHP'
          },
          crypto_currency: {
            name: 'Bitcoin Cash',
            abbrev: 'BCH'
          },
          completion_rate: 100,
          trade_count: 1230,
          price: 1000,
          floating_price: null,
          trade_floor: 100,
          trade_ceiling: 1000,
          crypto_amount: 1,
          time_duration_choice: 1440,
          payment_methods: [
            {
              payment_type: 'gcash',
              account_name: 'Charlotte Bronte',
              account_number: 123845893
            },
            {
              payment_type: 'paymaya',
              account_name: 'James Watson',
              account_number: 'jasbdvndsakXZc'
            },
            {
              payment_type: 'paypal',
              account_name: 'Stephen King',
              account_number: 'sample@gmail.com'
            }
          ]
        },
        {
          trade_type: 'SELL',
          price_type: 'FIXED',
          fiat_currency: {
            name: 'Philippine Peso',
            abbrev: 'PHP'
          },
          crypto_currency: {
            name: 'Bitcoin Cash',
            abbrev: 'BCH'
          },
          completion_rate: 100,
          trade_count: 1230,
          price: 1000,
          floating_price: null,
          trade_floor: 100,
          trade_ceiling: 1000,
          crypto_amount: 1,
          time_duration_choice: 300,
          payment_methods: [
            {
              payment_type: 'gcash',
              account_name: 'Charlotte Bronte',
              account_number: 123845893
            },
            {
              payment_type: 'paymaya',
              account_name: 'James Watson',
              account_number: 'jasbdvndsakXZc'
            },
            {
              payment_type: 'paypal',
              account_name: 'Stephen King',
              account_number: 'sample@gmail.com'
            }
          ]
        },
        {
          trade_type: 'SELL',
          price_type: 'FIXED',
          fiat_currency: {
            name: 'Philippine Peso',
            abbrev: 'PHP'
          },
          crypto_currency: {
            name: 'Bitcoin Cash',
            abbrev: 'BCH'
          },
          completion_rate: 100,
          trade_count: 1230,
          price: 1000,
          floating_price: null,
          trade_floor: 100,
          trade_ceiling: 1000,
          crypto_amount: 1,
          time_duration_choice: 1440,
          payment_methods: [
            {
              payment_type: 'gcash',
              account_name: 'Jane Austin',
              account_number: 123845893
            },
            {
              payment_type: 'paymaya',
              account_name: 'James Watson',
              account_number: 'jasbdvndsakXZc'
            },
            {
              payment_type: 'paypal',
              account_name: 'Stephen King',
              account_number: 'sample@gmail.com'
            }
          ]
        }
      ],
      fiatCurrencies: [],
      listings: []
    }
  },
  async mounted () {
    this.wallet = await loadP2PWalletInfo('bch')
    console.log('wallet:', this.wallet)
    await this.fetchProfile()
    await this.fetchFiatCurrencies()
    await this.fetchStoreListings()

    this.dataLoaded = true
  },
  methods: {
    async fetchProfile () {
      const vm = this
      const headers = {
        'wallet-hash': this.wallet.walletHash
      }
      const url = vm.apiURL + '/peer'
      console.log('url:', url)
      vm.$axios.get(url, { headers: headers })
        .then(response => {
          // Create a new peer profile if peer does not exist
          if (response.data.length === 0) {
            vm.createProfile()
          } else {
            vm.peerInfo = response.data
            console.log('peerInfo: ', vm.peerInfo)
          }
        })
        .catch(error => {
          console.error(error.response)
        })
    },
    createProfile () {
      const vm = this
      const timestamp = Date.now()
      const url = vm.apiURL + '/peer/'
      signMessage(this.wallet.privateKeyWif, 'PEER_CREATE', timestamp)
        .then(result => {
          const signature = result
          const headers = {
            'wallet-hash': this.wallet.walletHash,
            timestamp: timestamp,
            signature: signature,
            'public-key': this.wallet.publicKey
          }
          console.log('headers:', headers)
          const body = {
            nickname: 'Hayao Miyazaki', // TODO: replace with the actual user inputted nickname
            address: this.wallet.address
          }
          vm.$axios.post(url, body, { headers: headers })
            .then(response => {
              vm.peerInfo = response.data
              console.log('peerInfo: ', vm.peerInfo)
            })
            .catch(error => {
              console.error(error)
              console.error(error.response)
            })
        })
    },
    // selectFiatCoin (currency) {
    //   // console.log(currency)
    //   this.selectedFiat = currency
    async fetchFiatCurrencies () {
      const vm = this
      vm.$axios.get(vm.apiURL + '/currency/fiat')
        .then(response => {
          vm.fiatCurrencies = response.data
          vm.selectedFiat = vm.fiatCurrencies[0]
        })
        .catch(error => {
          console.error(error)
          console.error(error.response)

          vm.fiatCurrencies = vm.availableFiat
          vm.selectedFiat = vm.fiatCurrencies[0]
        })
      // console.log(vm.fiatCurrencies)
    },
    async fetchStoreListings () {
      // console.log('fetching listings')
      const vm = this
      if (this.selectedFiat) {
        // console.log('entering')
        const params = {
          currency: this.selectedFiat.abbrev
        }
        vm.loading = true
        vm.$axios.get(vm.apiURL + '/ad', { params: params })
          .then(response => {
            vm.listings = response.data
            // console.log('listings: ', vm.listings)
            vm.loading = false
          })
          .catch(error => {
            // console.log('failed')
            console.error(error)
            console.error(error.response)
            vm.loading = false

            vm.listings = vm.test_data
          })
        // console.log(response)
      }
      // console.log(vm.listings)
    },
    async selectFiatCurrency (index) {
      this.selectedFiat = this.fiatCurrencies[index]
      this.listings = []
      this.fetchStoreListings()
    },
    selectListing (listing) {
      const vm = this
      // console.log(listing)
      vm.selectedListing = listing
      // console.log(vm.selectedListing)
      vm.state = vm.transactionType
    },
    // sortedListings () {
    //   const vm = this

    //   const sorted = vm.listings.filter(function (listing) {
    //     return listing.tradeType.toLowerCase() === vm.transactionType
    //   })
    //   return sorted
    // }
    getFilteredListings () {
      // console.log('filtering list')
      const vm = this
      // console.log(vm.listings)
      const filteredListings = vm.listings.filter(function (listing) {
        return listing.trade_type === vm.transactionType
      })
      // console.log(filteredListings)
      return filteredListings
    },
    formatCompletionRate (value) {
      return Math.floor(value).toString()
    }
  }
}
</script>
<style lang="scss" scoped>
.btn-custom {
  height: 40px;
  width: 47%;
  border-radius: 20px;
  border: none;
  color: #4C4F4F;
  background-color: transparent;
  outline:0;
  cursor: pointer;
  transition: .2s;
  font-weight: 500;
}
.btn-custom:hover {
  background-color: rgb(242, 243, 252);
  color: #4C4F4F;
}
.btn-custom.active-buy-btn {
  background-color: rgb(60, 100, 246) !important;
  color: #fff;
}
.btn-custom.active-sell-btn {
  background-color: #ed5f59 !important;
  color: #fff;
}
.btn-transaction {
  font-size: 16px;
  background-color: rgb(242, 243, 252);
  border-radius: 24px;
  padding: 4px;
  margin-left: 12%;
  margin-right: 12%;
  margin-top: 10px;
}
.transactions-wallet {
  color: #4C4F4F;
}
.ib-text {
  display: inline-block;
}
.col-transaction {
  padding-top: 2px;
  font-weight: 500;
}
.subtext {
  opacity: .5;
}
</style>
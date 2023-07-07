<template>
  <q-card
    class="br-15 q-pt-sm q-mx-md q-mx-none"
    :class="[ darkMode ? 'text-white pt-dark-card-2' : 'text-black',]"
    style="min-height:78vh;"
    v-if="state === 'SELECT' && !viewProfile"
  >
    <div v-if="dataLoaded">
      <div class="row no-wrap items-center q-pa-sm q-pt-md">
        <div>
          <div v-if="selectedCurrency" class="q-ml-md text-h5 md-font-size">
            {{ selectedCurrency.symbol }} <q-icon size="sm" name='mdi-menu-down'/>
          </div>
          <q-menu anchor="bottom left" self="top left" >
            <q-list class="text-h5 subtext md-font-size" :class="{'pt-dark-card': darkMode}" style="min-width: 150px;">
              <q-item
                v-for="(currency, index) in fiatCurrencies"
                :key="index"
                clickable
                v-close-popup
                @click="selectCurrency(index)"
              >
                <!-- <q-item-section :class="[$store.getters['darkmode/getStatus'] ? 'pt-dark-label' : 'pp-text']">{{ currency }} ({{ index }})</q-item-section> -->
                <q-item-section :class="[ darkMode ? 'text-white pt-dark-card-2' : 'text-black',]">{{ currency.name }} ({{ currency.symbol }})</q-item-section>
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
        <button class="btn-custom q-mt-none" :class="{'pt-dark-label': darkMode, 'active-buy-btn': transactionType == 'SELL' }" @click="transactionType='SELL'">Buy Ads</button>
        <button class="btn-custom q-mt-none" :class="{'pt-dark-label': darkMode, 'active-sell-btn': transactionType == 'BUY'}" @click="transactionType='BUY'">Sell Ads</button>
      </div>
      <div class="q-mt-md">
        <div v-if="dataLoaded == true && filteredListings().length == 0" class="relative text-center" style="margin-top: 50px;">
          <q-img class="vertical-top q-my-md" src="empty-wallet.svg" style="width: 75px; fill: gray;" />
          <p :class="{ 'text-black': !darkMode }">{{ $t('NoTransactionsToDisplay') }}</p>
        </div>
        <div v-else>
          <q-card-section style="max-height:58vh;overflow-y:auto;">
            <q-virtual-scroll :items="filteredListings()">
              <template v-slot="{ item: listing }">
                <q-item clickable @click="selectListing(listing)">
                  <q-item-section>
                    <div class="q-pb-sm q-pl-md" :style="darkMode ? 'border-bottom: 1px solid grey' : 'border-bottom: 1px solid #DAE0E7'">
                      <div class="row">
                        <div class="col ib-text">
                          <span
                            :class="{'pt-dark-label': darkMode}"
                            class="q-mb-none text-uppercase md-font-size"
                            @click.stop.prevent="viewUserProfile(listing.owner)"
                          >
                            <q-icon size="sm" name='o_account_circle' :color="darkMode ? 'blue-grey-1' : 'blue-grey-6'"/>&nbsp;{{ listing.owner }}
                          </span><br>
                          <div class="row sm-font-size">
                            <span class="q-mr-sm subtext">{{ listing.trade_count }} total trades </span>
                            <span class="q-ml-sm subtext">{{ formatCompletionRate(listing.completion_rate) }}% completion</span><br>
                          </div>
                          <span
                            :class="{'pt-dark-label': darkMode}"
                            class="col-transaction text-uppercase lg-font-size"
                          >
                            {{ listing.price }} {{ selectedCurrency.symbol }}
                            <!-- {{ listing.priceType === 'FIXED' ? listing.fixedPrice : listing.floatingPrice }} {{ listing.fiatCurrency.symbol }} -->
                          </span>
                          <span class="sm-font-size">
                            /BCH
                          </span><br>
                          <div class="row sm-font-size">
                              <span class="q-mr-md">Quantity</span>
                              <span>{{ listing.crypto_amount }} BCH</span>
                          </div>
                          <div class="row sm-font-size">
                              <span class="q-mr-md">Limit</span>
                              <span> {{ listing.trade_floor }} {{ selectedCurrency.symbol }} - {{ listing.trade_ceiling }} {{ selectedCurrency.symbol }}</span>
                          </div>
                        </div>
                      </div>
                      <div class="q-gutter-sm q-pt-sm">
                        <q-badge v-for="method in listing.payment_methods" :key="method.id"
                        rounded outline :color="transactionType === 'SELL'? 'blue': 'red'">
                        {{ method.payment_type }}
                        </q-badge>
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
  <div v-if="state !== 'SELECT' && !viewProfile">
    <FiatStoreForm
      v-on:back="state = 'SELECT'"
      :listingData="selectedListing"
      :transactionType="state"
    />
  </div>
  <!-- <div v-if="viewProfile">
    <MiscDialogs
      :type="'viewProfile'"
      v-on:back="viewProfile = false"
    />
  </div> -->
  <FiatProfileCard
    v-if="viewProfile"
    :userInfo="selectedUser"
    :type="'peer'"
    v-on:back="viewProfile = false"
  />
</template>
<script>
import FiatStoreForm from './FiatStoreForm.vue'
import ProgressLoader from '../../ProgressLoader.vue'
import FiatProfileCard from './FiatProfileCard.vue'
import { signMessage } from 'src/wallet/ramp/signature'
import { loadP2PWalletInfo } from 'src/wallet/ramp'

export default {
  components: {
    FiatStoreForm,
    ProgressLoader,
    FiatProfileCard
  },
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      apiURL: process.env.WATCHTOWER_BASE_URL + '/ramp-p2p',
      viewProfile: false,
      wallet: null,
      transactionType: 'SELL',
      dataLoaded: false,
      loading: true,
      peerProfile: null,
      selectedCurrency: null,
      state: 'SELECT', //'BUY', 'SELL'
      selectedListing: {},
      selectedUser: null,
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
      test_data: [
        {
          owner: 'Andy Webber',
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
          owner: 'Agnes Christy',
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
          owner: 'Jane Austin',
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
          owner: 'Stephen King',
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
          owner: 'James Watson',
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
          owner: 'Stephen King',
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
          owner: 'Charlotte Bronte',
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
          owner: 'James Watson',
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
          owner: 'Jane Austin',
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
    this.selectedCurrency = this.$store.getters['market/selectedCurrency']
    this.wallet = await loadP2PWalletInfo('bch')
    await this.initPeerProfile()
    await this.fetchFiatCurrencies()
    await this.fetchStoreListings()
    this.dataLoaded = true
  },
  methods: {
    async initPeerProfile () {
      this.peerProfile = await this.$store.dispatch('ramp/fetchPeerProfile', this.wallet.walletHash)
      if (!this.peerProfile.length) {
        // create peer profile if peer isnt existing
        this.createPeerProfile()
      }
    },
    createPeerProfile () {
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
    async fetchFiatCurrencies () {
      const vm = this
      vm.$axios.get(vm.apiURL + '/currency/fiat')
        .then(response => {
          vm.fiatCurrencies = response.data
          if (!vm.selectedCurrency) {
            vm.selectedCurrency = vm.fiatCurrencies[0]
          }
        })
        .catch(error => {
          console.error(error)
          console.error(error.response)

          vm.fiatCurrencies = vm.availableFiat
          if (!vm.selectedCurrency) {
            vm.selectedCurrency = vm.fiatCurrencies[0]
          }
        })
      // console.log(vm.fiatCurrencies)
    },
    async fetchStoreListings () {
      const vm = this
      if (this.selectedCurrency) {
        const params = {
          currency: this.selectedCurrency.symbol
        }
        vm.loading = true
        vm.$axios.get(vm.apiURL + '/ad', { params: params })
          .then(response => {
            vm.listings = response.data
            // console.log('listings: ', vm.listings)
            vm.loading = false
          })
          .catch(error => {
            console.error(error.response)
            vm.loading = false
          })
      }
      // console.log(vm.listings)
    },
    async selectCurrency (index) {
      this.selectedCurrency = this.fiatCurrencies[index]
      this.listings = []
      this.fetchStoreListings()
    },
    selectListing (listing) {
      const vm = this

      vm.selectedListing = listing
      vm.state = vm.transactionType === 'SELL' ? 'BUY' : 'SELL'
    },
    filteredListings () {
      const vm = this
      const filteredListings = vm.listings.filter(function (listing) {
        return listing.trade_type === vm.transactionType
      })
      return filteredListings
    },
    formatCompletionRate (value) {
      return Math.floor(value).toString()
    },
    updateNickname (info) {
      this.$store.commit('global/editRampNickname', info.nickname)
      // this.proceed = true
    },
    viewUserProfile (user) {
      this.viewProfile = true
      this.selectedUser = {
        name: user
      }
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

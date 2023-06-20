<template>
  <q-card
    class="br-15 q-pt-sm q-mx-md q-mx-none"
    :class="[ darkMode ? 'text-white pt-dark-card-2' : 'text-black',]"
    style="min-height:78vh;"
    v-if="state === 'select'"
  >
    <div class="row no-wrap items-center q-pa-sm q-pt-md">
      <div>
        <div class="q-ml-md text-h5" style="font-size: 15px;">
          {{ availableFiat[selectedFiat] }} <q-icon size="sm" name='mdi-menu-down'/>
        </div>
        <q-menu anchor="bottom left" self="top left" >
          <q-list class="text-h5" :class="{'pt-dark-card': darkMode}" style="min-width: 150px; font-size: 15px;">
            <q-item
              v-for="(currency, index) in availableFiat"
              :key="index"
              clickable
              v-close-popup
              @click="selectFiatCoin(index)"
            >
            <!-- <q-item-section :class="[$store.getters['darkmode/getStatus'] ? 'pt-dark-label' : 'pp-text']">{{ currency }} ({{ index }})</q-item-section> -->
            <q-item-section :class="[ darkMode ? 'text-white pt-dark-card-2' : 'text-black',]">{{ currency }} ({{ index }})</q-item-section>
            </q-item>
          </q-list>
        </q-menu>
      </div>
      <q-space />
      <div class="q-pr-md">
        <q-icon size="sm" name='sym_o_filter_list'/>
      </div>
    </div>
    <div class="br-15 q-py-md q-gutter-sm q-mx-lg text-center btn-transaction" :class="{'pt-dark-card': darkMode}" style="font-size: 15px;">
      <button class="btn-custom q-mt-none" :class="{'pt-dark-label': darkMode, 'active-buy-btn': transactionType == 'BUY' }" @click="transactionType='BUY'">Buy BCH</button>
      <button class="btn-custom q-mt-none" :class="{'pt-dark-label': darkMode, 'active-sell-btn': transactionType == 'SELL'}" @click="transactionType='SELL'">Sell BCH</button>
    </div>
    <div class="q-mt-md">
      <div v-if="listings.length === 0" class="relative text-center" style="margin-top: 50px;">
        <q-img class="vertical-top q-my-md" src="empty-wallet.svg" style="width: 75px; fill: gray;" />
        <p :class="{ 'text-black': !darkMode }">{{ $t('NoTransactionsToDisplay') }}</p>
      </div>
      <div v-else>
        <q-card-section style="max-height:60vh;overflow-y:auto;">
          <q-virtual-scroll :items="sortedListings()">
            <template v-slot="{ item: listing }">
              <q-item clickable @click="selectListing(listing)">
                <q-item-section>
                  <div class="q-pt-sm q-pb-sm q-pl-md" :style="darkMode ? 'border-bottom: 1px solid grey' : 'border-bottom: 1px solid #DAE0E7'">
                    <div class="row">
                      <div class="col ib-text">
                        <span
                          :class="{'pt-dark-label': darkMode}"
                          class="q-mb-none text-uppercase"
                          style="font-size: 13px;">
                          {{ listing.owner }}
                        </span><br>
                        <div class="row">
                            <span class="q-mr-sm subtext">{{ listing.trade_count }} total trades </span>
                            <span class="q-ml-sm subtext">{{ formatCompletionRate(listing.completion_rate) }}% completion</span><br>
                        </div>
                        <span
                          :class="{'pt-dark-label': darkMode}"
                          class="col-transaction text-uppercase"
                          style="font-size: 20px;">
                          {{ listing.fixed_price }} {{ selectedFiat }}
                        </span>
                        <span style="font-size: 12px;">/BCH</span><br>
                        <div class="row">
                            <span class="col-1 subtext">Quantity</span>
                            <span class="col q-mx-md subtext">{{ listing.crypto_amount }} BCH</span>
                        </div>
                        <div class="row">
                            <span class="col-1 subtext">Limit</span>
                            <span class="col q-mx-none subtext"> {{ listing.trade_floor }} {{ selectedFiat }} - {{ listing.trade_ceiling }} {{ selectedFiat }}</span>
                        </div>
                      </div>
                      <!-- <div class="text-right">
                        <span class="subtext">Quantity: {{ listing.crypto_amount }} BCH</span><br>
                      </div> -->
                    </div>
                    <div class="q-gutter-sm q-pt-sm">
                      <q-badge v-for="method in listing.payment_methods" :key="method.id"
                      rounded outline :color="transactionType === 'BUY'? 'blue': 'red'">
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
  </q-card>
  <!-- Buy BCH Here -->
  <div v-if="state === 'buy'">
    <FiatStoreBuy
      v-on:back="state = 'select'"
      :listingData="selectedListing"
    />
  </div>
  <!-- Sell BCH Here -->
  <div v-if="state === 'sell'">
    <FiatStoreSell
      v-on:back="state = 'select'"
      :listingData="selectedListing"
    />
  </div>
</template>
<script>
import FiatStoreBuy from './FiatStoreBuy.vue'
import FiatStoreSell from './FiatStoreSell.vue'

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      apiURL: process.env.WATCHTOWER_BASE_URL,
      transactionType: 'BUY',
      selectedFiat: 'USD',
      state: 'select',
      selectedListing: {},
      availableFiat: {
        PHP: 'Philippine Peso',
        USD: 'United States Dollar',
        CAD: 'Canadian Dollar',
        JPY: 'Japanese Yen',
        RUB: 'Russian Ruble'
      },
      listings: []
    }
  },
  components: {
    FiatStoreBuy,
    FiatStoreSell
  },
  async mounted () {
    this.fetchStoreListings()
  },
  methods: {
    fetchStoreListings () {
      const vm = this
      vm.$axios.get(vm.apiURL + '/ramp-p2p/ad')
        .then(response => {
          vm.listings = response.data
        })
        .catch(error => {
          console.error(error)
        })
    },
    selectFiatCoin (currency) {
      console.log(currency)
      this.selectedFiat = currency
    },
    selectListing (listing) {
      const vm = this
      // console.log(listing)
      vm.selectedListing = listing
      vm.state = vm.transactionType
    },
    sortedListings () {
      const vm = this
      const sorted = vm.listings.filter(function (listing) {
        return listing.trade_type === vm.transactionType
      })
      return sorted
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
  font-size: 13px;
  opacity: .5;
}
</style>

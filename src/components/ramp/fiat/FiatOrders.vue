<template>
    <q-card
      class="br-15 q-pt-sm q-mx-md q-mx-none"
      :class="[ darkMode ? 'text-white pt-dark-card-2' : 'text-black',]"
      style="min-height:78vh;"
    >
      <div>
        <div class="br-15 q-py-md q-gutter-sm q-mx-lg text-center btn-transaction" :class="{'pt-dark-card': darkMode}" style="font-size: 15px;">
          <button class="btn-custom q-mt-none" :class="{'pt-dark-label': darkMode, 'active-buy-btn': transactionType == 'BUY' }" @click="transactionType='BUY'">Buy Orders</button>
          <button class="btn-custom q-mt-none" :class="{'pt-dark-label': darkMode, 'active-sell-btn': transactionType == 'SELL'}" @click="transactionType='SELL'">Sell Orders</button>
        </div>
      </div>
      <div class="q-mt-md">
        <div v-if="sortedListings().length === 0" class="relative text-center" style="margin-top: 50px;">
          <q-img class="vertical-top q-my-md" src="empty-wallet.svg" style="width: 75px; fill: gray;" />
          <p :class="{ 'text-black': !darkMode }">{{ $t('NoTransactionsToDisplay') }}</p>
        </div>
        <div v-else>
          <q-card-section style="max-height:60vh;overflow-y:auto;">
            <q-virtual-scroll :items="sortedListings()">
              <template v-slot="{ item: listing }">
                <q-item clickable>
                  <q-item-section>
                    <div class="q-pt-sm q-pb-sm" :style="darkMode ? 'border-bottom: 1px solid grey' : 'border-bottom: 1px solid #DAE0E7'">
                      <div class="row">
                        <div class="col ib-text">
                          <span
                            :class="{'pt-dark-label': darkMode}"
                            class="q-mb-none text-uppercase"
                            style="font-size: 13px;">
                            {{ listing.ad_owner_name }}
                          </span><br>
                          <div
                            :class="{'pt-dark-label': darkMode}"
                            class="col-transaction text-uppercase"
                            style="font-size: 20px;">
                            {{ orderFiatAmount(listing.locked_price, listing.crypto_amount) }} {{ listing.fiat_currency.abbrev }}
                          </div>
                          <div style="font-size: 12px;">&asymp; {{ listing.crypto_amount }} {{ listing.crypto_currency.abbrev }}</div>
                          <div style="font-size: 12px;"> {{ listing.locked_price }} {{ listing.fiat_currency.abbrev }}/{{ listing.crypto_currency.abbrev }}</div>
                          <div class="row">
                            <span class="col-1">Arbiter</span>
                            <span class="col q-ml-md">{{ listing.arbiter }}</span>
                          </div>
                        </div>
                        <div class="text-right">
                          <!-- <span class="subtext">Quantity: {{ listing.quantity }} BCH</span><br> -->
                          <!-- <span class="subtext">{{ listing.status }}</span> -->
                          <!-- <span class="status-text" v-if="listing.status === 'released'">RELEASED</span> -->
                          <!-- <span class="status-text" v-else-if="listing.status.includes('confirmation')">PENDING CONFIRMATION</span> -->
                          <!-- <span class="status-text" v-else-if="listing.status.startsWith('pending-')">{{ listing.status.replace('-', ' ').toUpperCase() }}</span> -->
                        </div>
                      </div>
                      <div class="q-gutter-sm q-pt-sm">
                        <!-- <q-badge v-for="method in listing.paymentMethods" rounded outline :color="transactionType === 'BUY'? 'blue': 'red'" :label="method" /> -->
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
</template>
<script>
export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      apiURL: process.env.WATCHTOWER_BASE_URL,
      transactionType: 'BUY',
      // listings: [],
      listings: [
        {
          name: 'Anna Mondover',
          trades: 1230,
          completion: 97.5,
          price: '6991.79 PHP',
          quantity: 1,
          limit: '500 PHP to 10000 PHP',
          paymentMethods: [
            'paypal',
            'gcash',
            'paymaya'
          ],
          type: 'buy',
          status: 'released'
        },
        {
          name: 'Nana Mondover',
          trades: 1230,
          completion: 97.5,
          price: '6991.79 PHP',
          quantity: 1.4,
          limit: '500 PHP to 10000 PHP',
          paymentMethods: [
            'paypal',
            'gcash',
            'paymaya'
          ],
          type: 'sell',
          status: 'released'
        },{
          name: 'Anna Mondover',
          trades: 1230,
          completion: 97.5,
          price: '6991.79 PHP',
          quantity: 1,
          limit: '500 PHP to 10000 PHP',
          paymentMethods: [
            'paypal',
            'gcash',
            'paymaya'
          ],
          type: 'buy',
          status: 'pending-confirmation'
        },{
          name: 'Anna Mondover',
          trades: 1230,
          completion: 97.5,
          price: '6991.79 PHP',
          quantity: 1,
          limit: '500 PHP to 10000 PHP',
          paymentMethods: [
            'paypal',
            'gcash',
            'paymaya'
          ],
          type: 'sell',
          status: 'pending-payment'
        },{
          name: 'Anna Mondover',
          trades: 1230,
          completion: 97.5,
          price: '6991.79 PHP',
          quantity: 1.4,
          limit: '500 PHP to 10000 PHP',
          paymentMethods: [
            'paypal',
            'gcash',
            'paymaya'
          ],
          type: 'sell',
          status: 'pending-release'
        },{
          name: 'Anna Mondover',
          trades: 1230,
          completion: 97.5,
          price: '6991.79 PHP',
          quantity: 1.6,
          limit: '500 PHP to 10000 PHP',
          paymentMethods: [
            'paypal',
            'gcash',
            'paymaya'
          ],
          type: 'buy',
          status: 'released'
        },{
          name: 'Anna Mondover',
          trades: 1230,
          completion: 97.5,
          price: '6991.79 PHP',
          quantity: 1,
          limit: '500 PHP to 10000 PHP',
          paymentMethods: [
            'paypal',
            'gcash',
            'paymaya'
          ],
          type: 'sell',
          status: 'pending-confirmation'
        },{
          name: 'Anna Mondover',
          trades: 1230,
          completion: 97.5,
          price: '6991.79 PHP',
          quantity: 1,
          limit: '500 PHP to 10000 PHP',
          paymentMethods: [
            'paypal',
            'gcash',
            'paymaya'
          ],
          type: 'sell',
          status: 'pending-release'
        },
      ]
    }
  },
  mounted () {
    this.fetchUserOrders()
  },
  methods: {
    fetchUserOrders () {
      const vm = this
      const headers = {
        'wallet-hash': 'kipwu68ejj15k9ps0ffupuawmqusv4n1',
        timestamp: 1687247466349,
        signature: '3044022046626064beef19b37f4fb1705ea25275bbda30a3465cf27621a4629f9bba29f60220425289bb9904804274fc67cb38d4f55fde7f99fbafaeb8610c86d0f056902bb8'
      }
      vm.$axios.get(vm.apiURL + '/ramp-p2p/order', { headers: headers })
        .then(response => {
          vm.listings = response.data
          console.log('listings: ', vm.listings)
        })
        .catch(error => {
          console.error(error)
        })
    },
    orderFiatAmount (lockedPrice, cryptoAmount) {
      return lockedPrice * cryptoAmount
    },
    sortedListings () {
      const vm = this
      const sorted = vm.listings.filter(function (listing) {
        return listing.trade_type === vm.transactionType
      })
      console.log('sorted: ', sorted)
      return sorted
    }
  }
}
</script>
<style lang="scss" scoped>
.btn-transaction {
  font-size: 16px;
  background-color: rgb(242, 243, 252);
  border-radius: 24px;
  padding: 4px;
  margin-left: 12%;
  margin-right: 12%;
  margin-top: 10px;
}
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
.col-transaction {
  padding-top: 2px;
  font-weight: 500;
}
.subtext {
  font-size: 13px;
  opacity: .5;
}
.status-text {
  font-weight: 500;
  font-size: 13px;
  opacity: .5;
}
</style>

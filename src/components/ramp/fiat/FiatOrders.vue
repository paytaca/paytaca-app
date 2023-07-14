<template>
    <q-card
      class="br-15 q-pt-sm q-mx-md q-mx-none"
      :class="[ darkMode ? 'text-white pt-dark-card-2' : 'text-black',]"
      style="min-height:78vh;"
    >
      <div>
        <div class="br-15 q-py-md q-gutter-sm q-mx-lg text-center btn-transaction" :class="{'pt-dark-card': darkMode}" style="font-size: 15px;">
          <button class="btn-custom q-mt-none" :class="{'pt-dark-label': darkMode, 'active-transaction-btn': statusType == 'ONGOING' }" @click="statusType='ONGOING'">Ongoing</button>
          <button class="btn-custom q-mt-none" :class="{'pt-dark-label': darkMode, 'active-transaction-btn': statusType == 'COMPLETED'}" @click="statusType='COMPLETED'">Completed</button>
        </div>
      </div>
      <div v-if="loading">
        <div class="row justify-center q-py-lg" style="margin-top: 50px">
          <ProgressLoader/>
        </div>
      </div>
      <div v-else class="q-mt-md">
        <div v-if="filteredListings().length == 0" class="relative text-center" style="margin-top: 50px;">
          <q-img class="vertical-top q-my-md" src="empty-wallet.svg" style="width: 75px; fill: gray;" />
          <p :class="{ 'text-black': !darkMode }">No Orders to Display</p>
        </div>
        <div v-else>
          <q-card-section style="max-height:60vh;overflow-y:auto;">
            <q-virtual-scroll :items="filteredListings()">
              <template v-slot="{ item: listing }">
                <q-item clickable>
                  <q-item-section>
                    <div class="q-pt-sm q-pb-sm" :style="darkMode ? 'border-bottom: 1px solid grey' : 'border-bottom: 1px solid #DAE0E7'">
                      <div class="row q-mx-md">
                        <div class="col ib-text">
                          <span
                            :class="{'pt-dark-label': darkMode}"
                            class="q-mb-none md-font-size">
                            {{ listing.ad_owner_name }}
                          </span>
                          <div
                            :class="{'pt-dark-label': darkMode}"
                            class="col-transaction text-uppercase lg-font-size"
                            style="font-size: 20px;"
                            :style="amountColor(listing.trade_type)">
                            {{ formattedCurrency(orderFiatAmount(listing.locked_price, listing.crypto_amount)) }}
                          </div>
                          <div class="sm-font-size">
                            <!-- &asymp; -->
                            <!-- {{ listing.crypto_amount }} {{ listing.crypto_currency.abbrev }}</div> -->
                            {{ formattedCurrency(listing.crypto_amount, false) }} BCH</div>
                          <div style="font-size: 12px;"> {{ formattedCurrency(listing.locked_price) }}/BCH</div>
                          <div class="row" style="font-size: 12px; color: grey">{{ formattedDate(listing.created_at) }}</div>
                        </div>
                        <div class="text-right">
                          <span class="row subtext" v-if="isCompleted(listing.status) == false && listing.expiration_date != null">
                            <span v-if="isExpired(listing.expiration_date) == false" class="q-mr-xs">Expires in </span>
                            <span v-else class="q-mr-xs">Expired for</span>
                            <span>{{ formatExpiration(listing.expiration_date) }}</span>
                          </span>
                          <span class="bold-text subtext md-font-size" style=";">{{ listing.status }}</span>
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
import ProgressLoader from '../../ProgressLoader.vue'
import { loadP2PWalletInfo, formatCurrency, formatDate } from 'src/wallet/ramp'
import { signMessage } from '../../../wallet/ramp/signature.js'

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      apiURL: process.env.WATCHTOWER_BASE_URL + '/ramp-p2p',
      selectedCurrency: this.$store.getters['market/selectedCurrency'],
      statusType: 'ONGOING',
      loading: false,
      transactionType: '',
      listings: [],
      wallet: null
    }
  },
  async mounted () {
    const vm = this
    vm.loading = true
    const walletInfo = vm.$store.getters['global/getWallet']('bch')
    vm.wallet = await loadP2PWalletInfo(walletInfo)
    vm.fetchUserOrders()
  },
  components: {
    ProgressLoader
  },
  methods: {
    async fetchUserOrders () {
      const vm = this

      // const walletInfo = this.$store.getters['global/getWallet']('bch')
      // const wallet = await loadP2PWalletInfo(walletInfo)
      const timestamp = Date.now()
      const signature = await signMessage(vm.wallet.privateKeyWif, 'ORDER_LIST', timestamp)

      const headers = {
        'wallet-hash': vm.wallet.walletHash,
        timestamp: timestamp,
        signature: signature
      }
      vm.loading = true

      vm.$axios.get(vm.apiURL + '/order', { headers: headers })
        .then(response => {
          vm.listings = response.data
          console.log(vm.listings)
          vm.loading = false
        })
        .catch(error => {
          console.error(error)
          vm.loading = false
        })
    },
    getElapsedTime (expirationDate) {
      const currentTime = new Date().getTime() // Replace with your start timestamp
      expirationDate = new Date(expirationDate).getTime()
      const elapsedMilliseconds = expirationDate - currentTime
      const elapsedMinutes = Math.floor(elapsedMilliseconds / (1000 * 60))
      let days = 0
      const hours = Math.floor(elapsedMinutes / 60)
      const minutes = elapsedMinutes % 60
      if (hours * -1 > 24) days = hours % 24
      return [days, hours, minutes]
    },
    amountColor (tradeType) {
      if (tradeType === 'BUY') {
        return 'color: blue;'
      } else {
        return 'color: red;'
      }
    },
    formatExpiration (expirationDate) {
      let [days, hours, minutes] = this.getElapsedTime(expirationDate)
      if (days < 0) days = days * -1
      if (hours < 0) hours = hours * -1
      if (minutes < 0) minutes = minutes * -1
      let formattedElapsedTime = ''
      if (days > 0) {
        formattedElapsedTime = `${days} days`
      } else {
        formattedElapsedTime = `${hours} hours ${minutes} minutes`
      }
      return formattedElapsedTime
    },
    isExpired (expirationDate, status) {
      const [days, hours, minutes] = this.getElapsedTime(expirationDate)
      if (days < 0 || hours < 0 || minutes < 0) return true
      return false
    },
    isCompleted (status) {
      if (status === 'Released' || status === 'Refunded' || status === 'Canceled') return true
      return false
    },
    formattedDate (value) {
      return formatDate(value)
    },
    formattedCurrency (value, fiat = true) {
      if (fiat) {
        const currency = this.selectedCurrency.symbol
        return formatCurrency(value, currency)
      } else {
        return formatCurrency(value)
      }
    },
    orderFiatAmount (lockedPrice, cryptoAmount) {
      // console.log('lockedPrice:', lockedPrice, 'cryptoAMount:', cryptoAmount)
      return lockedPrice * cryptoAmount
    },
    filteredListings () {
      const vm = this
      const sorted = vm.listings.filter(function (listing) {
        if (vm.statusType === 'ONGOING') {
          return !vm.isCompleted(listing.status)
        } else {
          return vm.isCompleted(listing.status)
        }
      })
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
.btn-custom.active-transaction-btn {
  background-color: rgb(13,71,161) !important;
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
<!-- Todo: Sort data, ongoing/completed -->

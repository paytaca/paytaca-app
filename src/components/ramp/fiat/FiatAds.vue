<template>
  <q-card
    class="br-15 q-pt-sm q-mx-md q-mx-none"
    :class="[ darkMode ? 'text-white pt-dark-card-2' : 'text-black',]"
    style="min-height:78vh;">
    <div v-if="state !== 'selection'">
      <FiatAdsForm
        v-on:back="state = 'selection'"
        :adsState="state"
        :transactionType="transactionType"
      />
    </div>
    <div v-if="state === 'selection'">
      <div class="row items-center justify-between q-mt-md q-mr-lg q-pb-xs">
        <q-icon class="q-pl-lg" size="sm" name='sym_o_filter_list'/>
        <q-btn
          rounded
          no-caps
          padding="sm"
          class="q-ml-md"
          icon="add"
          :class="transactionType === 'BUY'? 'buy-add-btn': 'sell-add-btn'"
          @click="state = 'create'"
        />
      </div>
      <div class="br-15 q-py-md q-gutter-sm q-mx-lg text-center btn-transaction" :class="{'pt-dark-card': darkMode}" style="font-size: 15px;">
        <button class="btn-custom q-mt-none" :class="{'pt-dark-label': darkMode, 'active-buy-btn': transactionType == 'BUY' }" @click="transactionType='BUY'">Buy</button>
        <button class="btn-custom q-mt-none" :class="{'pt-dark-label': darkMode, 'active-sell-btn': transactionType == 'SELL'}" @click="transactionType='SELL'">Sell</button>
      </div>
      <div v-if="loading">
        <div class="row justify-center q-py-lg" style="margin-top: 50px">
          <ProgressLoader/>
        </div>
      </div>
      <div v-else class="q-mt-md">
        <div v-if="checkEmptyListing()" class="relative text-center" style="margin-top: 50px;">
          <q-img class="vertical-top q-my-md" src="empty-wallet.svg" style="width: 75px; fill: gray;" />
          <p :class="{ 'text-black': !darkMode }">No Ads to display</p>
        </div>
        <div v-else>
          <q-card-section style="max-height:58vh;overflow-y:auto;">
            <!-- <q-virtual-scroll :items="transactionType === 'BUY'? buyListings : sellListings"> -->
            <q-virtual-scroll :items="listings">
              <template v-slot="{ item: listing, index }">
                <q-item>
                  <q-item-section>
                    <div class="q-pt-sm q-pb-sm" :style="darkMode ? 'border-bottom: 1px solid grey' : 'border-bottom: 1px solid #DAE0E7'">
                      <div class="row">
                        <div class="col ib-text">
                          <span
                            :class="{'pt-dark-label': darkMode}"
                            class="q-mb-none text-uppercase"
                            style="font-size: 13px;">
                            {{ listing.price_type }}
                          </span><br>
                          <span
                            :class="{'pt-dark-label': darkMode}"
                            class="col-transaction text-uppercase"
                            style="font-size: 16px;">
                            {{ formattedCurrency(listing.price) }}
                          </span>
                          <span style="font-size: 12px;">
                            /BCH
                          </span>
                          <div class="row sm-font-size">
                            <span class="q-mr-md">Quantity</span>
                            <span>{{ formattedCurrency(listing.crypto_amount, false) }} BCH</span>
                          </div>
                          <div class="row sm-font-size">
                            <span class="q-mr-md">Limit</span>
                            <span> {{ formattedCurrency(listing.trade_floor) }} - {{ formattedCurrency(listing.trade_ceiling) }} </span>
                          </div>
                          <div class="row" style="font-size: 12px; color: grey">{{ formattedDate(listing.created_at) }}</div>
                        </div>
                        <div class="text-right">
                          <q-btn
                            outline
                            rounded
                            padding="sm"
                            icon="edit"
                            size="sm"
                            color="grey-6"
                            @click="editAds(index)"
                          />
                          <q-btn
                            outline
                            rounded
                            padding="sm"
                            size="sm"
                            icon="delete"
                            color="grey-6"
                            class="q-ml-xs"
                            @click="deleteAds(index)"
                          />
                        </div>
                      </div>
                      <div class="q-gutter-sm q-pt-sm">
                        <!-- <q-badge v-for="method in listing.payment_methods" rounded outline :color="transactionType === 'buy'? 'blue': 'red'" :label="method.payment_type" /> -->
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
  </q-card>

  <FiatAdsDialogs
    v-if="openDialog === true"
    :type="dialogName"
    v-on:back="openDialog = false"
    v-on:selected-option="receiveDialogOption"
  />
</template>
<script>
import FiatAdsDialogs from './dialogs/FiatAdsDialogs.vue'
import FiatAdsForm from './FiatAdsForm.vue'
import ProgressLoader from '../../ProgressLoader.vue'
import { signMessage } from '../../../wallet/ramp/signature.js'
import { loadP2PWalletInfo, formatCurrency, formatDate } from 'src/wallet/ramp'

export default {
  components: {
    FiatAdsForm,
    ProgressLoader,
    FiatAdsDialogs
  },
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      apiURL: process.env.WATCHTOWER_BASE_URL + '/ramp-p2p',
      selectedCurrency: this.$store.getters['market/selectedCurrency'],
      wallet: null,
      openDialog: false,
      dialogName: '',
      selectedIndex: null,
      editListing: {},
      transactionType: 'BUY',
      state: 'selection', // 'create' 'edit'
      buyListings: [],
      sellListings: [],
      listings: [],
      loading: false
    }
  },
  async mounted () {
    const vm = this
    vm.loading = true
    const walletInfo = vm.$store.getters['global/getWallet']('bch')
    vm.wallet = await loadP2PWalletInfo(walletInfo)
    vm.fetchAds()
  },
  watch: {
    state (val) {
      if (val === 'create') {
        this.$router.push({ name: 'ads-create' })
      }
    },
    transactionType (val) {
      // console.log('transactionType:', val)
      this.fetchAds()
    }
  },
  methods: {
    async fetchAds () {
      const vm = this
      const timestamp = Date.now()
      const signature = await signMessage(this.wallet.privateKeyWif, 'AD_LIST', timestamp)
      const headers = {
        'wallet-hash': this.wallet.walletHash,
        timestamp: timestamp,
        signature: signature
      }
      const params = { trade_type: vm.transactionType }
      vm.$axios.get(vm.apiURL + '/ad', { params: params, headers: headers })
        .then(response => {
          vm.listings = response.data
          // console.log('listings: ', vm.listings)
          vm.loading = false
        })
        .catch(error => {
          console.error(error)
          console.error(error.response.data)
          vm.loading = false
        })
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
    sortedListings (type) {
      const vm = this

      const sorted = vm.listings.filter(function (test) {
        return test.trade_type.toLowerCase() === type
      })
      return sorted
    },
    editAds (index) {
      const vm = this
      vm.state = 'edit'
      // console.log('edit')

      switch (vm.transactionType) {
        case 'BUY':
          vm.editListing = vm.buyListings[index]
          break
        case 'SELL':
          vm.editListing = vm.sellListings[index]
          break
      }
    },
    deleteAds (index) {
      const vm = this
      // console.log('delete')

      vm.dialogName = 'deleteAd'
      vm.openDialog = true
      vm.selectedIndex = index
    },
    checkEmptyListing () {
      const vm = this
      // if (vm.transactionType === 'BUY') {
      //   return vm.buyListings.length === 0
      // } else {
      //   return vm.sellListings.length === 0
      // }
      return vm.listings.length === 0
    },
    receiveDialogOption (option) {
      const vm = this

      switch (vm.dialogName) {
        case 'deleteAd':
          if (option === 'confirm') {
            if (vm.transactionType === 'BUY') {
              vm.buyListings.splice(vm.selectedIndex, 1)
            } else {
              vm.sellListings.splice(vm.selectedIndex, 1)
            }

            setTimeout(() => {
              vm.dialogName = 'notifyDeleteAd'
              vm.openDialog = true
            }, 50)
          }
          break
      }
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
  opacity: .5;
}
.buy-add-btn {
  background-color: rgb(60, 100, 246);
  color: white;
}
.sell-add-btn {
  background-color: #ed5f59;
  color: white;
}
</style>

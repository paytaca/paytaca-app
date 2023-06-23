<template>
  <q-card
    class="br-15 q-pt-sm q-mx-md q-mx-none"
    :class="[ darkMode ? 'text-white pt-dark-card-2' : 'text-black',]"
    style="min-height:78vh;"
  >
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
          :class="transactionType === 'buy'? 'buy-add-btn': 'sell-add-btn'"
          @click="state = 'create'"
        />
      </div>
      <div class="br-15 q-py-md q-gutter-sm q-mx-lg text-center btn-transaction" :class="{'pt-dark-card': darkMode}" style="font-size: 15px;">
        <button class="btn-custom q-mt-none" :class="{'pt-dark-label': darkMode, 'active-buy-btn': transactionType == 'buy' }" @click="transactionType='buy'">Buy</button>
        <button class="btn-custom q-mt-none" :class="{'pt-dark-label': darkMode, 'active-sell-btn': transactionType == 'sell'}" @click="transactionType='sell'">Sell</button>
      </div>
      <div class="q-mt-md">
        <div v-if="checkEmptyListing()" class="relative text-center" style="margin-top: 50px;">
          <q-img class="vertical-top q-my-md" src="empty-wallet.svg" style="width: 75px; fill: gray;" />
          <p :class="{ 'text-black': !darkMode }">{{ $t('NoTransactionsToDisplay') }}</p>
        </div>
        <div v-else>
          <q-card-section style="max-height:58vh;overflow-y:auto;">
            <q-virtual-scroll :items="transactionType === 'buy'? buyListings : sellListings">
              <template v-slot="{ item: listing, index }">
                <q-item>
                  <q-item-section>
                    <div class="q-pt-sm q-pb-sm" :style="darkMode ? 'border-bottom: 1px solid grey' : 'border-bottom: 1px solid #DAE0E7'">
                      <div class="row">
                        <div class="col ib-text">
                          <span
                            :class="{'pt-dark-label': darkMode}"
                            class="q-mb-none text-uppercase"
                            style="font-size: 13px;"
                          >
                            Price
                          </span><br>
                          <span
                            :class="{'pt-dark-label': darkMode}"
                            class="col-transaction text-uppercase"
                            style="font-size: 16px;"
                          >
                            {{ listing.fixedPrice }} {{ listing.fiatCurrency.abbrev }}
                          </span>
                          <span style="font-size: 12px;">
                            /BCH
                          </span>
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
                        <q-badge v-for="method in listing.paymentMethods" rounded outline :color="transactionType === 'buy'? 'blue': 'red'" :label="method.name" />
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
// import FiatAdsBuy from './FiatAdsBuy.vue'
// import FiatAdsSell from './FiatAdsSell.vue'
import FiatAdsDialogs from './dialogs/FiatAdsDialogs.vue'
import FiatAdsForm from './FiatAdsForm.vue'

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      openDialog: false,
      dialogName: '',
      selectedIndex: null,
      editListing: {},
      transactionType: 'buy',
      state: 'selection', // 'create' 'edit'
      buyListings: [],
      sellListings: [],
      // listings: [],
      listings: [
        {
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
          fixedPrice: 1000, // Work on later
          floatingPrice: null,
          tradeFloor: 100,
          tradeCeiling: 1000,
          cryptoAmount: 1,
          timeDurationChoice: 1440,
          paymentMethods: [
            {
              name: 'gcash',
              account_name: 'Andy Webber',
              account_number: 123845893
            },
            {
              name: 'paymaya',
              account_name: 'James Watson',
              account_number: 'jasbdvndsakXZc'
            },
            {
              name: 'paypal',
              account_name: 'Stephen King',
              account_number: 'sample@gmail.com'
            }
          ]
        },
        {
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
          fixedPrice: 1000,
          floatingPrice: null,
          tradeFloor: 100,
          tradeCeiling: 1000,
          cryptoAmount: 1,
          time_duration_choice: 1440,
          paymentMethods: [
            {
              name: 'gcash',
              account_name: 'Agnes Christy',
              account_number: 123845893
            },
            {
              name: 'paymaya',
              account_name: 'Jane Austin',
              account_number: 'jasbdvndsakXZc'
            },
            {
              name: 'paypal',
              account_name: 'Charlotte Bronte',
              account_number: 'sample@gmail.com'
            }
          ]
        },
        {
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
          fixedPrice: 1000,
          floatingPrice: null,
          tradeFloor: 100,
          tradeCeiling: 1000,
          cryptoAmount: 1,
          time_duration_choice: 1440,
          paymentMethods: [
            {
              name: 'gcash',
              account_name: 'Jane Austin',
              account_number: 123845893
            },
            {
              name: 'paymaya',
              account_name: 'James Watson',
              account_number: 'jasbdvndsakXZc'
            },
            {
              name: 'paypal',
              account_name: 'Stephen King',
              account_number: 'sample@gmail.com'
            }
          ]
        },
        {
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
          fixedPrice: 1000,
          floatingPrice: null,
          tradeFloor: 100,
          tradeCeiling: 1000,
          cryptoAmount: 1,
          timeDurationChoice: 1440,
          paymentMethods: [
            {
              name: 'gcash',
              account_name: 'Stephen King',
              account_number: 123845893
            },
            {
              name: 'paymaya',
              account_name: 'James Watson',
              account_number: 'jasbdvndsakXZc'
            },
            {
              name: 'paypal',
              account_name: 'Stephen King',
              account_number: 'sample@gmail.com'
            }
          ]
        },
        {
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
          fixedPrice: 1000,
          floatingPrice: null,
          tradeFloor: 100,
          tradeCeiling: 1000,
          cryptoAmount: 1,
          time_duration_choice: 1440,
          paymentMethods: [
            {
              name: 'gcash',
              account_name: 'Stephen King',
              account_number: 123845893
            },
            {
              name: 'paymaya',
              account_name: 'James Watson',
              account_number: 'jasbdvndsakXZc'
            },
            {
              name: 'paypal',
              account_name: 'Stephen King',
              account_number: 'sample@gmail.com'
            }
          ]
        },
        {
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
          fixedPrice: 1000,
          floatingPrice: null,
          tradeFloor: 100,
          tradeCeiling: 1000,
          cryptoAmount: 1,
          time_duration_choice: 1440,
          paymentMethods: [
            {
              name: 'gcash',
              account_name: 'James Watson',
              account_number: 123845893
            },
            {
              name: 'paymaya',
              account_name: 'James Watson',
              account_number: 'jasbdvndsakXZc'
            },
            {
              name: 'paypal',
              account_name: 'Stephen King',
              account_number: 'sample@gmail.com'
            }
          ]
        },
        {
          tradeType: 'SELL',
          priceType: 'FIXED',
          fiatCurrency: {
            name: 'Philippine Peso',
            abbrev: 'PHP'
          },
          cryptoCurrency: {
            name: 'Bitcoin Cash',
            abbrev: 'BCH'
          },
          fixedPrice: 1000,
          floatingPrice: null,
          tradeFloor: 100,
          tradeCeiling: 1000,
          cryptoAmount: 1,
          timeDurationChoice: 1440,
          paymentMethods: [
            {
              name: 'gcash',
              account_name: 'Charlotte Bronte',
              account_number: 123845893
            },
            {
              name: 'paymaya',
              account_name: 'James Watson',
              account_number: 'jasbdvndsakXZc'
            },
            {
              name: 'paypal',
              account_name: 'Stephen King',
              account_number: 'sample@gmail.com'
            }
          ]
        },
        {
          tradeType: 'SELL',
          priceType: 'FIXED',
          fiatCurrency: {
            name: 'Philippine Peso',
            abbrev: 'PHP'
          },
          cryptoCurrency: {
            name: 'Bitcoin Cash',
            abbrev: 'BCH'
          },
          fixedPrice: 1000,
          floatingPrice: null,
          tradeFloor: 100,
          tradeCeiling: 1000,
          cryptoAmount: 1,
          time_duration_choice: 1440,
          paymentMethods: [
            {
              name: 'gcash',
              account_name: 'Charlotte Bronte',
              account_number: 123845893
            },
            {
              name: 'paymaya',
              account_name: 'James Watson',
              account_number: 'jasbdvndsakXZc'
            },
            {
              name: 'paypal',
              account_name: 'Stephen King',
              account_number: 'sample@gmail.com'
            }
          ]
        },
        {
          tradeType: 'SELL',
          priceType: 'FIXED',
          fiatCurrency: {
            name: 'Philippine Peso',
            abbrev: 'PHP'
          },
          cryptoCurrency: {
            name: 'Bitcoin Cash',
            abbrev: 'BCH'
          },
          fixedPrice: 1000,
          floatingPrice: null,
          tradeFloor: 100,
          tradeCeiling: 1000,
          cryptoAmount: 1,
          time_duration_choice: 1440,
          paymentMethods: [
            {
              name: 'gcash',
              account_name: 'Jane Austin',
              account_number: 123845893
            },
            {
              name: 'paymaya',
              account_name: 'James Watson',
              account_number: 'jasbdvndsakXZc'
            },
            {
              name: 'paypal',
              account_name: 'Stephen King',
              account_number: 'sample@gmail.com'
            }
          ]
        }
      ]
    }
  },
  components: {
    // FiatAdsBuy,
    // FiatAdsSell,
    FiatAdsForm,
    FiatAdsDialogs
  },
  methods: {
    sortedListings (type) {
      const vm = this

      const sorted = vm.listings.filter(function (test) {
        return test.tradeType.toLowerCase() === type
      })
      return sorted
    },
    editAds (index) {
      const vm = this
      vm.state = 'edit'
      // console.log('edit')

      switch (vm.transactionType) {
        case 'buy':
          vm.editListing = vm.buyListings[index]
          break
        case 'sell':
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
      if (vm.transactionType === 'buy') {
        return vm.buyListings.length === 0
      } else {
        return vm.sellListings.length === 0
      }
    },
    receiveDialogOption (option) {
      const vm = this

      switch (vm.dialogName) {
        case 'deleteAd':
          if (option === 'confirm') {
            if (vm.transactionType === 'buy') {
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
  },
  async mounted () {
    const vm = this

    vm.sellListings = vm.sortedListings('sell')
    vm.buyListings = vm.sortedListings('buy')
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

<template>
  <q-card
    class="br-15 q-pt-sm q-mx-md q-mx-none"
    :class="[ darkMode ? 'text-white pt-dark-card-2' : 'text-black',]"
    style="min-height:78vh;"
  >
    <div v-if="state !== 'selection'">
      <FiatAdsBuy
        v-if="transactionType === 'buy'"
        v-on:back="state = 'selection'"
        :adsState="state"
        :transactionType="transactionType"
      />

      <FiatAdsSell
        v-if="transactionType === 'sell'"
        v-on:back="state = 'selection'"
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
        <div v-if="listings.length === 0" class="relative text-center" style="margin-top: 50px;">
          <q-img class="vertical-top q-my-md" src="empty-wallet.svg" style="width: 75px; fill: gray;" />
          <p :class="{ 'text-black': !darkMode }">{{ $t('NoTransactionsToDisplay') }}</p>
        </div>
        <div v-else>
          <q-card-section style="max-height:60vh;overflow-y:auto;">
            <q-virtual-scroll :items="sortedListings()">
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
                            {{ listing.name }}
                          </span><br>
                          <span
                            :class="{'pt-dark-label': darkMode}"
                            class="col-transaction text-uppercase"
                            style="font-size: 16px;"
                          >
                            {{ listing.price }}
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
                            @click="editAds"
                          />
                          <q-btn
                            outline
                            rounded
                            padding="sm"
                            size="sm"
                            icon="delete"
                            color="grey-6"
                            class="q-ml-xs"
                            @click="deleteAds"
                          />
                        </div>
                      </div>
                      <div class="q-gutter-sm q-pt-sm">
                        <q-badge v-for="method in listing.paymentMethods" rounded outline :color="transactionType === 'buy'? 'blue': 'red'" :label="method" />
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
</template>
<script>
import FiatAdsBuy from './FiatAdsBuy.vue'
import FiatAdsSell from './FiatAdsSell.vue'

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      transactionType: 'buy',
      state: 'selection', // 'create' 'edit'
      // listings: [],
      listings: [
        {
          name: 'Anna Mondover',
          trades: 1230,
          completion: 97.5,
          price: '6991.79 PHP',
          quantity: 155,
          limit: '500 PHP to 10000 PHP',
          paymentMethods: [
            'paypal',
            'gcash',
            'paymaya'
          ],
          type: 'buy'
        },
        {
          name: 'Nana Mondover',
          trades: 1230,
          completion: 97.5,
          price: '6991.79 PHP',
          quantity: 155,
          limit: '500 PHP to 10000 PHP',
          paymentMethods: [
            'paypal',
            'gcash',
            'paymaya'
          ],
          type: 'sell'
        },{
          name: 'Anna Mondover',
          trades: 1230,
          completion: 97.5,
          price: '6991.79 PHP',
          quantity: 155,
          limit: '500 PHP to 10000 PHP',
          paymentMethods: [
            'paypal',
            'gcash',
            'paymaya'
          ],
          type: 'buy'
        },{
          name: 'Anna Mondover',
          trades: 1230,
          completion: 97.5,
          price: '6991.79 PHP',
          quantity: 155,
          limit: '500 PHP to 10000 PHP',
          paymentMethods: [
            'paypal',
            'gcash',
            'paymaya'
          ],
          type: 'sell'
        },{
          name: 'Anna Mondover',
          trades: 1230,
          completion: 97.5,
          price: '6991.79 PHP',
          quantity: 155,
          limit: '500 PHP to 10000 PHP',
          paymentMethods: [
            'paypal',
            'gcash',
            'paymaya'
          ],
          type: 'sell'
        },{
          name: 'Anna Mondover',
          trades: 1230,
          completion: 97.5,
          price: '6991.79 PHP',
          quantity: 155,
          limit: '500 PHP to 10000 PHP',
          paymentMethods: [
            'paypal',
            'gcash',
            'paymaya'
          ],
          type: 'buy'
        },{
          name: 'Anna Mondover',
          trades: 1230,
          completion: 97.5,
          price: '6991.79 PHP',
          quantity: 155,
          limit: '500 PHP to 10000 PHP',
          paymentMethods: [
            'paypal',
            'gcash',
            'paymaya'
          ],
          type: 'sell'
        },{
          name: 'Anna Mondover',
          trades: 1230,
          completion: 97.5,
          price: '6991.79 PHP',
          quantity: 155,
          limit: '500 PHP to 10000 PHP',
          paymentMethods: [
            'paypal',
            'gcash',
            'paymaya'
          ],
          type: 'sell'
        },
      ]
    }
  },
  components: {
    FiatAdsBuy,
    FiatAdsSell
  },
  methods: {
    sortedListings () {
      const vm = this

      const sorted = vm.listings.filter(function (listing) {
        return listing.type === vm.transactionType
      })
      return sorted
    },
    editAds () {
      console.log('edit')
    },
    deleteAds () {
      console.log('delete')
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
.buy-add-btn {
  background-color: rgb(60, 100, 246);
  color: white;
}
.sell-add-btn {
  background-color: #ed5f59;
  color: white;
}
</style>

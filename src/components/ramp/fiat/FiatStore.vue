<template>
  <q-card
    class="br-15 q-pt-sm q-mx-md q-mx-none"
    :class="[ darkMode ? 'text-white pt-dark-card-2' : 'text-black',]"
    style="min-height:78vh;"
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
            <q-item-section :class="[$store.getters['darkmode/getStatus'] ? 'pt-dark-label' : 'pp-text']">{{ currency }} ({{ index }})</q-item-section>
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
      <button class="btn-custom q-mt-none" :class="{'pt-dark-label': darkMode, 'active-transaction-btn': transactionType == 'buy' }" @click="transactionType='buy'">Buy</button>
      <button class="btn-custom q-mt-none" :class="{'pt-dark-label': darkMode, 'active-transaction-btn': transactionType == 'sell'}" @click="transactionType='sell'">Sell</button>
    </div>
    <div class="q-mt-md">
      <div v-if="listings.length === 0" class="relative text-center" style="margin-top: 50px;">
        <q-img class="vertical-top q-my-md" src="empty-wallet.svg" style="width: 75px; fill: gray;" />
        <p :class="{ 'text-black': !darkMode }">{{ $t('NoTransactionsToDisplay') }}</p>
      </div>
      <div v-else>
        <q-card-section style="max-height:50vh;overflow-y:auto;">
          <q-virtual-scroll :items="listings">
            <template v-slot="{ item: listing, index }">
              <q-item clickable @click="selectListing(listing)">
                <q-item-section>
                  <div class="row q-pt-none" :style="darkMode ? 'border-bottom: 1px solid grey' : 'border-bottom: 1px solid #DAE0E7'">
                    <div class="col">
                      {{ listing.name }}
                    </div>
                    <div class="col text-right">
                      <q-btn
                        rounded
                        no-caps
                        color="primary"
                        label="Buy"
                      />
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
      transactionType: 'buy',
      selectedFiat: 'PHP',
      availableFiat: {
        PHP: 'Philippine Peso',
        USD: 'United States Dollar',
        CAD: 'Canadian Dollar',
        JPY: 'Japanese Yen',
        RUB: 'Russian Ruble'
      },
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
          type: 'buy'
        }
      ]
    }
  },
  methods: {
    selectFiatCoin (currency) {
      console.log(currency)
      this.selectedFiat = currency
    },
    selectListing (listing) {
      console.log(listing)
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
  .btn-custom.active-transaction-btn {
    background-color: rgb(60, 100, 246) !important;
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
</style>

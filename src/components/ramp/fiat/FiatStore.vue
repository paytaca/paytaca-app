<template>
  <q-card
    class="br-15 q-pt-sm q-mx-md q-mx-none"
    :class="[ darkMode ? 'text-white pt-dark-card' : 'text-black',]"
  >
    <div class="q-py-md q-gutter-sm q-mx-lg q-mb-sm text-center">
      <button class="btn-custom q-mt-none btn-all" :class="{'pt-dark-label': darkMode, 'active-transaction-btn': transactionType == 'buy' }" @click="transactionType='buy'">Buy</button>
      <button class="btn-custom q-mt-none btn-sent" :class="{'pt-dark-label': darkMode, 'active-transaction-btn': transactionType == 'sell'}" @click="transactionType='sell'">Sell</button>
    </div>

    <div>
      <div class="q-ml-md q-mb-lg text-h5" style="font-size: 16px;">
        {{ availableFiat[selectedFiat] }} <q-icon size="sm" name='mdi-menu-down'/>
      </div>
      <q-menu anchor="bottom left" self="top left" >
        <q-list class="text-h5" :class="{'pt-dark-card': darkMode}" style="min-width: 150px; font-size: 15px;">
          <q-item
            v-for="(currency, index) in availableFiat"
            :key="index"
            clickable
            v-close-popup
          >
          <q-item-section :class="[$store.getters['darkmode/getStatus'] ? 'pt-dark-label' : 'pp-text']">{{ currency }} ({{ index }})</q-item-section>
          </q-item>
          <!-- <q-item clickable v-close-popup>
              <q-item-section :class="[$store.getters['darkmode/getStatus'] ? 'pt-dark-label' : 'pp-text']">Switch Wallet</q-item-section>
          </q-item>
          <q-item clickable v-close-popup>
            <q-item-section :class="[$store.getters['darkmode/getStatus'] ? 'pt-dark-label' : 'pp-text']">Rename</q-item-section>
          </q-item>
          <q-item clickable v-close-popup>
            <q-item-section :class="[$store.getters['darkmode/getStatus'] ? 'pt-dark-label' : 'pp-text']">close</q-item-section>
          </q-item> -->
        </q-list>
      </q-menu>
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
      }
    }
  }
}
</script>
<style lang="scss" scoped>
 .btn-custom {
    height: 40px;
    width: 40%;
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
    padding-left: 2px;
    padding-right: 2px;
    margin-left: 20px;
    margin-right: 20px;
  }
</style>

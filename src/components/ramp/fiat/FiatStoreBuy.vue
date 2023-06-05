<template>
   <q-card
    class="br-15 q-pt-sm q-mx-md q-mx-none"
    :class="[ darkMode ? 'text-white pt-dark-card-2' : 'text-black',]"
    style="min-height:78vh;"
  >
    <div>
      <q-btn
        flat
        padding="md"
        icon="arrow_back"
        @click="$emit('back')"
      />
    </div>
    <div class="q-mx-lg q-pt-xs text-h5 text-center" style="font-size: 18px; font-weight: 500;" :style="darkMode ? 'border-bottom: 1px solid grey' : 'border-bottom: 1px solid #DAE0E7'">
      BUY BY FIAT
    </div>
    <div class="q-mx-lg">
      <div class="q-pt-md subtext" style="font-size: 12px;">
        <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row justify-between no-wrap q-mx-lg">
          <span>Price:</span>
          <span class="text-nowrap q-ml-xs">{{ buy.price }}</span>
        </div>
        <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row justify-between no-wrap q-mx-lg">
          <span>Limit:</span>
          <span class="text-nowrap q-ml-xs">{{ buy.limit }}</span>
        </div>
        <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row justify-between no-wrap q-mx-lg">
          <span>Payment Limit:</span>
          <span class="text-nowrap q-ml-xs">24 hours</span>
        </div>
      </div>
      <div class="q-mt-md q-mx-lg">
        <q-input
          dense
          filled
          :dark="darkMode"
          v-model="amount"
        >
        <template v-slot:prepend>
          <span style="font-size: 12px; font-weight: 400;">
            PHP
          </span>
        </template>
        <template v-slot:append>
          <q-icon size="xs" name="close" @click="amount = 0"/>&nbsp;
          <q-btn padding="none" style="font-size: 12px;" flat color="primary" label="MAX" />
        </template>
        </q-input>
      </div>
      <div class="q-pt-md" style="font-size: 13px;">
        <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row justify-between no-wrap q-mx-lg">
          <span>Crypto Amount:</span>
          <span class="text-nowrap q-ml-xs subtext">{{ cryptoAmount }} BCH</span>
        </div>
        <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row justify-between no-wrap q-mx-lg">
          <span>Fiat Amount:</span>
          <span class="text-nowrap q-ml-xs subtext">{{ fiatAmount }}</span>
        </div>
      </div>
      <div class="row q-mx-sm q-py-md">
        <q-btn
          :disable="!isAmountValid()"
          rounded
          no-caps
          label='Buy'
          color="brandblue"
          class="q-space"
        />
      </div>
    </div>
    <div class="q-mx-lg q-pt-lg text-h5 text-center" style="font-size: 15px; font-weight: 500;" :style="darkMode ? 'border-bottom: 1px solid grey' : 'border-bottom: 1px solid #DAE0E7'">
      SELLER INFO
    </div>
    <div class="q-mx-lg q-mt-md">
      <span
        :class="{'pt-dark-label': darkMode}"
        class="q-pl-md q-mb-none text-uppercase"
        style="font-size: 15px; font-weight: 400;"
      >
        {{ buy.name }}
      </span>
    </div>
    <div class="q-mx-lg subtext" :class="{'pt-dark-label': darkMode}">
      <span
        class="q-pl-md q-mb-none"
        style="font-size: 12px;"
      >
        {{ buy.trades }} trades
      </span>&nbsp;
      <span
        class="q-pl-xs q-mb-none"
        style="font-size: 12px;"
      >
        {{ buy.completion }}% completion
      </span>
    </div>
    <div class="q-mx-lg q-pt-sm">
      <div class="q-ml-xs  q-gutter-sm">
        <q-badge v-for="method in buy.paymentMethods" rounded outline color="blue" :label="method"/>
      </div>
    </div>
  </q-card>
</template>
<script>
export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      buy: {},
      amount: 0,
      cryptoAmount: 1.43,
      fiatAmount: '1000 PHP'
    }
  },
  emits: ['back'],
  props: {
    listingData: Object
  },
  methods: {
    isAmountValid () {
      if (this.amount === 0 || this.amount === '') {
        return false
      } else {
        return true
      }
    }
  },
  async mounted () {
    const vm = this
    vm.buy = vm.listingData
  }
}
</script>
<style lang="scss" scoped>
  .pp-text {
    color: #000 !important;
  }
  .subtext {
    font-size: 13px;
    opacity: .5;
  }
</style>

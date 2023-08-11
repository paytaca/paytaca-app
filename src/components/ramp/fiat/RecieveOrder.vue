<template>
  <div v-if="isloaded">
    <div class="q-mx-lg text-h5 text-center lg-font-size" :style="darkMode ? 'border-bottom: 1px solid grey' : 'border-bottom: 1px solid #DAE0E7'">
      ORDER #{{ order.id }}
    </div>
    <div class="q-pt-md sm-font-size q-px-md  ">
      <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row justify-between no-wrap q-mx-lg">
        <span>Price</span>
        <span class="text-nowrap q-ml-xs">{{ price }}  {{ order.crypto_currency.symbol }}</span>
      </div>
      <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row justify-between no-wrap q-mx-lg">
        <span>Limit</span>
        <span class="text-nowrap q-ml-xs">{{ $parent.getAdLimit }} </span>
      </div>
      <div class="row justify-between no-wrap q-mx-lg bold-text" :class="[darkMode ? 'pt-dark-label' : 'pp-text']">
        <span>Payment Time Limit</span>
        <span class="text-nowrap q-ml-xs" :class="order.status.label.toLowerCase().includes('released') ? 'text-green-6' : 'text-orange-6'">{{ order.status.label }}</span>
      </div>
    </div>

    <!-- Fiat Input -->
    <div class="q-mt-md q-mx-lg q-px-md">
      <div class="xs-font-size subtext q-pb-xs q-pl-sm">Fiat Amount</div>
      <q-input class="q-pb-xs" disable filled :dark="darkMode" v-model="$parent.fiatAmount" :rules="[$parent.isValidInputAmount]">
        <template v-slot:prepend>
          <span class="sm-font-size bold-text">{{ order.fiat_currency.symbol }}</span>
        </template>
      </q-input>
      <div class="text-right bold-text subtext sm-font-size q-pr-sm"> ≈ {{ $parent.formattedCurrency($parent.cryptoAmount) }} BCH</div>
    </div>

    <div>
      <q-separator :dark="darkMode" class="q-mt-sm q-mx-md"/>
      <div class="row justify-between no-wrap q-mx-lg sm-font-size bold-text subtext q-pt-sm q-px-lg">
        <span>Balance:</span>
        <span class="text-nowrap q-ml-xs">
          {{ $parent.bchBalance }} BCH
        </span>
      </div>
    </div>

    <div class="row q-pt-md q-mx-lg q-px-md">
      <q-btn
        rounded
        no-caps
        label='CONFIRM'
        class="q-space text-white"
        color="blue-6"
        @click="$emit('confirm')"
      />
    </div>
    <div class="row q-pt-sm q-mx-lg q-px-md">
      <q-btn
        rounded
        no-caps
        label='DECLINE'
        class="q-space text-white"
        color="white"
        text-color="black"
        @click="$emit('cancel')"
      />
    </div>
  </div>
</template>
<script>

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      order: null,
      ad: null,
      isloaded: false,
      test: '',
      price: null
    }
  },
  props: {
    orderData: Object,
    adData: Object
  },
  emits: ['confirm', 'cancel'],
  async mounted () {
    this.order = this.orderData

    this.price = this.$parent.formattedCurrency(this.order.crypto_amount)

    this.isloaded = true
  }
}
</script>

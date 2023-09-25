<template>
  <q-card class="br-15 q-pt-sm q-mx-md q-mx-none q-my-lg" bordered flat
    :class="[ darkMode ? 'text-white pt-dark-card-2' : 'text-black']">
    <div v-if="isloaded">
      <div class="q-pt-sm q-px-sm">
        <q-btn
          flat
          padding="md"
          icon="close"
          @click="$emit('back')"
        />
      </div>
      <div class="text-center">
        <div class="bold-text lg-font-size text-green-6">
          Released
          <!-- Refunded -->
        </div>
        <div class="sm-font-size" :class="darkMode ? 'text-grey-4' : 'text-grey-6'">(Order #{{ appeal.order.id }})</div>
      </div>

      <q-separator class="q-my-sm q-mx-lg" :dark="darkMode"/>

      <div class="q-mx-lg q-pb-lg">
        <div class="q-pt-md q-px-sm">
          <div class="sm-font-size q-pb-xs">Fiat Amount</div>
            <q-input class="q-pb-xs q-pb-lg" disable dense filled :dark="darkMode" v-model="amount.buyer">
              <template v-slot:prepend>
                <span class="sm-font-size bold-text">PHP</span>
              </template>
            </q-input>

            <div class="sm-font-size q-pb-xs">Crypto Amount</div>
            <q-input class="q-pb-xs" disable dense filled :dark="darkMode" v-model="amount.seller">
              <template v-slot:prepend>
                <span class="sm-font-size bold-text">BCH</span>
              </template>
            </q-input>
          </div>
      </div>
    </div>
  </q-card>
</template>
<script>

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      appeal: null,
      isloaded: false,
      amount: {
        seller: 100,
        buyer: 0.001
      }
    }
  },
  props: {
    appealInfo: Object
  },
  emits: ['back'],
  async mounted () {
    this.appeal = this.appealInfo
    console.log('completed appeal:', this.appeal)
    this.isloaded = true
  }
}
</script>

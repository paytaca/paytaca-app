<template>
  <q-card
    class="br-15 q-pt-sm q-mx-md"
    :class="[ darkMode ? 'text-white pt-dark-card' : 'text-black',]"
    v-if="isloaded"
  >
    <div class="q-pl-sm q-pt-sm">
      <q-btn
        rounded
        flat
        icon="close"
        :class="[darkMode ? 'text-blue-5' : 'text-blue-9']"
        @click="$emit('close')"
      />
    </div>
    <div class="text-h5 text-center q-pb-md" style="font-size: 15px;">Please check to confirm...</div>

    <div class="row no-wrap justify-around items-baseline">
      <div class="col-5 column items-center">
        <div class="text-lowercase q-mt-sm" :class="[darkMode ? 'pt-dark-label' : 'pp-text']" style="font-size:11px">{{ $t('From') }}</div>
        <div style="height: 30px; width: 30px; border-radius: 50%;" v-html="rampData.deposit.icon"></div>
        <div class="text-subtitle1 text-center" :class="[darkMode ? 'pt-dark-label' : 'pp-text']">
          {{ rampData.deposit.coin}}
        </div>
        <div class="text-lowercase" :class="[darkMode ? 'pt-dark-label' : 'pp-text']" style="font-size:11px; color:gray;">({{ getNetwork(rampData.deposit) }})</div>
      </div>

      <q-btn
        rounded
        flat
        padding="sm"
        icon="arrow_forward"
        disable
        :class="[darkMode ? 'text-blue-5' : 'text-blue-9']"
      />

      <div class="col-5 column items-center">
        <div class="q-mt-sm text-lowercase" :class="[darkMode ? 'pt-dark-label' : 'pp-text']" style="font-size:11px;">{{ $t('To') }}</div>
        <div style="height: 30px; width: 30px; border-radius: 50%;" v-html="rampData.settle.icon"></div>
        <div class="text-subtitle1 text-center" :class="[darkMode ? 'pt-dark-label' : 'pp-text']">
          {{ rampData.settle.coin }}
        </div>
        <div class="text-lowercase" :class="[darkMode ? 'pt-dark-label' : 'pp-text']" style="font-size:11px; color:gray;">({{ getNetwork(rampData.settle) }})</div>
      </div>
    </div>

    <div class="q-py-lg">
      <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row justify-between no-wrap q-mx-lg">
        <span>Deposit Amount:</span>
        <span class="text-nowrap q-ml-xs" style="font-size: 13px">{{ rampData.depositAmount }} {{ rampData.deposit.coin }}</span>
      </div>
      <div :class="[darkMode ? 'pt-dark-label' : 'pp-text']" class="row justify-between no-wrap q-mx-lg">
        <span>Receiving Amount:</span>
        <span class="text-nowrap q-ml-xs" style="font-size: 13px">{{ rampData.settleAmount }} {{ rampData.settle.coin }}</span>
      </div>
   </div>
    <q-separator spaced class="q-mx-lg q-mb-md" :color="darkMode ? 'white' : 'gray'"/>
    <q-item>
      <q-item-section class="text-center q-pb-lg q-pt-sm">
        <q-item-label>Recieving Address: </q-item-label>
        <q-item-label class="q-px-lg q-pt-xs" style="overflow-wrap: break-word">
          <span style="font-size: 13px;">{{ rampData.settleAddress }}</span>
        </q-item-label>
      </q-item-section>
    </q-item>
  </q-card>
  <div class="row justify-center q-py-lg" style="margin-top: 100px" v-if="!isloaded">
    <ProgressLoader/>
  </div>
  <DragSlide
    :style="{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 1500,
    }"
    @swiped="dataConfirmed"
    text="Swipe To Confirm"
  />
</template>
<script>
import ProgressLoader from '../ProgressLoader.vue'
import DragSlide from '../drag-slide.vue'

export default {
  data () {
    return {
      isloaded: false,
      darkMode: this.$store.getters['darkmode/getStatus'],
      rampData: {}
    }
  },
  emits: ['close'],
  components: {
    ProgressLoader,
    DragSlide
  },
  props: {
    info: Object
  },
  methods: {
    getNetwork (token) {
      const network = token.network.toLowerCase()
      const coin = token.coin.toLowerCase()
      //check ethereum
      if (network === 'ethereum' && coin !== 'eth') {
        return 'ERC-20'
      } else if (network === 'tron' && coin !== 'trx') {
        return 'TRC-20'
      } else if (network === 'bsc' && coin !== 'bnb') {
        return 'BEP-20'
      } else {
        return token.network.toUpperCase()
      }
    },
    dataConfirmed () {
      console.log('test')
      this.getQuote()
    },
    async getQuote () {
      const vm = this
      console.log('Getting Quote')
      vm.isloaded = false
      // const url = 'https://sideshift.ai/api/v2/quotes'

      // const response = await vm.$axios.post()
    }
  },
  async mounted () {
    const vm = this

    vm.rampData = vm.info
    vm.isloaded = true
  }
}
</script>
<style lang="scss" scoped>
.text-nowrap {
  white-space: nowrap;
}
.text-subtitle1 {
  font-size: 14px;
}
</style>>

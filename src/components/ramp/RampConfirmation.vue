<template>
  <q-card
    class="br-15 q-pt-sm q-mx-md"
    :class="[ darkMode ? 'text-white pt-dark-card' : 'text-black',]"
  >
    <div class="text-center q-py-md">
      <div class="text-h7 q-pb-md">Confirm Information</div>
      <div>
        <span>Deposit amount: <b>{{ rampData.depositAmount }} {{ rampData.deposit.coin }}</b></span>
      </div>
      <div>
        <span>recieving amount: sdsf</span>
      </div>
    </div>

  </q-card>
</template>
<script>

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      rampData: {}
    }
  },
  props: {
    info: Object
  },
  async mounted () {
    const vm = this

    vm.rampData = vm.info
    console.log(vm.rampData)
  }
}
</script>

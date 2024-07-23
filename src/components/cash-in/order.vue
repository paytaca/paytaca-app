<template>
 <div class="q-mx-md">
    <div class="text-center" :class="darkMode ? 'text-blue-6' : 'text-blue-8'" style="font-size: 20px;">
      Order #100
    </div>

    <div v-if="await_status" class="text-center" style="margin-top: 50px; font-size: 25px;">
      <div>
        {{ statusMessage}}
      </div>
      <div>
        Please Wait...
      </div>
      <q-spinner-dots class="q-pt-sm" color="blue-6" size="3em"/>
    </div>
  </div>
</template>
<script>

export default {
  data () {
    return {
      status: 'PD', //SBM, CNF, ESCRW_PN, ESCRW, PD_PN, PD, RFN, RLS
      label: '',
      await_status: false,
      statusMessage: ''
    }
  },
  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    }
  },
  mounted () {
    this.checkStatus()
  },
  methods: {
    checkStatus () {
      // const escrow_pending = ['SBM', 'CNF', 'ESCRW_PN']
      switch (this.status) {
        case 'SBM':
        case 'CNF':
        case 'ESCRW_PN':
          this.await_status = true
          this.statusMessage = 'Escrowing Funds'
          break
        case 'PD':
          this.await_status = true
          this.statusMessage = 'Releasing Funds'
          break
        case 'ESCRW':
        case 'PD_PN':
          // payment-confirmation
          break
      }
    }
  }
}
</script>

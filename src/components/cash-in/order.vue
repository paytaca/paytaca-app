<template>
 <div class="q-mx-md">
    <div class="text-center" :class="darkMode ? 'text-blue-6' : 'text-blue-8'" style="font-size: 20px;">
      Order #100
    </div>

    <payment-confirmation v-if="confirm_payment"/>

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
import PaymentConfirmation from './payment-confirmation.vue'

export default {
  data () {
    return {
      status: 'ESCRW', //SBM, CNF, ESCRW_PN, ESCRW, PD_PN, PD, RFN, RLS
      label: '',
      await_status: false,
      statusMessage: '',
      confirm_payment: false
    }
  },
  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    }
  },
  components: {
    PaymentConfirmation
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
          this.confirm_payment = true
          break
      }
    }
  }
}
</script>

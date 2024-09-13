<template>
    <q-dialog v-model="showDialog" full-width @before-hide="$emit('back')">
        <q-card class="br-15 q-pa-md q-ma-sm text-bow" bordered flat :class="[darkMode ? 'pt-card-2 dark' : 'light']">
            <div class="q-mt-sm q-mx-md" style="overflow: auto">
                <div class="row justify-center q-mb-md text-center" style="font-size: medium;">Transaction History</div>
                <div v-for="(transaction, index) in transactionHistory" :key=index>
                    <div class="row no-wrap sm-font-size q-my-sm" :class="darkMode ? '' : 'text-grey-7'">
                        <div class="col">
                            <q-input hide-bottom-space readonly filled dense class="q-pa-none" :label="transaction.action" :hint="formatDate(transaction.created_at, false)" v-model="transaction.txid">
                              <template v-slot:append>
                                <q-icon flat dense class="col-auto" :color="transaction.valid ? 'green' : 'warning'" :name="transaction.valid ? 'check_circle' : 'pending'"/>
                                <q-icon size="sm" name='open_in_new' color="blue-grey-6" @click="openURL(explorerLink(transaction.txid))"/>
                              </template>
                            </q-input>
                        </div>
                    </div>
                </div>
            </div>
        </q-card>
    </q-dialog>
</template>
<script>
import { formatOrderStatus, formatDate } from 'src/exchange'
import { openURL } from 'quasar'

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      showDialog: true
    }
  },
  emits: ['back'],
  props: {
    transactionHistory: Array
  },
  computed: {
    isChipnet () {
      return this.$store.getters['global/isChipnet']
    }
  },
  methods: {
    openURL,
    formatOrderStatus,
    formatDate,
    copyToClipboard (value) {
      this.$copyText(value)
      this.$q.notify({
        color: 'blue-9',
        message: this.$t('CopiedToClipboard'),
        icon: 'mdi-clipboard-check',
        timeout: 200
      })
    },
    explorerLink (txid) {
      let url = 'https://blockchair.com/bitcoin-cash/transaction/'

      if (this.isChipnet) {
        url = 'https://chipnet.imaginary.cash/tx/'
      }
      return `${url}${txid}`
    }
  }
}
</script>

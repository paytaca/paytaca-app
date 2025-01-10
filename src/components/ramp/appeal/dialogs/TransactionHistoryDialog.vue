<template>
    <q-dialog v-model="showDialog" full-width @before-hide="$emit('back')">
        <q-card class="br-15 q-pa-md q-ma-sm text-bow" bordered flat :class="[darkMode ? 'pt-card-2 dark' : 'light']">
            <div class="q-mt-sm q-mx-md" style="overflow: auto">
                <div class="row justify-center q-mb-md text-center" style="font-size: medium;">Transaction History</div>
                <div v-for="(el, index) in transactions" :key=index>
                    <div class="row no-wrap sm-font-size q-my-sm" :class="darkMode ? '' : 'text-grey-7'">
                        <div class="col">
                            <q-input hide-bottom-space readonly filled dense class="q-pa-none" :label="el.txn?.action" :hint="formatDate(el.txn?.created_at, false)" v-model="el.txn.txid">
                              <template v-slot:append>
                                <q-icon flat dense class="col-auto" :color="el.txn?.valid ? 'green' : 'warning'" :name="el.txn?.valid ? 'check_circle' : 'pending'"/>
                                <q-icon size="sm" name='open_in_new' color="blue-grey-6" @click="openURL(explorerLink(el.txn?.txid))"/>
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
    transactions: Array
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

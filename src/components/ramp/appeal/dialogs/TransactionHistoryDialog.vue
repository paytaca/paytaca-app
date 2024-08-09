<template>
    <q-dialog v-model="showDialog" full-width @before-hide="$emit('back')">
        <q-card class="br-15 q-pa-md q-ma-sm text-bow" bordered flat :class="[darkMode ? 'pt-card-2 dark' : '']">
            <div class="q-mt-sm q-mx-md" style="overflow: auto">
                <div class="row justify-center q-mb-md text-center" style="font-size: medium;">Transaction History</div>
                <div v-for="(transaction, index) in transactionHistory" :key=index>
                    <q-separator class="q-my-sm" :dark="darkMode" v-if="index !== 0"/>
                    <div class="row no-wrap sm-font-size q-my-sm" :class="darkMode ? '' : 'text-grey-7'">
                        <div class="col">
                            <div>{{ transaction.action }}</div>
                            <div :class="transaction.txid ? 'text-blue' : ''" @click="copyToClipboard(transaction.txid)" :style=" transaction.txid ? 'text-decoration-line: underline' : ''">
                                {{ transaction.txid?.substring(0, 20) }}{{ transaction.txid ? '...' : '' }}
                            </div>
                            <div>{{ formatDate(transaction.created_at, false)}}</div>
                        </div>
                        <q-btn flat dense class="col-auto" :color="transaction.valid ? 'green' : 'warning'" :icon="transaction.valid ? 'check_circle' : 'pending'"></q-btn>
                    </div>
                </div>
            </div>
        </q-card>
    </q-dialog>
</template>
<script>
import { formatOrderStatus, formatDate } from 'src/exchange'

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
  methods: {
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
    }
  }
}
</script>

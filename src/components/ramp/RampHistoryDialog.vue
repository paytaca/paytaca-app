<template>
  <q-dialog ref="dialog" persistent full-width>
    <q-card :class="darkMode ? 'text-white pt-dark-card' : 'text-black'" class="br-15">
      <div class="row no-wrap items-center justify-center q-px-lg q-pt-lg" v-if="!showInfo">
        <div class="text-subtitle1 q-space q-mt-sm">
          Transaction History
        </div>
        <q-btn
          flat
          padding="sm"
          icon="close"
          v-close-popup
        />
      </div>
      <div v-if="showInfo">
        <q-btn
          flat
          padding="md"
          icon="arrow_back"
          @click="showInfo = false"
        />

        <div>
          <RampShiftInfo
            type="history"
            :info="selectedData"
          />
        </div>
      </div>
      <div v-if="isloaded">
        <q-card-section>
          <div v-if="transactions.length === 0" class="relative text-center q-pt-sm">
            <q-img class="vertical-top q-my-md" src="empty-wallet.svg" style="width: 75px; fill: gray;" />
            <p :class="{ 'text-black': !darkMode }">{{ $t('NoTransactionsToDisplay') }}</p>
          </div>
          <div v-else>
            <q-card-section style="max-height:50vh;overflow-y:auto;">
              <div v-if="!showInfo">
                <q-virtual-scroll :items="transactions">
                  <template v-slot="{ item: transaction, index }">
                    <q-item clickable @click="openShiftInfo(transaction)"> <!-- @click="showInfo = true; selectedData = transaction;"> -->
                      <q-item-section>
                        <div class="col q-pt-none" :style="darkMode ? 'border-bottom: 1px solid grey' : 'border-bottom: 1px solid #DAE0E7'">
                          <div class="row">
                            <div class="col col-transaction">
                              <div>
                                <p
                                  :class="{'pt-dark-label': darkMode}"
                                  class="q-mb-none transactions-wallet ib-text text-uppercase"
                                  style="font-size: 15px;"
                                >
                                  {{ transactionType(transaction.ramp_type, transaction.shift_status)}}
                                </p>
                                <p
                                  :class="{'text-grey': darkMode}"
                                  class="q-mb-none transactions-wallet float-right ib-text text-right"
                                >
                                  <div class="text-grey">{{ getAmount(transaction.ramp_type, transaction.shift_info) }} BCH</div>
                                  <div
                                    class="subtext text-grey"
                                    :class="{'pt-dark-label': darkMode}"
                                    style="font-size: 11px;"
                                  >
                                    {{ transaction.shift_status.toUpperCase() }}
                                  </div>
                                </p>
                              </div>
                              <div class="col">
                                <span class="float-left subtext" :class="{'pt-dark-label': darkMode}" style="font-size: 12px;">
                                  {{ getDate(transaction.date_shift_created) }}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </q-item-section>
                    </q-item>
                  </template>
                </q-virtual-scroll>
                <div class="q-pt-sm" v-if="has_next" style="width: 100%; text-align: center; color: #3b7bf6;">
                  <p v-if="!loadingNextPage" @click="loadingNextPage = true; getTransactions();">{{ $t('ShowMore') }}</p>
                  <div class="row justify-center q-pt-sm" v-if="loadingNextPage">
                    <ProgressLoader/>
                  </div>
                </div>
              </div>

             </q-card-section>
          </div>
        </q-card-section>
      </div>
      <div class="row justify-center q-py-lg" style="margin-top: 50px" v-if="!isloaded">
        <ProgressLoader/>
      </div>
    </q-card>
  </q-dialog>
</template>
<script>
import { getMnemonic, Wallet } from '../../wallet'
import ProgressLoader from '../ProgressLoader.vue'
import RampShiftInfo from './RampShiftInfo.vue'

export default {
  components: {
    ProgressLoader,
    RampShiftInfo
  },
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      selectedData: {},
      transactions: [],
      networkError: false,
      isloaded: false,
      loadingNextPage: false,
      page: 0,
      has_next: false,
      total_page: 1,
      showInfo: false,
      baseUrl: process.env.ANYHEDGE_BACKEND_BASE_URL
    }
  },
  methods: {
    getDate (date) {
      const tempDate = date.split('T')
      const depositDate = tempDate[0] + ' ' + tempDate[1].substring(0, 5)

      return depositDate
    },
    transactionType (ramp, status) {
      if (ramp === 'on') {
        if (status === 'waiting') {
          return 'To Recieve'
        } else if (status === 'expired') {
          return 'failed'
        } else {
          return 'recieved'
        }
      } else {
        if (status === 'waiting') {
          return 'to send'
        } else if (status === 'expired') {
          return 'failed'
        } else {
          return 'sent'
        }
      }
    },
    getAmount (ramp, info) {
      if (ramp === 'on') {
        return parseFloat(info.settle.amount)
      } else {
        return parseFloat(info.deposit.amount)
      }
    },
    async openShiftInfo (data) {
      const vm = this
      vm.selectedData = data
      vm.showInfo = true
      console.log(vm.selectedData)
    },
    getNetwork (info) {
      const network = info.network.toLowerCase()
      const coin = info.coin.toLowerCase()
      //check ethereum
      if (network === 'ethereum' && coin !== 'eth') {
        return 'ERC-20'
      } else if (network === 'tron' && coin !== 'trx') {
        return 'TRC-20'
      } else if (network === 'bsc' && coin !== 'bnb') {
        return 'BEP-20'
      } else {
        return info.network.toUpperCase()
      }
    },
    async getTransactions () {
      const vm = this
      // console.log('Getting Transactions')
      vm.page += 1
      const mnemonic = await getMnemonic()
      const wallet = new Wallet(mnemonic)

      vm.baseUrl = 'https://soft-regions-shake-49-145-106-154.loca.lt/api'
      const walletHash = wallet.BCH.getWalletHash()
      const url = vm.baseUrl + '/ramp/history/' + walletHash + '/?page=' + vm.page

      const response = await vm.$axios.get(url).catch(function () {
        vm.networkError = true
        vm.isloaded = true
      })

      // console.log(response)
      if (response.status === 200 || response.status === 201) {
        const data = response.data

        vm.transactions.push(...data.history)
        vm.has_next = data.has_next
        vm.total_page = data.num_pages

        // console.log(vm.transactions)
      } else {
        vm.networkError = true
      }
      vm.loadingNextPage = false
      vm.isloaded = true
    }
  },
  async mounted () {
    const vm = this

    await vm.getTransactions()
  }
}
</script>
<style lang="scss" scoped>
.col-transaction {
  padding-top: 2px;
  font-weight: 500;
}
.transactions-wallet {
  color: #4C4F4F;
}
.ib-text {
  display: inline-block;
}

.subtext {
  font-size: 11px;
  color: #4C4F4F;
  opacity: .5;
}
.text-nowrap {
  white-space: nowrap;
}
.text-subtitle1 {
  font-size: 14px;
}
.qr-code-container {
    padding-left: 28px;
    padding-right: 28px;
  }
.col-qr-code {
  margin-left: auto;
  margin-right: auto;
  text-align: center;
  width: 300px;
  border-radius: 16px;
  border: 4px solid #ed5f59;
  padding: 25px 10px 32px 10px;
  background: white;
}
.qr-code-text {
  font-size: 18px;
  color: #000;
  }
</style>

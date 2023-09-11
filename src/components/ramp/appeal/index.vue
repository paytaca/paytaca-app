<template>
  <q-card class="br-15 q-pt-sm q-mx-md q-mx-none q-my-lg"
    :class="[ darkMode ? 'text-white pt-dark-card-2' : 'text-black',]"
    :style="`height: ${ minHeight }px;`"
    v-if="state === 'appeal-list'">
    <div class="q-pt-md">
      <div class="q-pt-md">
        <div class="row br-15 text-center btn-transaction md-font-size" :class="{'pt-dark-card': darkMode}">
          <button class="col br-15 btn-custom q-mt-none" :class="{'pt-dark-label': darkMode, 'active-transaction-btn': statusType == 'PENDING' }" @click="statusType='PENDING'">Pending</button>
          <button class="col br-15 btn-custom q-mt-none" :class="{'pt-dark-label': darkMode, 'active-transaction-btn': statusType == 'RESOLVED'}" @click="statusType='RESOLVED'">Resolved</button>
        </div>
      </div>
      <div v-for="(appeal, index) in appeals" :key="index" class="q-px-md q-pt-sm">
        <!-- add scroller -->
        <q-item clickable @click="selectAppeal(index)">
          <q-item-section>
            <div class="q-pt-sm q-pb-sm" :style="darkMode ? 'border-bottom: 1px solid grey' : 'border-bottom: 1px solid #DAE0E7'">
              <div class="row q-mx-md">
                <div class="col ib-text">
                  <q-badge rounded size="sm" :color="appeal.type === 'refund' ?  'red-5' : 'blue-5'" class="text-uppercase" :label="appeal.type" />
                  <div class="md-font-size bold-text">Order #{{ appeal.order }}</div>
                  <div>
                    <q-badge rounded size="sm" outline :color="darkMode ? 'blue-grey-4' :  'blue-grey-6'" :label="appeal.reason" />
                  </div>
                  <div class="sm-font-size" :class="darkMode ? '' : 'subtext'">
                    8m ago by {{ appeal.peer}}
                  </div>
                </div>
                <div class="text-right subtext sm-font-size bold-text text-uppercase">
                  {{ appeal.status }}
                </div>
              </div>
            </div>
          </q-item-section>
        </q-item>
      </div>
    </div>
  </q-card>

  <!-- Appeal Process -->
  <div v-if="state === 'appeal-process'">
    <AppealProcess
      :selectedAppeal="selectedAppeal"
      @back="state = 'appeal-list'"
    />
  </div>
</template>
<script>
import AppealProcess from './AppealProcess.vue'
import { signMessage } from '../../../wallet/ramp/signature.js'
import { loadP2PWalletInfo } from 'src/wallet/ramp'

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      walletIndex: this.$store.getters['global/getWalletIndex'],
      apiURL: process.env.WATCHTOWER_BASE_URL + '/ramp-p2p',
      wallet: null,
      statusType: 'PENDING',
      state: 'appeal-list',
      minHeight: this.$q.platform.is.ios ? this.$q.screen.height - 150 : this.$q.screen.height - 125,
      appeals: [
        {
          order: 12,
          peer: 'Edcel',
          status: 'Paid Pending',
          type: 'release',
          reason: 'Unresponsive Seller'
        },
        {
          order: 2363,
          peer: 'Edcel',
          status: 'Escrowed',
          type: 'refund',
          reason: 'Unresponsive Buyer'
        }
      ],
      selectedAppeal: null
    }
  },
  components: {
    AppealProcess
  },
  mounted () {
    this.fetchAppeals()
  },
  methods: {
    selectAppeal (index) {
      this.selectedAppeal = this.appeals[index]

      this.state = 'appeal-process'
    },
    async fetchAppeals () {
      console.log('fetchAppeals')
      const vm = this
      const url = vm.apiURL + '/appeals'
      if (vm.wallet === null) {
        const walletInfo = this.$store.getters['global/getWallet']('bch')
        vm.wallet = await loadP2PWalletInfo(walletInfo, vm.walletIndex)
      }
      const timestamp = Date.now()
      signMessage(vm.wallet.privateKeyWif, 'APPEAL_LIST', timestamp)
        .then(signature => {
          const headers = {
            'wallet-hash': vm.wallet.walletHash,
            timestamp: timestamp,
            signature: signature
          }
          const params = {
            offset: 0,
            limit: 20,
            state: 'ONGOING'
          }
          console.log('headers:', headers)
          console.log('params:', params)
          vm.$axios.get(url, { headers: headers, params: params })
            .then(response => {
              console.log('response:', response)
            })
            .catch(error => {
              console.error(error.response)
            })
        })
    }

  }
}
</script>
<style lang="scss" scoped>
.btn-transaction {
  font-size: 16px;
  background-color: rgb(242, 243, 252);
  border-radius: 24px;
  padding: 4px;
  margin-left: 12%;
  margin-right: 12%;
  margin-top: 10px;
}
.btn-custom {
  height: 40px;
  width: 47%;
  border-radius: 20px;
  border: none;
  color: #4C4F4F;
  background-color: transparent;
  outline:0;
  cursor: pointer;
  transition: .2s;
  font-weight: 500;
}
.btn-custom:hover {
  background-color: rgb(242, 243, 252);
  color: #4C4F4F;
}
.btn-custom.active-transaction-btn {
  background-color: rgb(13,71,161) !important;
  color: #fff;
}
.subtext {
  opacity: .5;
}
</style>

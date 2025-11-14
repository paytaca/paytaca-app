<template>
  <q-dialog
    ref="dialog"
    persistent
    full-width
    seamless
    class="no-click-outside"
  >
    <q-card class="br-15 pt-card-2 text-bow" :class="getDarkModeClass(darkMode)">
      <div class="row no-wrap items-center justify-center q-px-lg q-pt-sm" v-if="!showInfo">
        <div class="text-subtitle2 q-space q-mt-sm">
          {{ $t('TransactionHistory') }}
        </div>
        <q-btn
          flat
          padding="sm"
          icon="close"
          v-close-popup
          class="close-button"
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
            v-on:open-qr="onOKClick()"
          />
        </div>
      </div>
      <div v-if="isloaded">
        <q-card-section>
          <div v-if="transactions.length === 0" class="relative text-center q-pt-sm">
            <q-img class="vertical-top q-my-md" src="empty-wallet.svg" style="width: 75px; fill: gray;" />
            <p :class="{ 'text-black': !darkMode, 'text-white': darkMode }">{{ $t('NoTransactionsToDisplay') }}</p>
          </div>
          <div v-else>
            <q-card-section style="max-height:50vh;overflow-y:auto;">
              <div v-if="!showInfo">
                <q-virtual-scroll :items="transactions">
                  <template v-slot="{ item: transaction, index }">
                    <q-item clickable @click="openShiftInfo(transaction)">
                      <q-item-section>
                        <div class="col q-pt-none transaction-row" :class="getDarkModeClass(darkMode)">
                          <div class="row">
                            <div class="col col-transaction">
                              <div>
                                <div class="q-gutter-xs ib-text q-mb-none">
                                  <q-avatar>
                                    <div class="currency-icon" v-html="transaction.shift_info.deposit.icon"></div>
                                  </q-avatar>
                                  <q-icon name="mdi-arrow-right" />
                                  <q-avatar>
                                    <div class="currency-icon" v-html="transaction.shift_info.settle.icon"></div>
                                  </q-avatar>
                                </div>
                                <div
                                  :class="{'text-grey': darkMode}"
                                  class="q-pt-md q-mb-none transactions-wallet float-right text-right"
                                >
                                  <div class="text-grey">{{ getAmount(transaction.ramp_type, transaction.shift_info) }} BCH</div>
                                  <div class="subtext shift-status text-grey" :class="{'pt-label dark': darkMode}">
                                    {{ transaction.shift_status.toUpperCase() }}
                                  </div>
                                </div>
                              </div>
                              <div class="col">
                                <span
                                  class="q-pb-sm float-left pt-label subtext"
                                  :class="getDarkModeClass(darkMode)"
                                  v-if="transaction.shift_status === 'settled'"
                                >
                                  {{ getDate(transaction.date_shift_completed) }}
                                </span>
                                <span class="q-pb-sm float-left pt-label subtext" :class="getDarkModeClass(darkMode)" v-else>
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
                <div
                  v-if="has_next"
                  class="q-pt-sm text-center button button-text-primary"
                  :class="getDarkModeClass(darkMode)"
                  style="width: 100%;"
                >
                  <p v-if="!loadingNextPage" @click="loadingNextPage = true; getTransactions();">{{ $t('ShowMore') }}</p>
                  <div class="row justify-center q-pt-sm" v-if="loadingNextPage">
                    <ProgressLoader />
                  </div>
                </div>
              </div>

            </q-card-section>
          </div>
        </q-card-section>
      </div>
      <div class="row justify-center q-py-lg" style="margin-top: 50px" v-if="!isloaded">
        <ProgressLoader />
      </div>
    </q-card>
  </q-dialog>
</template>
<script>
import { getMnemonic, Wallet } from 'src/wallet'
import ProgressLoader from 'src/components/ProgressLoader.vue'
import RampShiftInfo from './RampShiftInfo.vue'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import {
  generateReceivingAddress,
  getDerivationPathForWalletType
} from 'src/utils/address-generation-utils.js'

export default {
  components: {
    ProgressLoader,
    RampShiftInfo
  },
  data () {
    return {
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
  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    theme () {
      return this.$store.getters['global/theme']
    },
  },
  methods: {
    getDarkModeClass,
    onOKClick () {
      this.$emit('ok', this.selectedData)
      this.$refs.dialog.hide()
    },
    getDate (date) {
      const tempDate = date.split('T')
      const depositDate = tempDate[0] + ' ' + tempDate[1].substring(0, 5)

      return depositDate
    },
    getAmount (ramp, info) {
      if (ramp === 'on') {
        return parseFloat(info.settle.amount)
      } else {
        return -parseFloat(info.deposit.amount)
      }
    },
    async openShiftInfo (data) {
      const vm = this
      vm.selectedData = data
      vm.showInfo = true
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
      vm.page += 1
      const mnemonic = await getMnemonic(vm.$store.getters['global/getWalletIndex'])
      const wallet = new Wallet(mnemonic)

      const walletHash = wallet.BCH.getWalletHash()
      
      // Generate BCH address dynamically
      const addressIndex = vm.$store.getters['global/getLastAddressIndex']('bch')
      const validAddressIndex = typeof addressIndex === 'number' && addressIndex >= 0 ? addressIndex : 0
      const bchAddress = await generateReceivingAddress({
        walletIndex: vm.$store.getters['global/getWalletIndex'],
        derivationPath: getDerivationPathForWalletType('bch'),
        addressIndex: validAddressIndex,
        isChipnet: vm.$store.getters['global/isChipnet']
      })

      if (!bchAddress) {
        vm.networkError = true
        vm.isloaded = true
        return
      }

      const url = vm.baseUrl + '/ramp/history/' + walletHash
      const response = await vm.$axios.get(url, {
        params: {
          page: vm.page,
          address: bchAddress
        }
      }).catch(function () {
        vm.networkError = true
        vm.isloaded = true
      })
      if (response.status === 200 || response.status === 201) {
        const data = response.data
        if (data.history) {
          vm.transactions.push(...data.history)
          vm.has_next = data.has_next
          vm.total_page = data.num_pages
        }
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
  .transaction-row {
    &.dark {
      border-bottom: 1px solid grey;
    }
    &.light {
      border-bottom: 1px solid #DAE0E7;
    }
    .col-transaction {
      padding-top: 2px;
      font-weight: 500;
    }
    .ib-text {
      display: inline-block;
    }
    .currency-icon {
      height: 20px;
      width: 20px;
      border-radius: 50%;
    }
    .transactions-wallet {
      color: #4C4F4F;
    }
    .subtext {
      font-size: 11px;
      color: #4C4F4F;
      opacity: .5;
      &.shift-status {
        font-size: 11px;
        padding-top: 10px;
      }
    }
  }
</style>

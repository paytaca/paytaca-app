<template>
  <div class="cash-in-swap-history" :class="getDarkModeClass(darkMode)">
    <div v-if="showInfo">
      <q-btn
        class="button-text-primary button"
        flat
        padding="md"
        icon="arrow_back"
        @click="showInfo = false"
      />
      <RampShiftInfo
        type="history"
        :info="selectedData"
      />
    </div>

    <div v-else>
      <div class="q-py-lg q-mx-lg" v-if="!historyLoaded">
        <div v-for="n in 5" :key="n" class="skeleton-order-card q-mb-md" :class="getDarkModeClass(darkMode)">
          <div class="row q-px-md q-pt-md">
            <div class="col">
              <div class="row q-pb-sm">
                <q-skeleton type="circle" height="35px" width="30px"/>
                <q-skeleton type="text" width="20px" height="20px" class="q-my-xs q-mx-md" />
                <q-skeleton type="circle" height="35px" width="30px"/>
              </div>

              <q-skeleton type="text" width="25%" height="20px" />
            </div>
            <div class="col-auto text-right">
              <q-skeleton class="float-right" type="text" width="100px" height="45px" />
              <q-skeleton type="rect" width="50%" height="20px" class="q-pt-sm float-right"/>
            </div>
          </div>

          <q-separator class="q-mx-sm q-mt-sm" :dark="darkMode"/>
        </div>
      </div>

      <div v-else-if="networkError" class="text-center q-pa-lg">
        <p class="text-grey-6">{{ $t('CashIn.HistoryUnavailable', {}, 'Could not load your conversions right now.') }}</p>
        <q-btn flat class="button button-text-primary" :label="$t('TryAgain', {}, 'Try again')" @click="reload" />
      </div>

      <div v-else>
        <div v-if="transactions.length === 0" class="relative text-center ">
          <q-img class="vertical-top q-my-md" src="empty-wallet.svg" style="width: 75px; fill: gray;" />
          <p :class="{ 'text-black': !darkMode, 'text-white': darkMode }">{{ $t('NoTransactionsToDisplay') }}</p>
        </div>
        <div v-else class="q-mx-sm">
          <q-card-section style="overflow-y:auto;">
            <q-virtual-scroll :items="transactions">
              <template v-slot="{ item: transaction }">
                <q-item clickable @click="openShiftInfo(transaction)">
                  <q-item-section>
                    <div class="col q-pt-none transaction-row">
                      <div class="row">
                        <div class="col col-transaction">
                          <div>
                            <div class="q-gutter-xs ib-text q-mb-none">
                              <q-avatar>
                                <img class="currency-icon" :src="iconSrc(transaction.shift_info.deposit.icon)" alt="">
                              </q-avatar>
                              <q-icon size="25px" class="button button-text-primary" name="mdi-arrow-right" />
                              <q-avatar>
                                <img class="currency-icon" :src="iconSrc(transaction.shift_info.settle.icon)" alt="">
                              </q-avatar>
                            </div>
                            <div
                              :class="{'text-white': darkMode}"
                              class="q-pt-md q-mb-none transactions-wallet float-right text-right"
                            >
                              <div class="md-font-size">{{ getAmount(transaction.ramp_type, transaction.shift_info) }} BCH</div>
                              <div class="shift-status sm-font-size q-pt-sm" :class="{'pt-label dark': darkMode}">
                                <q-badge class="q-px-sm" rounded outline color="primary">{{ transaction.shift_status.toUpperCase() }}</q-badge>
                              </div>
                            </div>
                          </div>
                          <div class="col q-pt-sm text-grey-6" :class="{'text-white': darkMode}">
                            <span
                              class="q-pb-sm float-left sm-font-size"
                              v-if="transaction.shift_status === 'settled'"
                            >
                              {{ getDate(transaction.date_shift_completed) }}
                            </span>
                            <span class="q-pb-sm float-left sm-font-size" v-else>
                              {{ getDate(transaction.date_shift_created) }}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <q-separator :dark="darkMode" class="q-mt-md"/>
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
              <p v-if="!loadingNextPage" @click="loadMore">{{ $t('ShowMore') }}</p>
              <div class="row justify-center q-pt-sm q-mb-sm" v-if="loadingNextPage">
                <ProgressLoader/>
              </div>
            </div>
          </q-card-section>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import ProgressLoader from 'src/components/ProgressLoader.vue'
import RampShiftInfo from 'src/components/ramp/crypto/RampShiftInfo.vue'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { iconSrc } from 'src/utils/encoding'
import { getMnemonic, Wallet } from 'src/wallet'
import {
  generateReceivingAddress,
  getDerivationPathForWalletType
} from 'src/utils/address-generation-utils.js'

export default {
  name: 'CashInSwapHistory',
  components: {
    ProgressLoader,
    RampShiftInfo
  },
  data () {
    return {
      transactions: [],
      selectedData: {},
      showInfo: false,
      historyLoaded: false,
      loadingNextPage: false,
      networkError: false,
      page: 0,
      has_next: false,
      baseUrl: process.env.ANYHEDGE_BACKEND_BASE_URL
    }
  },
  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    }
  },
  methods: {
    iconSrc,
    getDarkModeClass,
    reload () {
      this.transactions = []
      this.page = 0
      this.has_next = false
      this.networkError = false
      this.historyLoaded = false
      this.getTransactions()
    },
    loadMore () {
      this.loadingNextPage = true
      this.getTransactions()
    },
    openShiftInfo (transaction) {
      this.selectedData = transaction
      this.showInfo = true
    },
    getDate (date) {
      const tempDate = date.split('T')
      return tempDate[0] + ' ' + tempDate[1].substring(0, 5)
    },
    getAmount (ramp, info) {
      return ramp === 'on'
        ? parseFloat(info.settle.amount)
        : -parseFloat(info.deposit.amount)
    },
    async getTransactions () {
      const vm = this
      vm.page += 1

      const mnemonic = await getMnemonic(vm.$store.getters['global/getWalletIndex']).catch(() => null)
      const wallet = new Wallet(mnemonic)
      const walletHash = wallet.BCH.getWalletHash()

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
        vm.historyLoaded = true
        vm.loadingNextPage = false
        return
      }

      const url = vm.baseUrl + '/ramp/history/' + walletHash
      const response = await vm.$axios.get(url, {
        params: {
          page: vm.page,
          address: bchAddress
        }
      }).catch(function () {
        return null
      })

      if (response && (response.status === 200 || response.status === 201)) {
        const data = response.data
        if (data.history) vm.transactions.push(...data.history)
        vm.has_next = data.has_next
      } else {
        vm.networkError = true
      }

      vm.loadingNextPage = false
      vm.historyLoaded = true
    }
  },
  mounted () {
    this.getTransactions()
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
    height: 35px;
    width: 35px;
    border-radius: 50%;
  }
  .transactions-wallet {
    color: #4C4F4F;
  }
}

.sm-font-size {
  font-size: small;
}
.md-font-size {
  font-size: medium;
}
</style>

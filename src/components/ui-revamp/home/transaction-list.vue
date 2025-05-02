<template>
  <q-card class="transaction-history br-15" :style="{ 'padding-bottom': $q.platform.is.ios ? '110px' : '100px'}">
    <div class="card-content">
      <div class="title-small" style="padding-top: 10px;">Transaction History</div>

      <div class="transaction-list">
        <!-- <div class="circle-frame">
          <img :src="getUserAvatarLink('Nikki')">
        </div> -->
        <div v-if="loaded">
          <div v-for="txn in transactions.slice(0,5)">
            {{ txn.txid }} <br>
          </div>
        </div>
      </div>
    </div>
  </q-card>
</template>
<script>
import { getUserAvatarLink } from 'src/utils/theme-ui-revamp-utils.js'
import { getWalletByNetwork } from 'src/wallet/chipnet'

const sep20IdRegexp = /sep20\/(.*)/
const recordTypeMap = {
  all: 'all',
  sent: 'outgoing',
  received: 'incoming'
}

export default {
  data () {
    return {
      transactions: [],
      transactionsPage: 0,
      transactionsPageHasNext: false,
      transactionsLoaded: false,
      transactionsAppending: false,
      transactionsFilter: 'all',
      transactionsMaxPage: 0,
      selectedNetwork: 'BCH',
      selectedAsset: {
        id: 'bch',
        symbol: 'BCH',
        name: 'Bitcoin Cash',
        logo: 'bch-logo.png',
        balance: 0
      },
      transactionsListHeight: '100px'
    }
  },
  props: {
    selectedAssetProps: Object,
    denominationTabSelected: String,
    wallet: Object,
    selectedNetworkProps: String,
    loaded: {
      type: Boolean,
      default: false
    }
  },
  watch: {
    loaded (val) {
      if (val) {
        this.getTransactions()
      }
    }
  },
  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    earliestBlock () {
      if (!Array.isArray(this.transactions) || !this.transactions.length) return 0
      return Math.min(
        ...this.transactions
          .map(tx => tx?.block)
          .filter(Boolean)
          .filter(Number.isSafeInteger)
      )
    },
    showTokens () {
      return this.$store.getters['global/showTokens']
    }
  },
  mounted () {
    this.selectedNetwork = this.selectedNetworkProps
    this.selectedAsset = this.selectedAssetProps
  },
  methods: {
    getUserAvatarLink,
    getTransactions (page = 1, opts = { scrollToBottom: false, txSearchReference: null }) {
      if (this.selectedNetwork === 'sBCH') {
        const address = this.$store.getters['global/getAddress']('sbch')
        return this.getSbchTransactions(address, opts)
      }
      return this.getBchTransactions(page, opts)
    },
    getSbchTransactions (address, opts = { scrollToBottom: false }) {
      const vm = this
      const asset = vm.selectedAsset
      const id = String(vm.selectedAsset.id)

      const filterOpts = {
        limit: 10,
        includeTimestamp: true,
        type: recordTypeMap[vm.transactionsFilter]
      }

      let appendResults = false
      if (Number.isSafeInteger(this.earliestBlock) && this.earliestBlock > 0) {
        filterOpts.before = '0x' + (this.earliestBlock - 1).toString(16)
        appendResults = true
      }

      let requestPromise = null
      if (sep20IdRegexp.test(id)) {
        const contractAddress = vm.selectedAsset.id.match(sep20IdRegexp)[1]
        requestPromise = vm.wallet.sBCH._watchtowerApi.getSep20Transactions(
          contractAddress,
          address,
          filterOpts
        )
      } else {
        requestPromise = vm.wallet.sBCH._watchtowerApi.getTransactions(
          address,
          filterOpts
        )
      }

      if (!requestPromise) return
      if (!appendResults) vm.transactionsLoaded = false
      vm.transactionsAppending = true
      requestPromise
        .then(response => {
          vm.transactionsPageHasNext = false
          if (Array.isArray(response.transactions)) {
            vm.transactionsPageHasNext = response.hasNextPage
            if (!appendResults) vm.transactions = []
            vm.transactions.push(...response.transactions
              .map(tx => {
                tx.senders = [tx.from]
                tx.recipients = [tx.to]
                tx.asset = asset
                return tx
              })
            )
          }
        })
        .finally(() => {
          vm.transactionsAppending = false
          vm.transactionsLoaded = true
        })
    },
    getBchTransactions (page, opts = { scrollToBottom: false }) {
      const vm = this
      const asset = vm.selectedAsset
      const id = vm.selectedAsset.id
      const recordType = recordTypeMap[vm.transactionsFilter]
      const txSearchReference = opts.txSearchReference

      let requestPromise
      if (id.indexOf('slp/') > -1) {
        const tokenId = id.split('/')[1]
        requestPromise = getWalletByNetwork(vm.wallet, 'slp').getTransactions({tokenId, page, recordType})
      } else if (id.indexOf('ct/') > -1) {
        const tokenId = id.split('/')[1]
        requestPromise = getWalletByNetwork(vm.wallet, 'bch').getTransactions({page, recordType, tokenId, txSearchReference})
      } else {
        requestPromise = getWalletByNetwork(vm.wallet, 'bch').getTransactions({page, recordType, txSearchReference})
      }

      if (!requestPromise) return
      vm.transactionsAppending = true
      requestPromise
        .then(function (response) {
          const transactions = response.history || response
          const page = Number(response?.page)
          const hasNext = response?.has_next

          if (!Array.isArray(transactions)) return

          vm.transactions = []
          transactions.map(function (item) {
            item.asset = asset
            return vm.transactions.push(item)
          })

          vm.transactionsPage = page
          vm.transactionsMaxPage = response?.num_pages
          vm.transactionsLoaded = true

          setTimeout(() => {
            vm.transactionsPageHasNext = hasNext
          }, 250)
        })
        .catch(error => {
          console.error('error:', error.response)
        })
        .finally(() => {
          vm.transactionsAppending = false
        })
    },
    resetValues (filter = null, network = null, asset = null) {
      if (filter) this.transactionsFilter = filter
      if (network) this.selectedNetwork = network
      if (asset) this.selectedAsset = asset
      this.transactions = []
      this.transactionsPage = 0
      this.transactionsLoaded = false
      this.pagination = {
        count: 0,
        limit: 0,
        offset: 0
      }
    }
  }
}
</script>
<style lang="scss" scoped>
.transaction-history {
  width: 100%;
  margin-top: 24px;
  .card-content {
    margin: 10px 16px 0px;
  }
  .transaction-list {
    margin-top: 10px;
    .circle-frame {
      border-radius: 50%;
      height: 100px;
      width: 100px;
      // background-color: aquamarine;
      display: flex;
      overflow: hidden;
    }
    .circle-frame img{
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

}
</style>

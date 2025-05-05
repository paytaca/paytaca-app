<template>
  <q-card class="transaction-history br-15" :style="{ 'padding-bottom': $q.platform.is.ios ? '110px' : '100px'}">
    <div class="card-content">
      <div class="title-small" style="padding-top: 10px;">Transaction History</div>

      <div class="transaction-list" v-if="loaded">
        <div class="row justify-between transaction q-py-sm" v-for="txn in transactions.slice(0,5)">
          <div>
            <div class="row">
              <div class="circle-frame">
                <img :src="getUserAvatarLink('Nikki')">
              </div>
              <div class="q-pl-md">
                <span class="body-medium">Username</span><br>
                <span class="label-small">{{ dateFormat(txn.date_created) }}</span>
              </div>
            </div>
          </div>
          <div class="title-small" :class="txn.record_type === 'incoming' ? 'text-incoming': 'text-outgoing'">
            <span v-if="isStablehedgeTx(txn) && stablehedgeTxData(txn)?.amount">
              {{ parseFiatCurrency(stablehedgeTxData(txn)?.amount, stablehedgeTxData(txn)?.currency) }}
            </span>
            <span v-else>
              {{ parseFiatCurrency(marketValueData(txn)?.marketValue, selectedMarketCurrency) }}
            </span>
          </div>
      </div>
      </div>
    </div>
  </q-card>
</template>
<script>
import { getUserAvatarLink } from 'src/utils/theme-ui-revamp-utils.js'
import { getWalletByNetwork } from 'src/wallet/chipnet'
import { extractStablehedgeTxData } from 'src/wallet/stablehedge/history-utils'
import { parseAssetDenomination, parseFiatCurrency } from 'src/utils/denomination-utils'

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
        console.log('loading transaction')
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
    },
    selectedMarketCurrency() {
      const currency = this.$store.getters['market/selectedCurrency']
      return currency?.symbol
    },

  },
  mounted () {
    this.selectedNetwork = this.selectedNetworkProps
    this.selectedAsset = this.selectedAssetProps
  },
  methods: {
    getUserAvatarLink,
    extractStablehedgeTxData,
    parseFiatCurrency,
    badge (txn) {

    },
    asset (txn) {
      return txn?.asset || this.selectedAsset
    },
    selectedAssetMarketPrice (txn) {
      if (!this.asset(txn)) return
      if (!this.selectedMarketCurrency) return
      return $store.getters['market/getAssetPrice'](this.asset(txn), this.selectedMarketCurrency)
    },
    stablehedgeTxData (txn) {
      return  extractStablehedgeTxData(txn)
    },
    isStablehedgeTx (txn) {
      return Boolean(this.stablehedgeTxData(txn))
    },
    marketValueData(txn) {
    const data = {
      marketAssetPrice: null,
      isHistoricalPrice: false,
      marketValue: null
    }
    if (this.selectedMarketCurrency === 'USD' && txn?.usd_price) {
      data.marketAssetPrice = txn.usd_price
      data.isHistoricalPrice = true
    } else if (txn?.market_prices?.[this.selectedMarketCurrency]) {
      data.marketAssetPrice = txn?.market_prices?.[this.selectedMarketCurrency]
      data.isHistoricalPrice = true
    } else {
      data.marketAssetPrice = this.selectedAssetMarketPrice(txn)
      data.isHistoricalPrice = false
    }

    if (data.marketAssetPrice) {
      data.marketValue = (Number(txn?.amount) * Number(data.marketAssetPrice)).toFixed(5)
    }
    return data
    },
    dateFormat (dateCreate) {
      const date = new Date(dateCreate)
      let currentYear = date.getFullYear()
      let dateYear = date.getFullYear()

      let hours = date.getHours()
      let minutes = date.getMinutes().toString().padStart(2, "0")
      let amPm = hours >= 12 ? "PM" : "AM"
      hours = hours % 12 || 12 // Converts 0 to 12-hour format

      let month = date.toLocaleString("en-US", { month: "short" })
      let day = date.getDate()

      // Add the year only if it's not the current year
      let yearPart = dateYear !== currentYear ? `, ${dateYear}` : ""

      let formattedDate = `${hours}:${minutes} ${amPm} | ${month} ${day}${yearPart}`
      return formattedDate
    },
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
    width: 100%;
    .circle-frame {
      border-radius: 50%;
      height: 42px;
      width: 42px;
      display: flex;
      overflow: hidden;
    }
    .circle-frame img{
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }
  .transaction {
    width: 100%;
  }

}
</style>

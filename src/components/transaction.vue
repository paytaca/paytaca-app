<template>
  <div id="transaction">
    <q-dialog ref="dialog" @hide="hide" persistent seamless class="no-click-outside">
      <q-card
        ref="card"
        v-if="transaction && transaction.asset"
        style="padding: 20px 10px 5px 0; max-height:85vh;"
        class="br-15 pt-card text-bow"
        :class="getDarkModeClass(darkMode)"
      >
        <div class="close-button-container row items-center justify-end">
          <q-btn icon="close" flat round dense v-close-popup class="close-button" />
        </div>
        <div class="text-h6 text-uppercase text-center">
          <template v-if="stablehedgeTxView">{{ stablehedgeTxData?.transactionTypeText }}</template>
          <template v-else>{{ actionMap[transaction.record_type] }}</template>
          <q-btn
            v-if="stablehedgeTxData"
            flat padding="xs" icon="loop" style="position: absolute;"
            @click="() => stablehedgeTxView = !stablehedgeTxView"
          />
        </div>
        <div class="text-h6 text-center" style="margin: 10px 0;">
          <q-icon v-if="transaction.record_type === 'incoming'" name="arrow_downward" class="button record-type-icon"></q-icon>
          <q-icon v-if="transaction.record_type === 'outgoing'" name="arrow_upward" class="button record-type-icon"></q-icon>
        </div>
        <q-card-section class="amount-section q-pb-none">
          <q-item class="q-px-none">
            <q-item-section side top class="asset-logo">
              <img
                :src="getImageUrl(transaction.asset)"
                alt="asset-logo"
                height="30"
              />
            </q-item-section>
            <q-item-section>
              <q-item-label>
                {{ `${parseAssetDenomination(
                  denomination === $t('DEEM') || denomination === 'BCH' ? denominationTabSelected : denomination, {
                  ...transaction.asset,
                  balance: stablehedgeTxView ? stablehedgeTxData?.bch : transaction.amount
                })}` }}
              </q-item-label>
              <q-item-label v-if="transactionAmountMarketValue" class="row items-center text-caption">
                <template v-if="stablehedgeTxView">
                  {{ `${parseFiatCurrency(stablehedgeTxData?.amount, stablehedgeTxData?.currency)}` }}
                </template>
                <template v-else>
                  <template v-if="transaction.record_type === 'outgoing'">
                    {{ `${parseFiatCurrency(transactionAmountMarketValue, selectedMarketCurrency)}` }}
                  </template>
                  <template v-else>
                    {{ `${parseFiatCurrency(transactionAmountMarketValue, selectedMarketCurrency)}` }}
                  </template>
                  <q-icon v-if="historicalMarketPrice" name="info" class="q-ml-sm" size="1.5em">
                    <q-popup-proxy v-if="historicalMarketPrice" :breakpoint="0">
                      <div class="q-px-md q-py-sm pt-label text-caption" :class="getDarkModeClass(darkMode)">
                        {{ $t('AssetValueNote') }}
                      </div>
                    </q-popup-proxy>
                  </q-icon>
                </template>
              </q-item-label>
              <q-item-label v-if="!stablehedgeTxView" class="row items-center text-caption" style="margin-top: 0;">
                <template
                  v-if="['bch', 'sbch'].includes(transaction.asset?.symbol.toLowerCase())"
                >
                  <q-badge
                    rounded
                    class="flex justify-start items-center yield-container"
                  >
                    <template v-if="computeYield() > 0">
                      <q-icon
                        size="sm"
                        name="arrow_drop_up"
                        color="green-5"
                      />
                      <span class="yield positive text-weight-bold">
                        {{ parseFiatCurrency(computeYield(), selectedMarketCurrency) }}
                      </span>
                    </template>
                    <template v-else>
                      <q-icon
                        size="sm"
                        name="arrow_drop_down"
                        color="red-5"
                      />
                      <span class="yield negative text-weight-bold">
                        {{ parseFiatCurrency(computeYield(), selectedMarketCurrency) }}
                      </span>
                    </template>
                  </q-badge>
                </template>
              </q-item-label>
              <div v-if="!transaction.asset.id.startsWith('bch')">
                <TokenTypeBadge :assetId="transaction.asset.id" abbreviate />
              </div>
            </q-item-section>
          </q-item>
        </q-card-section>
        <q-card-section class="q-pt-none">
          <q-list class="list">
            <q-item clickable v-ripple @click="copyToClipboard(formatDate(transaction.tx_timestamp || transaction.date_created))">
              <q-item-section>
                <q-item-label class="text-gray" caption>{{ $t('Date') }}</q-item-label>
                <q-item-label>
                  <template v-if="transaction.tx_timestamp">{{ formatDate(transaction.tx_timestamp) }}</template>
                  <template v-else>{{ formatDate(transaction.date_created) }}</template>
                </q-item-label>
              </q-item-section>
            </q-item>
            <q-item v-if="cachedPaymentOTP" clickable v-ripple @click="copyToClipboard(cachedPaymentOTP)">
              <q-item-section>
                <q-item-label class="text-gray" caption>{{ $t('PaymentOTP', {}, 'Payment OTP') }}</q-item-label>
                <q-item-label>
                  {{ cachedPaymentOTP }}
                </q-item-label>
              </q-item-section>
            </q-item>
            <q-item
              clickable
              v-ripple
              style="overflow-wrap: anywhere;"
              v-if="!isSep20Tx && (transaction.asset.id.startsWith('bch') || transaction.asset.id.startsWith('ct/'))"
              @click="copyToClipboard(isSep20Tx ? transaction.hash.substring(0, 6).toUpperCase() : transaction.txid.substring(0, 6).toUpperCase())"
            >
              <q-item-section>
                <q-item-label class="text-gray" caption>{{ $t('ReferenceId') }}</q-item-label>
                <q-item-label>
                  {{ transaction.txid.substring(0, 6).toUpperCase() }}
                </q-item-label>
              </q-item-section>
            </q-item>
            <q-item
              clickable
              v-ripple
              @click="copyToClipboard(isSep20Tx ? transaction.hash : transaction.txid)" style="overflow-wrap: anywhere;"
            >
              <q-item-section>
                <q-item-label class="text-gray" caption>{{ $t('TransactionId') }}</q-item-label>
                <q-item-label v-if="isSep20Tx">{{ transaction.hash }}</q-item-label>
                <q-item-label v-else>{{ transaction.txid }}</q-item-label>
              </q-item-section>
            </q-item>
            <template v-if="stablehedgeTxView">
              <q-item
                style="overflow-wrap: anywhere;"
                clickable v-ripple
                @click="copyToClipboard(stablehedgeTxData?.redemptionContract)"
              >
                <q-item-section>
                  <q-item-label class="text-gray" caption>{{ $t('ContractAddress') }}</q-item-label>
                  <q-item-label>{{ stablehedgeTxData?.redemptionContract }}</q-item-label>
                </q-item-section>
              </q-item>
            </template>
            <template v-else>
              <!-- <q-item clickable v-ripple v-if="transaction.record_type === 'incoming'" style="overflow-wrap: anywhere;">
                <q-item-section v-if="isSep20Tx" @click="copyToClipboard(transaction.from)">
                  <q-item-label class="text-gray" caption>
                    <span>{{ $t('Sender') }}</span>
                  </q-item-label>
                  <q-item-label>{{ transaction.from }}</q-item-label>
                </q-item-section>
                <q-item-section v-else @click="copyToClipboard(concatenate(transaction.senders))">
                  <q-item-label class="text-gray" caption>
                    <span v-if="transaction.senders.length === 1">{{ $t('Sender') }}</span>
                    <span v-if="transaction.senders.length > 1">{{ $t('Senders') }}</span>
                  </q-item-label>
                  <q-item-label>{{ concatenate(transaction.senders) }}</q-item-label>
                </q-item-section>
              </q-item> -->
              <q-item clickable v-ripple v-if="transaction.record_type === 'outgoing'" style="overflow-wrap: anywhere;">
                <q-item-section v-if="isSep20Tx" @click="copyToClipboard(transaction.to)">
                  <q-item-label class="text-gray" caption>
                    <span>{{ $t('Recipient') }}</span>
                  </q-item-label>
                  <q-item-label>{{ transaction.to }}</q-item-label>
                </q-item-section>
                <q-item-section v-else @click="copyToClipboard(concatenate(transaction.recipients))">
                  <q-item-label class="text-gray" caption>
                    <span v-if="transaction.recipients.length === 1">{{ $t('Recipient') }}</span>
                    <span v-if="transaction.recipients.length > 1">{{ $t('Recipients') }}</span>
                  </q-item-label>
                  <template v-if="transaction.asset.symbol === 'BCH'">
                    <q-item-label>
                      <div
                        v-for="(data, index) in transaction.recipients.slice(0, 10)"
                        class="row col-12 q-gutter-x-sm q-mb-xs"
                        :key="index"
                      >
                        <span class="col-1">#{{ index + 1 }}</span>
                        <span class="col-5" style="overflow-wrap: anywhere;">{{ data[0] }}</span>
                        <span class="col-4">
                          {{
                            `${parseAssetDenomination(
                                denomination === $t('DEEM') || denomination === 'BCH' ? denominationTabSelected : denomination,
                                {
                                  ...transaction.asset,
                                  balance: data[1] / (10 ** 8),
                                  thousandSeparator: true
                                }
                              )}`
                          }}
                        </span>
                      </div>
                      <span
                        v-if="transaction.recipients.length > 10"
                        class="row col-12 justify-center q-mt-sm"
                      >
                        {{
                          $t(
                            "AndMoreAddresses",
                            { addressCount: transaction.recipients.length - 10 },
                            `and ${transaction.recipients.length - 10} more addresses`
                          )
                        }}
                      </span>
                    </q-item-label>
                  </template>
                  <template v-else>
                    <q-item-label>
                      <div
                        v-for="(data, index) in transaction.recipients.slice(0, 10)"
                        class="row col-12 q-gutter-x-sm q-mb-xs"
                        :key="index"
                      >
                        <template v-if="data[3]">
                          <span class="col-1">#{{ index + 1 }}</span>
                          <span class="col-5" style="overflow-wrap: anywhere;">{{ convertCashAddress(data[0], $store.getters['global/isChipnet'], true) }}</span>
                          <span class="col-4">
                              {{ formatTokenAmount({amount: data[3], asset: transaction.asset}, absolute=true) }}
                          </span>
                        </template>
                      </div>
                      <span
                        v-if="transaction.recipients.length > 10"
                        class="row col-12 justify-center q-mt-sm"
                      >
                        {{
                          $t(
                            "AndMoreAddresses",
                            { addressCount: transaction.recipients.length - 10 },
                            `and ${transaction.recipients.length - 10} more addresses`
                          )
                        }}
                      </span>
                    </q-item-label>
                  </template>
                </q-item-section>
              </q-item>
            </template>
            <q-item>
              <q-item-section v-if="isSep20Tx">
                <q-item-label class="text-gray" caption>{{ $t('GasFee') }}</q-item-label>
                <q-item-label>
                  {{ getAssetDenomination(
                    denomination === $t('DEEM') || denomination === 'BCH' ? denominationTabSelected : denomination,
                    transaction.gas) }}
                </q-item-label>
                <q-item-label v-if="txFeeMarketValue" caption>
                  {{ parseFiatCurrency(txFeeMarketValue, selectedMarketCurrency) }}
                </q-item-label>
              </q-item-section>
              <q-item-section v-else>
                <q-item-label class="text-gray" caption>{{ $t('MinerFee') }}</q-item-label>
                <q-item-label>
                  {{ getAssetDenomination(
                    denomination === $t('DEEM') || denomination === 'BCH' ? denominationTabSelected : denomination,
                    transaction.tx_fee / (10**8)) }}
                </q-item-label>
                <q-item-label v-if="txFeeMarketValue" caption>
                  {{ parseFiatCurrency(txFeeMarketValue, selectedMarketCurrency) }}
                </q-item-label>
              </q-item-section>
            </q-item>
            <!-- <q-item v-if="anyhedgeContracts?.length">
              <q-item-section>
                <q-item-label class="text-gray" caption>AnyHedge</q-item-label>
                <q-item-label v-for="(contractInfo, index) in anyhedgeContracts" :key="index">
                  <q-popup-proxy :breakpoint="0">
                    <div class="q-px-sm q-py-xs text-caption pt-label" :class="getDarkModeClass(darkMode)">
                      {{ contractInfo.label }}
                    </div>
                  </q-popup-proxy>
                  <div class="row items-center">
                    <div class="q-space">
                      {{ ellipsisText(contractInfo.address, { end: 5 }) }}
                    </div>
                    <q-btn
                      flat icon="content_copy"
                      size="sm" padding="xs sm"
                      @click.stop="copyToClipboard(contractInfo.address)"
                    />
                    <q-separator vertical :dark="darkMode"/>
                    <q-btn
                      flat icon="open_in_new"
                      size="sm" padding="xs sm"
                      @click.stop="displayAnyhedgeContract(contractInfo.address)"
                    />
                  </div>
                </q-item-label>
              </q-item-section>
            </q-item> -->
            <q-item clickable>
              <q-item-section v-if="isSep20Tx">
                <q-item-label class="text-gray" caption>{{ $t('ExplorerLink') }}</q-item-label>
                <q-item-label>
                  <a
                    style="text-decoration: none;"
                    class="button button-text-primary"
                    :href="'https://sonar.cash/tx/' + transaction.hash"
                  >
                    {{ $t('ViewInExplorer') }}
                  </a>
                </q-item-label>
              </q-item-section>
              <q-item-section v-else>
                <q-item-label class="text-gray" caption>{{ $t('ExplorerLink') }}</q-item-label>
                <q-item-label>
                  <a
                    style="text-decoration: none;"
                    class="button button-text-primary"
                    :class="getDarkModeClass(darkMode)"
                    :href="explorerLink"
                  >
                    {{ $t('ViewInExplorer') }}
                  </a>
                </q-item-label>
              </q-item-section>
            </q-item>
            <template v-if="attributeDetails?.length">
              <q-separator spaced/>
              <div class="q-px-md row items-center">
                <div class="text-subtitle1 q-space">Transaction metadata</div>
                <q-btn flat icon="more_vert" padding="sm" round class="q-r-mr-md">
                  <q-menu class="pt-card-2 text-bow" :class="getDarkModeClass(darkMode)">
                    <q-item
                      :active="displayRawAttributes"
                      clickable v-close-popup
                      @click="() => displayRawAttributes = true"
                    >
                      <q-item-section>
                        <q-item-label>Display raw data</q-item-label>    
                      </q-item-section>
                    </q-item>
                    <q-item
                      :active="!displayRawAttributes"
                      clickable v-close-popup
                      @click="() => displayRawAttributes = false"
                    >
                      <q-item-section>
                        <q-item-label>Display refined data</q-item-label>    
                      </q-item-section>
                    </q-item>
                  </q-menu>
                </q-btn>
              </div>
            </template>
            <q-slide-transition>
              <div>
                <div v-if="!displayRawAttributes" v-for="(group, index) in attributeDetails" class="q-my-sm"> 
                  <div class="q-px-md text-subtitle1">{{group?.name}}</div>
                  <!-- <q-separator inset/> -->
                  <q-item
                    v-for="(attributeDetails, index2) in group?.items" :key="`${index}-${index2}`"
                  >
                    <q-item-section>
                      <q-item-label class="text-grey row items-center">
                        <div>{{ attributeDetails?.label }}</div>
                        <template v-if="attributeDetails?.tooltip">
                          <q-icon name="description" size="1.25em" class="q-ml-xs"/>
                          <q-menu class="pt-card-2 text-bow q-pa-sm" :class="getDarkModeClass(darkMode)">
                            {{ attributeDetails?.tooltip }}
                          </q-menu>
                        </template>
                      </q-item-label>
                      <q-item-label>
                        <div class="row items-start no-wrap">
                          <div class="q-space q-my-xs" style="word-break:break-all">
                            {{ attributeDetails?.text }}
                          </div>
                          <div
                            v-for="(action, index3) in attributeDetails?.actions" :key="`${index}-${index2}-${index3}`"
                            class="row items-center"
                          >
                            <q-btn
                              flat :icon="action?.icon"
                              size="sm" padding="xs sm"
                              @click.stop="() => handleAttributeAction(action)"
                            />
                            <q-separator
                              v-if="index3 < attributeDetails?.actions?.length - 1"
                              vertical
                              :dark="darkMode"
                            />
                          </div>
                        </div>
                      </q-item-label>
                    </q-item-section>
                  </q-item>
                </div>
              </div>
            </q-slide-transition>
            <q-slide-transition>
              <div v-if="displayRawAttributes">
                <q-item v-for="(attribute, index) in transaction?.attributes" :key="index">
                  <q-item-section side top>
                    <q-item-label caption class="text-grey">
                      #{{index+1}}
                    </q-item-label>
                  </q-item-section>
                  <q-item-section>
                    <q-item-label caption class="text-grey row items-center">
                      <div>{{ attribute?.key }}</div>
                      <template v-if="attribute?.description">
                        <q-icon size="1.25em" name="description" class="q-ml-xs"/>
                        <q-menu class="pt-card-2 text-bow q-pa-sm" :class="getDarkModeClass(darkMode)">
                          {{ attribute?.description }}
                        </q-menu>
                      </template>
                    </q-item-label>
                    <q-item-label style="word-break:break-all;">
                      {{ attribute?.value }}
                    </q-item-label>
                  </q-item-section>
                  <q-item-section side top>
                    <q-btn
                      flat icon="content_copy"
                      size="sm" padding="xs sm"
                      @click="() => copyToClipboard(JSON.stringify(attribute))"
                    />
                  </q-item-section>
                </q-item>
              </div>
            </q-slide-transition>
          </q-list>
        </q-card-section>
      </q-card>
    </q-dialog>
  </div>
</template>

<script>
import TokenTypeBadge from './TokenTypeBadge'
import { ellipsisText, parseHedgePositionData } from 'src/wallet/anyhedge/formatters'
import { anyhedgeBackend } from 'src/wallet/anyhedge/backend'
import HedgeContractDetailDialog from 'src/components/anyhedge/HedgeContractDetailDialog.vue'
import JppDetailDialog from 'src/components/JppDetailDialog.vue'
import { convertTokenAmount, convertCashAddress } from 'src/wallet/chipnet'
import { getAssetDenomination, parseAssetDenomination, parseFiatCurrency } from 'src/utils/denomination-utils'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { parseAttributesToGroups } from 'src/utils/tx-attributes'
import { JSONPaymentProtocol } from 'src/wallet/payment-uri'
import { extractStablehedgeTxData } from 'src/wallet/stablehedge/history-utils'

export default {
  name: 'transaction',
  props: {
    wallet: Object,
    denominationTabSelected: String,
    hideCallback: {
      type: Function
    }
  },
  components: {
    TokenTypeBadge,
  },
  data () {
    return {
      actionMap: {
        incoming: this.$t('Received'),
        outgoing: this.$t('Sent')
      },
      transaction: {},
      stablehedgeTxView: false,
      displayRawAttributes: false,
      denomination: this.$store.getters['global/denomination']
    }
  },
  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    isChipnet () {
      return this.$store.getters['global/isChipnet']
    },
    explorerLink () {
      const txid = this.transaction.txid
      let url = 'https://blockchair.com/bitcoin-cash/transaction/'

      if (this.transaction.asset.id.split('/')[0] === 'ct')
        url = 'https://explorer.bitcoinunlimited.info/tx/'

      if (this.isChipnet) {
        url = `${process.env.TESTNET_EXPLORER_URL}/tx/`
      }

      return `${url}${txid}`
    },
    isSep20Tx () {
      const hash = String(this.transaction && this.transaction.hash)
      return /^0x[0-9a-f]{64}/i.test(hash)
    },
    fallbackAssetLogo () {
      if (!this.transaction || !this.transaction.asset) return ''
      const logoGenerator = this.$store.getters['global/getDefaultAssetLogo']
      return logoGenerator(String(this.transaction.asset.id))
    },
    selectedMarketCurrency () {
      const currency = this.$store.getters['market/selectedCurrency']
      return currency && currency.symbol
    },
    historicalMarketPrice() {
      if (this.selectedMarketCurrency === 'USD' && this.transaction.usd_price) return this.transaction.usd_price
      if (this.transaction?.market_prices?.[this.selectedMarketCurrency]) return this.transaction?.market_prices?.[this.selectedMarketCurrency]
      return null
    },
    marketAssetPrice () {
      return this.$store.getters['market/getAssetPrice'](this.transaction.asset.id, this.selectedMarketCurrency)
    },
    transactionAmountMarketValue () {
      const transaction = this.transaction
      if (!transaction) return ''
      if (!this.marketAssetPrice) return ''
      if (transaction.usd_price || Object.keys(transaction.market_prices).length > 0) {
        const marketPrices = transaction.market_prices
        const currentFiatMarketPrice = marketPrices ? marketPrices[this.selectedMarketCurrency] : marketPrices
        if (currentFiatMarketPrice) {
          return (Number(transaction.amount) * Number(currentFiatMarketPrice)).toFixed(5)
        }
      }

      return (Number(transaction.amount) * Number(this.marketAssetPrice)).toFixed(5)
    },
    txFeeMarketValue () {
      const bchMarketValue = this.$store.getters['market/getAssetPrice']('bch', this.selectedMarketCurrency)
      if (!bchMarketValue) return ''
      const gas = this.transaction && (this.isSep20Tx ? this.transaction.gas : this.transaction.tx_fee / (10 ** 8))
      if (!gas) return ''
      return (Number(gas) * Number(bchMarketValue)).toFixed(8)
    },
    cachedPaymentOTP() {
      return this.$store.getters['paytacapos/paymentOTPCache'](this.transaction?.txid)?.otp || ''
    },
    anyhedgeContracts() {
      if (!Array.isArray(this.transaction.attributes)) return
      const contracts = this.transaction.attributes
        .map(attribute => {
          switch(attribute?.key) {
            case('anyhedge_funding_tx'):
              return { label: 'Funding transaction', address: attribute?.value }
            case('anyhedge_hedge_funding_utxo'):
              return { label: 'Hedge funding UTXO', address: attribute?.value }
            case('anyhedge_long_funding_utxo'):
              return { label: 'Long funding UTXO', address: attribute?.value }
            case('anyhedge_settlement_tx'):
              return { label: this.$t('SettlementTransaction'), address: attribute?.value }
          }
        })
        .filter(Boolean)
      return contracts
    },
    attributeDetails() {
      if (!Array.isArray(this.transaction?.attributes)) return []
      let groups = parseAttributesToGroups({attributes: this.transaction?.attributes})
      if (this.stablehedgeTxView) {
        groups = groups.filter(group => {
          return !group.items.some(item => item.key === 'stablehedge_transaction')
        })
      }
      return groups
    },
    stablehedgeTxData() {
      return extractStablehedgeTxData(this.transaction)
    }
  },
  methods: {
    ellipsisText,
    convertTokenAmount,
    getAssetDenomination,
    parseAssetDenomination,
    parseFiatCurrency,
    getDarkModeClass,
    convertCashAddress,
    concatenate (array) {
      let addresses = array.map(function (item) {
        return item[0]
      })
      addresses = [...new Set(addresses)]
      if (addresses.length === 1) {
        return addresses[0]
      } else {
        return addresses.join(', ')
      }
    },
    show (transaction) {
      try {
        this.transaction = transaction
        this.$refs.dialog.show()
      } catch (err) {}
    },
    hide () {
      this.$refs.dialog.hide()
      this.$parent.toggleHideBalances()
    },
    formatDate (date) {
      const dateObj = new Date(date)
      return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'medium' }).format(dateObj)
    },
    copyToClipboard (value) {
      this.$copyText(value)
      this.$q.notify({
        color: 'blue-9',
        message: this.$t('CopiedToClipboard'),
        icon: 'mdi-clipboard-check',
        timeout: 200
      })
    },
    getImageUrl (asset) {
      if (this.denomination === this.$t('DEEM') && asset.symbol === 'BCH') {
        return 'assets/img/theme/payhero/deem-logo.png'
      } else {
        if (asset.logo) {
          if (asset.logo.startsWith('https://ipfs.paytaca.com/ipfs')) {
            return asset.logo + '?pinataGatewayToken=' + process.env.PINATA_GATEWAY_TOKEN
          } else {
            return asset.logo
          }
        } else {
          return this.fallbackAssetLogo
        }
      }
    },
    displayAnyhedgeContract(contractAddress) {
      const walletHash = this.$store.getters['global/getWallet']('bch')?.walletHash
      const dialog = this.$q.dialog({
        title: 'AnyHedge Contract',
        message: 'Fetching contract',
        ok: false,
        seamless: true,
        progress: true,
        class: `br-15 pt-card text-bow ${this.getDarkModeClass(this.darkMode)}`
      })
      anyhedgeBackend.get(`anyhedge/hedge-positions/${contractAddress}/`)
        .then(async (response) => {
          if (!response?.data?.address) return Promise.reject({ response }) 
          const parsedContractData = await parseHedgePositionData(response?.data)
          dialog.hide()

          let viewAs
          if (parsedContractData?.shortWalletHash === walletHash) viewAs = 'short'
          if (parsedContractData?.longWalletHash === walletHash) viewAs = 'long'
          this.$q.dialog({
            component: HedgeContractDetailDialog,
            componentProps: {
              contract: parsedContractData,
              wallet: this.wallet,
              viewAs: viewAs,
              viewPositionInTitle: true,
            },
          })
          return Promise.resolve(response)
        })
        .catch(error => {
          console.error(error)
          dialog.update({ message: 'Unable to fetch contract data' })
        })
    },
    displayJppInvoice(uuid) {
      const dialog = this.$q.dialog({
        title: 'Invoice',
        message: 'Fetching data',
        ok: false,
        seamless: true,
        progress: true,
        class: `br-15 pt-card text-bow ${this.getDarkModeClass(this.darkMode)}`
      })
      return JSONPaymentProtocol.fetch(`https://watchtower.cash/api/jpp/invoices/${uuid}/`)
        .then(response => {
          dialog.hide()
          this.$q.dialog({
            component: JppDetailDialog,
            componentProps: {
              jpp: response,
            },
          })
          return response
        })
        .catch(error => {
          console.error(error)
          dialog.update({ message: 'Unable to fetch data' })
        })
    },
    formatTokenAmount (transaction, absolute=false) {
      const _amount = absolute ? Math.abs(transaction.amount) : transaction.amount
      const amount = _amount / (10 ** transaction.asset.decimals)
      const amountString = amount.toLocaleString('en-us', {maximumFractionDigits: transaction.asset.decimals})
      return `${amountString} ${transaction.asset.symbol}`
    },
    computeYield () {
      const fiatAmount = Math.abs(this.transactionAmountMarketValue)
      const currentFiatPrice = Math.abs(this.transaction.amount) * this.marketAssetPrice
      const currentYield = currentFiatPrice - fiatAmount
      return Number(currentYield.toFixed(2)) === 0.00 || Number(currentYield.toFixed(2)) === 0
        ? Math.abs(currentYield)
        : currentYield
    },
    /**
     * @param {{type: String, args?: any[]}} action
     */
    handleAttributeAction(action) {
      const args = Array.isArray(action?.args) ? action?.args : []
      if (action?.type === 'copy_to_clipboard') {
        return this.copyToClipboard(...args)
      } else if (action?.type === 'open_anyhedge_contract') {
        return this.displayAnyhedgeContract(...args)
      } else if (action?.type === 'open_jpp_invoice') {
        return this.displayJppInvoice(...args)
      }
    }
  },
  watch: {
    stablehedgeTxData() {
      if (this.stablehedgeTxData) return
      this.stablehedgeTxView = false
    },
  },
  mounted () {
    document.addEventListener('backbutton', () => {
      this.$refs.dialog.hide()
    })
  }
}
</script>

<style lang="scss" scoped>
  .close-button-container {
    right: 0;
    top: 0;
    position: sticky;
    z-index: 100;
  }
  .record-type-icon {
    font-size: 30px;
    border-radius: 20px;
  }
  .amount-section {
    font-size: 20px;
    margin-left: 16px;
    .asset-logo {
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .yield-container {
      margin-top: 5px;
      background-color: #ecf3f3;
      .yield {
        padding-right: 5px;
        &.positive {
          color: $green-5;
        }
        &.negative {
          color: $red-5;
        }
      }
    }
  }
  .text-gray {
    color: gray;
  }
</style>

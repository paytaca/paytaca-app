<template>
  <div class="static-container">
    <QrScanner
      v-model="showQrScanner"
      @decode="onScannerDecode"
    />
    <div id="app-container" class="sticky-header-container" :class="getDarkModeClass(darkMode)">
      <header-nav :title="$t('Sweep')" backnavpath="/" />
      <div
        id="app"
        ref="app"
        class="text-bow"
        :class="getDarkModeClass(darkMode)"
        :style="{ 'padding-top': $q.platform.is.ios ? '30px' : '0px'}"
      >
        <div class="text-center text-h6" v-if="fetching" style="margin-top: 25px;">
          <p>{{ $t('Scanning') }}...</p>
          <progress-loader />
        </div>

        <div class="text-center text-h6" v-if="isDecrypting" style="margin-top: 25px;">
          <p>{{ $t('Decrypting') }}...</p>
          <progress-loader />
        </div>

        <template v-if="!submitted">
          <q-form v-if="bip38String === ''" class="text-center wide-margin-top">
            <textarea
              v-if="cashTokensCount === 0"
              v-model="wif"
              class="sweep-input"
              rows="2"
              :placeholder="$t('SweepInputPlaceholder')"
            >
            </textarea>
            <br>
            <template v-if="!wif">
              <div class="text-uppercase or-label">
                {{ $t('or') }}
              </div>
              <q-btn round size="lg" class="button bg-grad" icon="mdi-qrcode" @click="showQrScanner = true" />
            </template>
            <div style="margin-top: 20px; ">
              <q-btn
                class="button"
                color="primary"
                v-if="cashTokensCount === 0 && wif"
                @click.prevent="getTokens"
              >
                {{ $t('Scan') }}
              </q-btn>
              <p v-if="wif && error" style="color: red;">
                {{ error }}
              </p>
            </div>
          </q-form>

          <div v-else class="flex flex-center text-center text-h6 q-mt-lg">
            <span class="q-mb-md">{{ $t('BIP38WalletDetected') }}</span>
            <q-input
              outlined
              autogrow
              v-model="passPhrase"
              class="full-width passphrase-input"
              type="textarea"
              :dark="darkMode"
              :placeholder="$t('BIP38WalletPassphrase')"
            />
            <q-btn
              class="q-mt-md button passphrase-input"
              :label="$t('Decrypt')"
              :disabled="passPhrase.length === 0"
              @click.prevent="decryptEncryptedWallet"
            />
          </div>
        </template>

        <div v-else-if="emptyAssets && showSuccess" class="text-center wide-margin-top">
          <q-icon
            name="check_circle" size="150px"
            color="green"
          />
          <div class="text-h5">{{ $t('Success') }}</div>
          <div class="text-body1">{{ $t('SweepSuccessMessage') }}</div>
          <q-btn
            flat
            no-caps :label="$t('Home')"
            class="button wide-margin-top"
            to="/"
          />
        </div>

        <div
          v-else-if="!fetching"
          :class="cashTokensCount <= 0 ? 'wide-margin-top' : ''"
        >
          <div v-if="sweeper && Number.isFinite(bchBalance)">
            <!-- Address Display - Always show -->
            <div class="q-mb-lg q-px-md address-section">
              <div class="address-card q-pa-md rounded-borders q-mb-md">
                <div class="text-caption text-weight-medium q-mb-xs" :class="darkMode ? 'text-grey-5' : 'text-grey-7'" style="text-transform: uppercase; letter-spacing: 0.5px;">
                  {{ $t('Address') }}
                </div>
                <div class="text-body2 text-weight-medium q-mb-sm" :class="darkMode ? 'text-grey-3' : 'text-grey-9'" style="word-break: break-all;">
                  {{ sweeper.bchAddress }}
                  <q-icon name="mdi-content-copy" size="18px" @click="copyToClipboard(sweeper.bchAddress)" class="q-ml-xs cursor-pointer copy-icon" />
                </div>
                <a
                  :href="getAddressExplorerLink(sweeper.bchAddress)"
                  target="_blank"
                  class="text-primary text-body2 explorer-link"
                  style="text-decoration: none; font-weight: 500;"
                >
                  {{ $t('ViewInExplorer', {}, 'View in Explorer') }}
                  <q-icon name="open_in_new" size="16px" class="q-ml-xs" />
                </a>
              </div>
              
              <div v-if="allAssets.length > 0" class="text-center text-subtitle1 text-weight-medium q-mt-lg" :class="darkMode ? 'text-grey-5' : 'text-grey-7'">
                {{ $t('CheckTheAssetsThatYouWouldLikeToSweep', {}, 'Check the assets that you would like to sweep') }}
              </div>
            </div>

            <!-- Asset List - Only show if there are assets -->
            <div v-if="allAssets.length > 0">
              <div class="q-px-md">
                <q-list class="asset-list">
                <q-card
                  v-for="(asset, index) in allAssets"
                  :key="asset.id"
                  class="q-py-sm q-my-sm br-15 asset-card"
                  :class="{ 
                    'sweeping': sweeping && selectedToken === asset.id,
                    'cursor-pointer': !sweeping && !skippedTokens.includes(asset.id)
                  }"
                  @click="handleAssetClick(asset.id)"
                >
                  <q-item class="no-hover-effect">
                    <q-item-section avatar>
                      <q-avatar>
                        <img :src="getImageUrl(asset)" :alt="asset.name">
                      </q-avatar>
                    </q-item-section>
                    <q-item-section>
                      <div class="text-bold">{{ asset.name }}</div>
                      <div :class="darkMode ? 'text-grey-5' : 'text-grey-8'">
                        {{ formatAssetBalance(asset) }}
                      </div>
                      <div v-if="getAssetFiatValue(asset)" class="text-caption" :class="darkMode ? 'text-grey-6' : 'text-grey-7'">
                        {{ getAssetFiatValue(asset) }}
                      </div>
                    </q-item-section>
                    <q-item-section side>
                      <div 
                        class="custom-circular-checkbox"
                        :class="{ 
                          'selected': selectedAssets.includes(asset.id),
                          'disabled': sweeping || skippedTokens.includes(asset.id)
                        }"
                      >
                        <q-icon 
                          :name="selectedAssets.includes(asset.id) ? 'check_circle' : 'radio_button_unchecked'" 
                          size="28px"
                        />
                      </div>
                    </q-item-section>
                  </q-item>
                  <div v-if="sweeping && selectedToken === asset.id" class="q-pa-sm text-center">
                    <progress-loader />
                  </div>
                </q-card>
              </q-list>

              <div v-if="sweeping && selectedToken === null" class="q-mt-md text-center">
                <progress-loader />
              </div>

              <div v-else-if="!sweeping" class="q-mt-md text-center">
                <span class="text-red text-body2">
                  <template v-if="cashTokensCount === 0 && bchBalance === 0">{{ $t('SweepErrMsg1') }}</template>
                  <i v-else-if="!hasEnoughBalances">{{ $t('EmptyBalancesError') }}</i>
                  <i v-else-if="bchBalance === 0">{{ $t('UseWalletBalance') }}</i>
                </span>
              </div>

              <!-- Sweep Button -->
              <div class="q-mt-lg q-mb-md">
                <q-btn
                  v-if="!sweeping && allAssets.length > 0"
                  color="primary"
                  :disabled="!hasEnoughBalances || selectedAssets.length === 0"
                  :label="getSweepButtonLabel()"
                  @click.prevent="sweepSelected"
                  class="sweep-action-button full-width"
                  size="md"
                  unelevated
                  rounded
                >
                  <template v-if="selectedAssets.length > 0 && selectedAssets.length < allAssets.length">
                    <q-badge color="white" text-color="primary" rounded class="q-ml-sm">
                      {{ selectedAssets.length }}
                    </q-badge>
                  </template>
                </q-btn>
                </div>
              </div>
            </div>

            <!-- Show empty state message when address has no assets -->
            <div v-if="allAssets.length === 0" class="text-center q-mt-lg q-px-md">
              <q-icon name="inbox" size="80px" :color="darkMode ? 'grey-6' : 'grey-5'" />
              <p class="text-h6 q-mt-md" :class="darkMode ? 'text-grey-4' : 'text-grey-7'">{{ $t('SweepErrMsg1') }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { markRaw } from '@vue/reactivity'
import HeaderNav from '../../components/header-nav'
import ProgressLoader from '../../components/ProgressLoader'
import SweepPrivateKey, { extractWifFromUrl } from '../../wallet/sweep'
import QrScanner from '../../components/qr-scanner.vue'
import { getMnemonic, Wallet } from '../../wallet'
import { getDarkModeClass, isHongKong } from 'src/utils/theme-darkmode-utils'
import { CashNonFungibleToken } from 'src/wallet/cashtokens'
import { convertCashAddress, convertToTokenAmountWithDecimals } from 'src/wallet/chipnet'
import { convertIpfsUrl } from 'src/wallet/cashtokens'
import { parseFiatCurrency } from 'src/utils/denomination-utils'
import bip38 from '@asoltys/bip38'
import * as wifPackage from 'wif'

export default {
  name: 'sweep',
  components: {
    HeaderNav,
    ProgressLoader,
    QrScanner
  },
  props: {
    w: String,
    bip38String: { type: String, default: '' }
  },
  data () {
    return {
      wallet: null,
      wif: '',
      nonFungibleCashTokens: [].map(CashNonFungibleToken.parse),
      fungibleCashTokens: [].map(() => {
        return {
          category: '',
          balance: 0,
          parsedMetadata: {
            fungible: true,
            name: '',
            symbol: '',
            decimals: 0,
            imageUrl: '',
          },
        }
      }),
      skippedTokens: [],
      selectedAssets: [],
      bchBalance: null,
      sweeper: null,
      submitted: false,
      fetching: false,
      sweeping: false,
      fetchingTokens: false,
      selectedToken: null,
      expandCashTokens: false,
      showSuccess: false,
      showQrScanner: false,
      error: null,
      passPhrase: '',
      isDecrypting: false,
      hasEnoughBalances: true,
      tokenIndex: 0,
      hasSuccessfulSweeps: false, // Track if any successful sweeps occurred in this session

      sweepTxidMap: {
        'bch': '',
        /** 'token-id-and-commitment': '', */
      }
    }
  },
  watch: {
    wif (value) {
      if (value.length === 0) {
        this.error = null
      }
    },
    w() {
      if (this.wif || this.sweeper) return
      this.wif = extractWifFromUrl(this.w) || this.w
      this.getTokens(true)
    },
  },
  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    currentCountry () {
      return this.$store.getters['global/country'].code
    },
    denomination () {
      return this.$store.getters['global/denomination']
    },
    theme () {
      return this.$store.getters['global/theme']
    },
    assetPrices () {
      return this.$store.getters['market/assetPrices']
    },
    selectedCurrency () {
      return this.$store.getters['market/selectedCurrency']
    },
    cashTokensCount() {
      const ctFts = Number.parseInt(this.fungibleCashTokens?.length) || 0
      const ctNfts = Number.parseInt(this.nonFungibleCashTokens?.length) || 0
      return ctFts + ctNfts
    },
    emptyAssets() {
      const DUST = 546 / 10 ** 8
      return this.bchBalance < DUST && this.cashTokensCount === 0
    },
    async getWalletBchBalance() {
      const resp = await this.wallet.BCH.getBalance()
      return resp.balance
    },
    allAssets() {
      const assets = []
      const DUST = 546 / 10 ** 8

      // Add BCH first (at the top) only if balance is above dust threshold
      if (this.bchBalance !== null && Number.isFinite(this.bchBalance) && this.bchBalance >= DUST) {
        assets.push({
          id: 'bch',
          name: 'Bitcoin Cash',
          symbol: this.denomination || 'BCH',
          balance: this.bchBalance,
          decimals: 8,
          type: 'bch',
          logo: 'bch-logo.png'
        })
      }

      // Add fungible tokens with ct/ prefix for price lookup
      this.fungibleCashTokens.forEach(token => {
        if (token.balance > 0) {
          assets.push({
            id: `ct/${token.category}`,
            name: token?.parsedMetadata?.name || 'Unknown Token',
            symbol: token?.parsedMetadata?.symbol || '',
            balance: token.balance,
            decimals: token?.parsedMetadata?.decimals || 0,
            type: 'fungible',
            logo: token?.parsedMetadata?.imageUrl || null,
            category: token.category
          })
        }
      })

      // Add non-fungible tokens
      this.nonFungibleCashTokens.forEach(nft => {
        assets.push({
          id: `${nft.category}|${nft.commitment}`,
          name: nft?.parsedMetadata?.name || 'NFT',
          symbol: nft?.parsedMetadata?.symbol || 'NFT',
          balance: 1,
          decimals: 0,
          type: 'nft',
          logo: nft?.parsedMetadata?.imageUrl || null,
          category: nft.category,
          commitment: nft.commitment,
          capability: nft.capability,
          nft: nft
        })
      })

      return assets
    }
  },
  methods: {
    getDarkModeClass,
    isHongKong,
    async getRecipientAddress(walletType = 'bch') {
      // Get address from the current wallet instance instead of global store
      // to ensure we use the correct wallet in multi-wallet setup
      if (!this.wallet) return null
      
      const lastAddressIndex = this.$store.getters['global/getLastAddressIndex'](walletType)
      const wallet = walletType === 'slp' ? this.wallet.SLP : this.wallet.BCH
      
      try {
        const addressSet = await wallet.getAddressSetAt(lastAddressIndex)
        return addressSet.receiving
      } catch (error) {
        console.error('Error getting recipient address:', error)
        return null
      }
    },
    round(value, decimals=0) {
      decimals = Number.parseInt(decimals)
      if (!decimals) return value

      const multiplier = 10 ** decimals
      return Math.round(value / multiplier)
    },
    ellipsisText (value) {
      if (typeof value !== 'string') return ''
      if (value.length <= 20) return value
      return value.substr(0, 18) + '...' + value.substr(value.length - 10, value.length)
    },
    generateFallbackImage(nft=CashNonFungibleToken.parse()) {
      return this.$store.getters['global/getDefaultAssetLogo']?.(`${nft?.category}|${nft?.commitment}`)
    },
    getFallbackAssetLogo(asset) {
      const logoGenerator = this.$store.getters['global/getDefaultAssetLogo']
      if (asset.type === 'bch') {
        return logoGenerator('bch')
      } else if (asset.type === 'nft') {
        return logoGenerator(`${asset.category}|${asset.commitment}`)
      } else {
        return logoGenerator(`ct/${asset.category}`)
      }
    },
    getImageUrl(asset) {
      if (this.denomination === this.$t('DEEM') && asset.symbol === 'BCH') {
        return 'assets/img/theme/payhero/deem-logo.png'
      } else {
        if (asset.logo) {
          const convertedLogo = convertIpfsUrl(asset.logo)
          if (convertedLogo.startsWith('https://ipfs.paytaca.com/ipfs')) {
            return convertedLogo + '?pinataGatewayToken=' + process.env.PINATA_GATEWAY_TOKEN
          } else {
            return convertedLogo
          }
        } else {
          return this.getFallbackAssetLogo(asset)
        }
      }
    },
    formatAssetBalance(asset) {
      if (asset.type === 'bch') {
        // Format BCH balance - Watchtower API already returns balance in BCH, not satoshis
        const balance = asset.balance || 0
        const formatted = balance.toLocaleString('en-US', {
          maximumFractionDigits: 8,
          minimumFractionDigits: 0
        })
        return `${formatted} ${asset.symbol}`
      } else if (asset.type === 'nft') {
        // For NFTs, just show the name or symbol
        return asset.symbol || 'NFT'
      } else {
        // Format token balance with decimals
        const formatted = convertToTokenAmountWithDecimals(asset.balance, asset.decimals).toLocaleString(
          'en-US',
          { maximumFractionDigits: parseInt(asset.decimals) || 0 }
        )
        return `${formatted} ${asset.symbol}`
      }
    },
    getSweepButtonLabel() {
      if (this.selectedAssets.length === 0) {
        return this.$t('Sweep')
      } else if (this.selectedAssets.length === this.allAssets.length) {
        return this.$t('SweepAll')
      } else {
        return this.$t('Sweep')
      }
    },
    getAssetFiatValue(asset) {
      if (!asset || !asset.id) return ''
      
      // Access assetPrices to ensure reactivity
      const _ = this.assetPrices
      
      const currencySymbol = this.selectedCurrency?.symbol
      if (!currencySymbol) return ''
      
      const assetPrice = this.$store.getters['market/getAssetPrice'](asset.id, currencySymbol)
      if (!assetPrice || assetPrice === 0) return ''

      let balance = Number(asset.balance || 0)
      
      // Adjust for token decimals (balance is in smallest units)
      // For BCH, use balance directly (already in BCH units from Watchtower)
      // For tokens, divide by 10^decimals to get token units
      if (asset.id !== 'bch' && asset.decimals) {
        const decimals = parseInt(asset.decimals) || 0
        if (decimals > 0) {
          balance = balance / (10 ** decimals)
        }
      }
      
      const computedBalance = balance * Number(assetPrice)
      
      return parseFiatCurrency(computedBalance.toFixed(2), currencySymbol)
    },
    handleAssetClick(assetId) {
      if (this.sweeping || this.skippedTokens.includes(assetId)) {
        return
      }
      this.toggleAssetSelection(assetId)
    },
    toggleAssetSelection(assetId) {
      const index = this.selectedAssets.indexOf(assetId)
      if (index > -1) {
        this.selectedAssets.splice(index, 1)
      } else {
        this.selectedAssets.push(assetId)
      }
    },
    getAddressExplorerLink(address) {
      const isChipnet = this.$store.getters['global/isChipnet']
      if (isChipnet) {
        return `${process.env.TESTNET_EXPLORER_URL}/address/${address}`
      }
      return `https://explorer.paytaca.com/address/${address}`
    },
    copyToClipboard (value) {
      this.$copyText(value)
      this.$q.notify({
        message: this.$t('CopiedToClipboard'),
        timeout: 200,
        icon: 'mdi-clipboard-check',
        color: 'blue-9'
      })
    },
    validatePrivateKey (value) {
      return /^[5KL][1-9A-HJ-NP-Za-km-z]{50,51}$/.test(String(value))
    },

    async getTokens (signalFetch) {
      if (!this.validatePrivateKey(this.wif)) {
        this.error = this.$t('InvalidPrivateKey')
        return
      }

      // Prevent concurrent initial fetches (but allow refreshes)
      if (signalFetch && this.fetchingTokens) return
      if (signalFetch) this.fetchingTokens = true

      this.submitted = true
      if (signalFetch) this.fetching = true

      if (this.wif.length <= 0) {
        if (signalFetch) this.fetchingTokens = false
        return
      }
      
      // Only create new sweeper instance if WIF changed or doesn't exist
      if (!this.sweeper || !this.sweeper.wif || this.sweeper.wif !== this.wif) {
        this.sweeper = new SweepPrivateKey(this.wif)
      }

      // Subscribe once if needed, then fetch all data in parallel without redundant subscriptions
      if (signalFetch) {
        await this.sweeper.subscribe()
        // Give Watchtower a moment to index the address after subscription
        await new Promise(resolve => setTimeout(resolve, 1000))
      }

      await Promise.allSettled([
        this.sweeper.getNftCashTokens(false).then(results => {
          this.nonFungibleCashTokens = results || []
        }),
        this.sweeper.getFungibleCashTokens(false).then(results => {
          this.fungibleCashTokens = results || []
        }),
        this.sweeper.getBchBalance(false).then(resp => {
          this.bchBalance = resp?.spendable || 0
        }),
      ])

      // Fetch token prices for all fungible tokens
      const tokenPricePromises = this.fungibleCashTokens.map(token => {
        const assetId = `ct/${token.category}`
        return this.$store.dispatch('market/updateAssetPrices', { assetId })
          .catch(() => {
            // Silently handle price fetch errors
          })
      })
      await Promise.allSettled(tokenPricePromises)

      this.hasEnoughBalances = this.bchBalance > 0 || (await this.getWalletBchBalance) > 0

      // Show success screen if we successfully swept assets and the address is now empty
      if (this.hasSuccessfulSweeps && this.emptyAssets) {
        this.showSuccess = true
      }

      this.fetching = false
      this.sweeping = false
      if (signalFetch) this.fetchingTokens = false
    },

    async sweepCashTokenFungible(tokens, tokenAddress=null) {
      this.sweeping = true
      let hasSweepingError = false
      const isSingleSweep = tokenAddress === null

      if (!tokenAddress) {
        const bchAddress = await this.getRecipientAddress('bch')
        if (!bchAddress) {
          this.$q.notify({
            message: this.$t('FailedToGetAddress'),
            icon: 'mdi-close-circle',
            color: 'red-5'
          })
          this.sweeping = false
          return
        }
        tokenAddress = convertCashAddress(bchAddress, false, true)
      }

      for (const token of tokens) {
        this.selectedToken = `ct/${token?.category}`
        const fungiblePayload = {
          tokenAddress: this.sweeper.tokenAddress,
          bchWif: this.sweeper.wif,
          token: {
            tokenId: token?.category,
          },
          tokenAmount: token.balance,
          feeFunder: this.parseFeeFunder(),
          recipient: tokenAddress,
        }

        await this.sweeper.sweepCashToken(fungiblePayload).then(async result => {
          if (!result.success) {
            if (isSingleSweep) {
              this.$q.notify({
                message: result.error,
                icon: 'mdi-close-circle',
                color: 'red-5'
              })
            }
            hasSweepingError = true
          } else {
            // Mark that we had a successful sweep
            this.hasSuccessfulSweeps = true
            // Clear selected assets after successful sweep
            this.selectedAssets = []
          }
          await this.getTokens(false)
        })

        if (hasSweepingError) {
          fungiblePayload.feeFunder = this.parseFeeFunder(true)
          await this.sweeper.sweepCashToken(fungiblePayload).then(async result => {
            if (result.success) {
              hasSweepingError = false
              // Mark that we had a successful sweep
              this.hasSuccessfulSweeps = true
              // Clear selected assets after successful sweep
              this.selectedAssets = []
            } else {
              if (isSingleSweep) {
                this.$q.notify({
                  message: result.error,
                  icon: 'mdi-close-circle',
                  color: 'red-5'
                })
              }
              hasSweepingError = true
            }
            await this.getTokens(false)
          })
        }

        this.tokenIndex++
      }

      return hasSweepingError
    },
    async sweepCashTokenNonFungible(tokens, tokenAddress=null) {
      this.sweeping = true
      let hasSweepingError = false
      const isSingleSweep = tokenAddress === null

      if (!tokenAddress) {
        const bchAddress = await this.getRecipientAddress('bch')
        if (!bchAddress) {
          this.$q.notify({
            message: this.$t('FailedToGetAddress'),
            icon: 'mdi-close-circle',
            color: 'red-5'
          })
          this.sweeping = false
          return
        }
        tokenAddress = convertCashAddress(bchAddress, false, true)
      }

      for (const token of tokens) {
        this.selectedToken = `${token?.category}|${token?.commitment}`
        const nftPayload = {
          tokenAddress: this.sweeper.tokenAddress,
          bchWif: this.sweeper.wif,
          token: {
            tokenId: token?.category,
            capability: token?.capability,
            commitment: token?.commitment,
            txid: token?.currentTxid,
            vout: token?.currentIndex,
          },
          recipient: tokenAddress,
          feeFunder: this.parseFeeFunder(),
        }
  
        await this.sweeper.sweepCashToken(nftPayload).then(async result => {
          if (!result.success) {
            if (isSingleSweep) {
              this.$q.notify({
                message: result.error,
                icon: 'mdi-close-circle',
                color: 'red-5'
              })
            }
            hasSweepingError = true
          } else {
            // Mark that we had a successful sweep
            this.hasSuccessfulSweeps = true
            // Clear selected assets after successful sweep
            this.selectedAssets = []
          }
          await this.getTokens(false)
        })

        if (hasSweepingError) {
          nftPayload.feeFunder = this.parseFeeFunder(true)
          await this.sweeper.sweepCashToken(nftPayload).then(async result => {
            if (result.success) {
              hasSweepingError = false
              // Mark that we had a successful sweep
              this.hasSuccessfulSweeps = true
              // Clear selected assets after successful sweep
              this.selectedAssets = []
            } else {
              if (isSingleSweep) {
                this.$q.notify({
                  message: result.error,
                  icon: 'mdi-close-circle',
                  color: 'red-5'
                })
              }
              hasSweepingError = true
            }
            await this.getTokens(false)
          })
        }

        this.tokenIndex++
      }

      return hasSweepingError
    },
    async sweepBch (recipientAddress) {
      this.sweeping = true
      this.selectedToken = 'bch'
      let bchSweepError = false
      let errorMessage = ''

      // Refresh balance right before sweeping to ensure we have the latest data
      const freshBalance = await this.sweeper.getBchBalance(false)
      const currentBalance = freshBalance?.spendable || 0
      
      // Check if balance is sufficient (must be above dust)
      const DUST = 546 / 10 ** 8
      if (currentBalance < DUST) {
        this.$q.notify({
          message: this.$t('InsufficientBalance', {}, 'Insufficient balance to sweep'),
          icon: 'mdi-alert-circle',
          color: 'orange-5',
          timeout: 3000
        })
        await this.getTokens(false)
        this.sweeping = false
        return
      }

      // Give Watchtower a moment to ensure UTXOs are properly indexed
      await new Promise(resolve => setTimeout(resolve, 2000))

      await this.sweeper.sweepBch(
        this.sweeper.bchAddress,
        this.wif,
        currentBalance,
        undefined,
        recipientAddress
      ).then(async result => {
        if (!result.success) {
          bchSweepError = true
          errorMessage = result.error || 'Unknown error'
        } else {
          // Mark that we had a successful sweep
          this.hasSuccessfulSweeps = true
          // Clear selected assets after successful sweep
          this.selectedAssets = []
          // Wait for Watchtower to update before checking balance
          await new Promise(resolve => setTimeout(resolve, 3000))
        }
        await this.getTokens(false)
      }).catch(error => {
        console.error('BCH sweep error:', error)
        bchSweepError = true
        errorMessage = error.message || error.toString()
      })

      if (bchSweepError) {
        await this.sweeper.sweepBch(
          this.sweeper.bchAddress,
          this.wif,
          currentBalance,
          this.parseFeeFunder(true),
          recipientAddress
        ).then(async result => {
          if (!result.success) {
            this.$q.notify({
              message: result.error || errorMessage || this.$t('FailedToSweepBCH', {}, 'Failed to sweep BCH'),
              icon: 'mdi-close-circle',
              color: 'red-5',
              timeout: 5000
            })
          } else {
            // Mark that we had a successful sweep
            this.hasSuccessfulSweeps = true
            // Clear selected assets after successful sweep
            this.selectedAssets = []
            // Wait for Watchtower to update before checking balance
            await new Promise(resolve => setTimeout(resolve, 3000))
          }
          await this.getTokens(false)
        }).catch(error => {
          console.error('BCH sweep retry error:', error)
          this.$q.notify({
            message: error.message || error.toString(),
            icon: 'mdi-close-circle',
            color: 'red-5',
            timeout: 5000
          })
        })
      }
    },

    async sweepSelected() {
      if (this.selectedAssets.length === 0) return

      const bchAddress = await this.getRecipientAddress('bch')
      if (!bchAddress) {
        this.$q.notify({
          message: this.$t('FailedToGetAddress'),
          icon: 'mdi-close-circle',
          color: 'red-5'
        })
        return
      }
      const tokenAddress = convertCashAddress(bchAddress, false, true)

      // Separate selected assets by type
      const selectedBch = this.selectedAssets.includes('bch')
      const selectedFungible = this.fungibleCashTokens.filter(
        token => this.selectedAssets.includes(`ct/${token.category}`)
      )
      const selectedNfts = this.nonFungibleCashTokens.filter(
        nft => this.selectedAssets.includes(`${nft.category}|${nft.commitment}`)
      )

      this.tokenIndex = 0

      // Sweep fungible tokens
      if (selectedFungible.length > 0) {
        const fungibleError = await this.sweepCashTokenFungible(selectedFungible, tokenAddress)
        if (fungibleError) {
          this.$q.notify({
            message: this.$t('FailedToSweepSomeTokens'),
            icon: 'warning',
            color: 'warning'
          })
        }
        await new Promise(resolve => setTimeout(resolve, 1000))
      }

      // Sweep NFTs
      if (selectedNfts.length > 0) {
        const nonFungibleError = await this.sweepCashTokenNonFungible(selectedNfts, tokenAddress)
        if (nonFungibleError) {
          this.$q.notify({
            message: this.$t('FailedToSweepSomeTokens'),
            icon: 'warning',
            color: 'warning'
          })
        }
        await new Promise(resolve => setTimeout(resolve, 1000))
      }

      // Refresh tokens to get updated balances
      await this.getTokens(false)
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Sweep BCH last
      if (selectedBch && this.bchBalance > 0) {
        await this.sweepBch(bchAddress)
        await new Promise(resolve => setTimeout(resolve, 1000))
      }

      // Refresh multiple times to ensure balances are updated
      let retries = 0
      while (retries < 3) {
        await this.getTokens(false)
        retries++
      }

      // Clear selections after successful sweep
      this.selectedAssets = []
    },
    async sweepAll() {
      // Select all assets and sweep them
      this.selectedAssets = this.allAssets.map(asset => asset.id)
      await this.sweepSelected()
    },

    onScannerDecode (content) {
      this.showQrScanner = false
      this.wif = content
    },
    decryptEncryptedWallet () {
      this.isDecrypting = true
      this.submitted = true
      setTimeout(() => {
        try {
          const decryptedKey = bip38.decrypt(this.bip38String, this.passPhrase)
          const wifKey = wifPackage.encode({
            version: 0x80,
            privateKey: decryptedKey.privateKey,
            compressed: decryptedKey.compressed
          })
          this.isDecrypting = false
          this.wif = wifKey
          this.getTokens(true)
        } catch {
          this.isDecrypting = false
          this.submitted = false
          this.wif = ''
          this.$q.notify({
            type: 'negative',
            color: 'red-4',
            timeout: 3000,
            message: this.$t('BIP38DecryptError')
          })
        }
      }, 1000);
    },
    parseFeeFunder(isForceWallet=false) {
      const fee = (546 / (10 ** 8)) * (this.tokenIndex + 1)

      if (this.bchBalance < fee || isForceWallet) {
        return {
          walletHash: this.wallet.BCH.walletHash,
          mnemonic: this.wallet.mnemonic,
          derivationPath: this.wallet.BCH.derivationPath
        }
      }

      return undefined
    }
  },
  async mounted () {
    const mnemonic = await getMnemonic(this.$store.getters['global/getWalletIndex'])
    this.wallet = markRaw(new Wallet(mnemonic))

    if (this.w) {
      this.wif =  extractWifFromUrl(this.w) || this.w
      await this.getTokens(true)
    }
  }
}
</script>

<style lang="scss" scoped>
  #app {
    padding: 25px;
    z-index: 1 !important;
  }

  .sweep-input {
    width: 100%;
    font-size: 1.125rem;
    color: var(--q-primary);
    background: white;
    padding: 16px;
    border-radius: 12px;
    border: 1px solid rgba(0, 0, 0, 0.1);
    transition: all 0.3s ease;
    resize: none;

    &:focus {
      outline: none;
      border-color: var(--q-primary);
      box-shadow: 0 0 0 2px rgba(var(--q-primary), 0.1);
    }

    &::placeholder {
      color: rgba(0, 0, 0, 0.4);
    }
  }

  .or-label {
    margin: 24px 0;
    font-size: 0.875rem;
    font-weight: 500;
    color: rgba(0, 0, 0, 0.6);
    letter-spacing: 0.05em;
  }

  .asset-list {
    margin-top: 8px;
  }

  .asset-card {
    transition: all 0.2s ease;
    border: 1px solid rgba(0, 0, 0, 0.1);
    
    &:hover {
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    &.sweeping {
      opacity: 0.7;
      pointer-events: none;
    }
  }

  .no-hover-effect {
    &:hover {
      background: none !important;
    }
    
    &::before {
      display: none !important;
    }
  }

  .custom-circular-checkbox {
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.3s ease;
    padding: 4px;
    border-radius: 50%;
    
    .q-icon {
      transition: all 0.2s ease;
      color: rgba(0, 0, 0, 0.3);
    }

    &.selected .q-icon {
      color: var(--q-primary);
      animation: checkScale 0.3s ease;
    }

    &:not(.disabled):hover {
      background-color: rgba(0, 0, 0, 0.05);
      
      .q-icon {
        color: var(--q-primary);
        opacity: 0.8;
      }
    }

    &.disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  }

  @keyframes checkScale {
    0% {
      transform: scale(0.8);
    }
    50% {
      transform: scale(1.1);
    }
    100% {
      transform: scale(1);
    }
  }

  .address-section {
    .address-card {
      background: rgba(0, 0, 0, 0.02);
      border: 1px solid rgba(0, 0, 0, 0.08);
      transition: all 0.3s ease;

      &:hover {
        background: rgba(0, 0, 0, 0.03);
      }
    }

    .copy-icon {
      opacity: 0.6;
      cursor: pointer;
      transition: opacity 0.2s ease;
      vertical-align: middle;

      &:hover {
        opacity: 1;
      }
    }

    .explorer-link {
      display: inline-flex;
      align-items: center;
      transition: opacity 0.2s ease;

      &:hover {
        opacity: 0.8;
      }
    }
  }

  .sweep-action-button {
    min-height: 48px;
    font-weight: 600;
    font-size: 16px;
    letter-spacing: 0.5px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

    &:not(.q-btn--disabled):hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
    }

    &:not(.q-btn--disabled):active {
      transform: translateY(0);
    }

    &.q-btn--disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    :deep(.q-badge) {
      font-weight: 600;
      padding: 4px 8px;
      min-width: 24px;
    }
  }

  .toggle-expand {
    transition: transform 0.3s ease-in-out;
    opacity: 0.7;

    &:hover {
      opacity: 1;
    }
  }

  .toggle-expand.flipped {
    transform: rotate(180deg);
  }

  .wide-margin-top {
    margin-top: 85px;
  }

  .passphrase-input {
    font-size: 1rem;
    border-radius: 12px;

    :deep(.q-field__control) {
      border-radius: 12px;
    }
  }

  .q-select {
    border-radius: 12px;
    
    :deep(.q-field__control) {
      border-radius: 12px;
    }
  }

  .button {
    border-radius: 8px;
    font-weight: 500;
    letter-spacing: 0.025em;
    padding: 8px 24px;
    min-height: 40px;
  }

  // Dark mode adjustments
  :deep(.dark) {
    .sweep-input {
      background: rgba(255, 255, 255, 0.05);
      border-color: rgba(255, 255, 255, 0.1);

      &::placeholder {
        color: rgba(255, 255, 255, 0.4);
      }
    }

    .or-label {
      color: rgba(255, 255, 255, 0.6);
    }

    .asset-card {
      background: rgba(255, 255, 255, 0.05);
      border-color: rgba(255, 255, 255, 0.1);
    }

    .text-red {
      color: #ef5350;
    }

    .address-section {
      .address-card {
        background: rgba(255, 255, 255, 0.05);
        border-color: rgba(255, 255, 255, 0.1);

        &:hover {
          background: rgba(255, 255, 255, 0.07);
        }
      }
    }

    .custom-circular-checkbox {
      .q-icon {
        color: rgba(255, 255, 255, 0.4);
      }

      &.selected .q-icon {
        color: var(--q-primary);
      }

      &:not(.disabled):hover {
        background-color: rgba(255, 255, 255, 0.1);
        
        .q-icon {
          color: var(--q-primary);
        }
      }
    }
  }
</style>

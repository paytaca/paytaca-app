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
          <div class="text-body1">{{ $t('SweepSuccessMessage', {}, 'Assets claimed successfully') }}</div>
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
            <div class="q-mb-sm">
              <div class="text-subtitle1 text-weight-medium">BCH</div>
              <div>
                {{ ellipsisText(sweeper.bchAddress) }}
                <q-icon name="mdi-content-copy" @click="copyToClipboard(sweeper.bchAddress)" />
              </div>
            </div>

            <div class="bch-balance">
              <p>{{ $t('BchBalance') }}: {{ bchBalance }}</p>
              <q-btn
                v-if="!sweeping"
                color="primary"
                :disabled="!hasEnoughBalances"
                :label="(cashTokensCount - skippedTokens.length) > 0 ? $t('SweepAll') : $t('Sweep')"
                @click.prevent="sweepAll"
              />
              <div v-if="sweeping">
                <progress-loader />
              </div>
              <span v-else class="row q-mt-xs text-red">
                <template v-if="cashTokensCount === 0 && bchBalance === 0">{{ $t('SweepErrMsg1') }}</template>
                <i v-else-if="!hasEnoughBalances">{{ $t('EmptyBalancesError', {}, 'Both the address and your wallet have insufficient BCH balance to be able to sweep the token(s) below') }}</i>
                <i v-else-if="bchBalance === 0">{{ $t('UseWalletBalance', {}, 'Balance from your wallet will be used to sweep the token(s) below') }}</i>
              </span>
            </div>
          </div>

          <div v-if="fungibleCashTokens?.length || nonFungibleCashTokens?.length" class="q-mt-md">
            <div class="row items-center q-mb-sm relative-position">
              <div class="q-space">
                <div class="text-subtitle1 text-weight-medium">
                    {{ $t('CashTokens') }} ({{ cashTokensCount }})
                </div>
                <div>
                  {{ ellipsisText(sweeper.tokenAddress) }}
                  <q-icon name="mdi-content-copy" @click.stop="copyToClipboard(sweeper.tokenAddress)" />
                </div>
              </div>
            </div>

            <div class="row justify-center q-my-sm">
              <q-btn
                outline
                color="primary"
                :label="$t('ManualCashTokensSweep')"
                :disabled="!hasEnoughBalances"
                @click.prevent="expandCashTokens = !expandCashTokens"
              />
            </div>

            <q-slide-transition>
              <div v-if="expandCashTokens">
                <span class="row justify-center text-subtitle1 q-mb-sm">
                  {{ isHongKong(currentCountry) ? $t('SelectPointsToSweep') : $t('SelectTokensToSweep') }}
                </span>

                <div v-for="(fungibleToken, index) in fungibleCashTokens" :key="index" class="token-details">
                  <div class="row items-center justify-between">
                    <span class="text-subtitle1 text-weight-bold">
                      {{ fungibleToken?.parsedMetadata?.name }}
                    </span>
                    <img
                      v-if="fungibleToken?.parsedMetadata?.fungible && fungibleToken?.parsedMetadata?.imageUrl"
                      :src="fungibleToken?.parsedMetadata?.imageUrl"
                      height="35px"
                      alt="CT"
                    />
                  </div>
                  <p>
                    {{ $t('Category') }}:
                    {{ ellipsisText(fungibleToken?.category) }}
                    <q-icon name="mdi-content-copy" @click="copyToClipboard(fungibleToken?.category)" />
                  </p>
                  <p>{{ $t('Symbol') }}: {{ fungibleToken?.parsedMetadata?.symbol }}</p>
                  <p>{{ $t('Amount') }}: {{ round(fungibleToken?.balance, fungibleToken?.parsedMetadata?.decimals) }}</p>

                  <div v-if="selectedToken !== fungibleToken.category">
                    <q-btn
                      color="primary"
                      :label="$t('Sweep')"
                      @click.prevent="sweepCashTokenFungible([fungibleToken])"
                      :disabled="sweeping || skippedTokens.includes(fungibleToken.category)"
                    />
                    <span class="text-uppercase q-ml-md q-mr-sm">{{ $t('or') }}</span>
                    <q-checkbox
                      :label="$t('Skip')"
                      v-model="skippedTokens"
                      v-bind:val="fungibleToken.category"
                    />
                  </div>
                  <div v-if="sweeping && selectedToken === fungibleToken.category">
                    <progress-loader />
                  </div>
                </div>

                <div v-for="(nft, index) in nonFungibleCashTokens" :key="index" class="token-details">
                  <p class="text-subtitle1 text-weight-bold">{{ nft?.parsedMetadata?.name }}</p>
                  <p>
                    {{ $t('Category') }}:
                    {{ ellipsisText(nft?.category) }}
                    <q-icon name="mdi-content-copy" @click="copyToClipboard(nft?.category)" />
                  </p>
                  <p v-if="nft?.capability">
                    NFT ({{ nft?.capability}}):
                    {{ ellipsisText(nft?.commitment) }}
                    <q-icon name="mdi-content-copy" @click="copyToClipboard(nft?.commitment)" />
                  </p>
                  <div class="q-mb-sm">
                    <img
                      :src="nft?.parsedMetadata?.imageUrl || generateFallbackImage(nft)"
                      style="width: min(100%, 200px);"
                      class="rounded-borders"
                      alt="NFT"
                    />
                  </div>

                  <div v-if="selectedToken !== nft.category">
                    <q-btn
                      color="primary"
                      :label="$t('Sweep')"
                      @click.prevent="sweepCashTokenNonFungible([nft])"
                      :disabled="sweeping || skippedTokens.includes(`${nft.category}|${nft.commitment}`)"
                    />
                    <span class="text-uppercase q-ml-md q-mr-sm">{{ $t('or') }}</span>
                    <q-checkbox
                      :label="$t('Skip')"
                      v-model="skippedTokens"
                      v-bind:val="`${nft.category}|${nft.commitment}`"
                    />
                  </div>
                </div>
              </div>
            </q-slide-transition>
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
import { convertCashAddress } from 'src/wallet/chipnet'
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
      bchBalance: null,
      sweeper: [].map(() => new SweepPrivateKey())[0],
      submitted: false,
      fetching: false,
      sweeping: false,
      selectedToken: null,
      expandCashTokens: false,
      showSuccess: false,
      showQrScanner: false,
      error: null,
      passPhrase: '',
      isDecrypting: false,
      hasEnoughBalances: true,

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
      return await this.wallet.BCH.getBalance().then(resp => resp.balance)
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

      this.submitted = true
      if (signalFetch) this.fetching = true

      if (this.wif.length <= 0) return
      this.sweeper = new SweepPrivateKey(this.wif)

      await Promise.allSettled([
        this.sweeper.getNftCashTokens(signalFetch).then(results => {
          this.nonFungibleCashTokens = results
        }),
        this.sweeper.getFungibleCashTokens(signalFetch).then(results => {
          this.fungibleCashTokens = results
        }),
        this.sweeper.getBchBalance().then(resp => {
          this.bchBalance = resp.spendable || 0
        }),
      ])

      this.hasEnoughBalances = this.bchBalance > 0 || (await this.getWalletBchBalance) > 0
      this.fetching = false
      this.sweeping = false
    },

    async sweepCashTokenFungible(tokens, tokenIndex=0, tokenAddress=null) {
      this.sweeping = true
      let hasSweepingError = false

      if (!tokenAddress) {
        const bchAddress = await this.getRecipientAddress('bch')
        if (!bchAddress) {
          this.$q.notify({
            message: this.$t('FailedToGetAddress', {}, 'Failed to get recipient address'),
            icon: 'mdi-close-circle',
            color: 'red-5'
          })
          return
        }
        tokenAddress = convertCashAddress(bchAddress, false, true)
      }

      for (const token of tokens) {
        this.selectedToken = token?.category

        await this.sweeper.sweepCashToken({
          tokenAddress: this.sweeper.tokenAddress,
          bchWif: this.sweeper.wif,
          token: {
            tokenId: token?.category,
          },
          tokenAmount: token.balance,
          feeFunder: this.parseFeeFunder(tokenIndex),
          recipient: tokenAddress,
        }).then(result => {
          if (!result.success) hasSweepingError = true
          this.getTokens(false).then(() => {
            if (this.emptyAssets) this.showSuccess = true
          })
        })

        tokenIndex++
      }

      return hasSweepingError
    },
    async sweepCashTokenNonFungible(tokens, tokenIndex=0, tokenAddress=null) {
      let hasSweepingError = false

      if (!tokenAddress) {
        const bchAddress = await this.getRecipientAddress('bch')
        if (!bchAddress) {
          this.$q.notify({
            message: this.$t('FailedToGetAddress', {}, 'Failed to get recipient address'),
            icon: 'mdi-close-circle',
            color: 'red-5'
          })
          return
        }
        tokenAddress = convertCashAddress(bchAddress, false, true)
      }

      for (const token of tokens) {
        this.selectedToken = token?.category
  
        await this.sweeper.sweepCashToken({
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
          feeFunder: this.parseFeeFunder(tokenIndex),
        }).then(result => {
          if (!result.success) hasSweepingError = true
          this.getTokens(false).then(() => {
            if (this.emptyAssets) this.showSuccess = true
          })
        })
        tokenIndex++
      }

      return hasSweepingError
    },
    async sweepBch (recipientAddress) {
      this.sweeping = true
      this.selectedToken = 'bch'

      await Promise.all([
        this.sweeper.sweepBch(
          this.sweeper.bchAddress,
          this.wif,
          this.bchBalance,
          recipientAddress
        ),
        this.getTokens(false).then(() => {
          if (this.emptyAssets) this.showSuccess = true
        })
      ])
    },

    async sweepAll() {
      const bchAddress = await this.getRecipientAddress('bch')
      if (!bchAddress) {
        this.$q.notify({
          message: this.$t('FailedToGetAddress', {}, 'Failed to get recipient address'),
          icon: 'mdi-close-circle',
          color: 'red-5'
        })
        return
      }
      const tokenAddress = convertCashAddress(bchAddress, false, true)

      if ((this.cashTokensCount - this.skippedTokens.length) > 0) {
        const unskippedCashTokens = this.fungibleCashTokens.filter(
          token => !this.skippedTokens.includes(token.category)
        )
        const unskippedNonFungibleCashTokens = this.nonFungibleCashTokens.filter(
          token => !this.skippedTokens.includes(`${token.category}|${token.commitment}`)
        )
        let tokenIndex = 0

        const fungibleError = await this.sweepCashTokenFungible(
          unskippedCashTokens, tokenIndex, tokenAddress
        )
        const nonFungibleError = await this.sweepCashTokenNonFungible(
          unskippedNonFungibleCashTokens, tokenIndex, tokenAddress
        )

        if (fungibleError || nonFungibleError) {
          this.$q.notify({
            message: this.$t('FailedToSweepSomeTokens', {}, 'Failed to sweep some tokens'),
            icon: 'warning',
            color: 'warning'
          })
        }
      }
      if (this.bchBalance > 0) await this.sweepBch(bchAddress)

      await this.getTokens(false).then(() => {
        if (this.emptyAssets) this.showSuccess = true
      })
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
    parseFeeFunder(tokenIndex) {
      const fee = (546 / (10 ** 8)) * (tokenIndex + 1)
      console.log(tokenIndex + 1, this.bchBalance > fee)
      if (this.bchBalance > fee) return undefined
      return {
        walletHash: this.wallet.BCH.walletHash,
        mnemonic: this.wallet.mnemonic,
        derivationPath: this.wallet.BCH.derivationPath
      }
    }
  },
  mounted () {
    getMnemonic(this.$store.getters['global/getWalletIndex']).then((mnemonic) => {
      this.wallet = markRaw(new Wallet(mnemonic))
    })

    if (this.w) {
      this.wif =  extractWifFromUrl(this.w) || this.w
      this.getTokens(true)
    }
  }
}
</script>

<style lang="scss" scoped>
  #app {
    padding: 25px;
    overflow-y: auto;
    z-index: 1 !important;
    min-height: 100vh;
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

  .bch-balance {
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: 12px;
    padding: 16px;
    background: white;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    margin-bottom: 16px;

    p {
      margin: 0 0 12px;
      font-size: 1rem;
      color: rgba(0, 0, 0, 0.87);
    }

    .text-red {
      color: #d32f2f;
      font-size: 0.875rem;
      font-style: italic;
    }
  }

  .token-details {
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: 12px;
    padding: 16px;
    margin-bottom: 16px;
    background: white;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    transition: all 0.3s ease;

    &:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    p {
      margin: 0 0 8px;
      font-size: 0.9375rem;
      color: rgba(0, 0, 0, 0.87);
      display: flex;
      align-items: center;
      gap: 8px;

      .q-icon {
        font-size: 1.25rem;
        opacity: 0.7;
        cursor: pointer;
        transition: opacity 0.2s ease;

        &:hover {
          opacity: 1;
        }
      }
    }

    img {
      border-radius: 8px;
      margin: 8px 0;
    }

    .q-btn {
      margin-right: 12px;
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

    .bch-balance,
    .token-details {
      background: rgba(255, 255, 255, 0.05);
      border-color: rgba(255, 255, 255, 0.1);

      p {
        color: rgba(255, 255, 255, 0.87);
      }
    }

    .text-red {
      color: #ef5350;
    }
  }
</style>

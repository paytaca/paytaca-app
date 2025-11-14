<template>
  <div class="static-container">
    <QrScanner
      v-model="showQrScanner"
      @decode="onScannerDecode"
    />
    <div id="app-container" class="sticky-header-container" :class="getDarkModeClass(darkMode)">
      <header-nav :title="$t('Sweep')" backnavpath="/apps" />
      <div
        id="app"
        ref="app"
        class="text-bow"
        :class="getDarkModeClass(darkMode)"
        :style="{ 'padding-top': $q.platform.is.ios ? '30px' : '0px'}"
      >
        <div class="text-center text-h6" v-if="fetching && tokens.length === 0" style="margin-top: 25px;">
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
              v-if="tokens.length === 0"
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
                v-if="tokens.length === 0 && wif"
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
          v-else
          :class="totalTokensCount <= 0 ? 'wide-margin-top' : ''"
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
              <template v-if="bchBalance > 0">
                <q-btn
                  v-if="selectedToken !== 'bch'"
                  @click.prevent="sweepBch"
                  :label="$t('Sweep')"
                  class="button"
                  :class="getDarkModeClass(darkMode)"
                  :disabled="(totalTokensCount - skippedTokens.length) > 0"
                />
                <span v-if="(totalTokensCount - skippedTokens.length) > 0" class="text-red" style="margin-left: 10px;">
                  <i>{{ $t(isHongKong(currentCountry) ? 'SweepThePointsFirst' : 'SweepTheTokensFirst') }}</i>
                </span>
                <div v-if="sweeping && selectedToken === 'bch'">
                  <progress-loader />
                </div>
              </template>
              <span v-else class="text-red">
                <template v-if="totalTokensCount == 0">{{ $t('SweepErrMsg1') }}</template>
                <i v-else>{{ $t('SweepErrMsg2') }}</i>
              </span>
            </div>
          </div>
          <div v-if="totalTokensCount > 0" class="q-my-md">
            <q-select
              filled
              v-model="payFeeFrom"
              :options="feeOptions"
              behavior="menu"
              :label="$t('PayTransactionFeeFrom')"
            />
          </div>
          <div v-if="fungibleCashTokens?.length || nonFungibleCashTokens?.length" class="q-mt-md">
            <div class="row items-center q-mb-sm relative-position" v-ripple @click="() => expandCashTokens = !expandCashTokens">
              <div class="q-space">
                <div class="text-subtitle1 text-weight-medium">
                  {{ $t('CashTokens') }} ({{ cashTokensCount }})
                </div>
                <div>
                  {{ ellipsisText(sweeper.tokenAddress) }}
                  <q-icon name="mdi-content-copy" @click.stop="copyToClipboard(sweeper.tokenAddress)" />
                </div>
              </div>
              <q-icon
                size="1.75rem"
                name="expand_less"
                :class="['toggle-expand', expandCashTokens ? '' : 'flipped']"
              />
            </div>
            <q-slide-transition>
              <div v-if="expandCashTokens">
                <div v-for="(fungibleToken, index) in fungibleCashTokens" :key="index" class="token-details">
                  <img
                    v-if="fungibleToken?.parsedMetadata?.fungible && fungibleToken?.parsedMetadata?.imageUrl"
                    :src="fungibleToken?.parsedMetadata?.imageUrl"
                    height="35px"
                    class="float-right"
                  />
                  <p>{{ fungibleToken?.parsedMetadata?.name }}</p>
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
                      @click.prevent="sweepCashTokenFungible(fungibleToken)"
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
                  <p>{{ nft?.parsedMetadata?.name }}</p>
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
                    />
                  </div>

                  <div v-if="selectedToken !== nft.category">
                    <q-btn
                      color="primary"
                      :label="$t('Sweep')"
                      @click.prevent="sweepCashTokenNonFungible(nft)"
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
          <div v-if="tokens.length > 0" class="q-mt-md">
            <div class="row items-center q-mb-sm relative-position" v-ripple @click="() => expandSlpTokens = !expandSlpTokens">
              <div class="q-space">
                <div class="text-subtitle1 text-weight-medium">
                  {{ $t(isHongKong(currentCountry) ? 'Points' : 'Tokens') }} ({{ tokens.length }})
                </div>
                <div>
                  {{ ellipsisText(sweeper.slpAddress) }}
                  <q-icon name="mdi-content-copy" @click.stop="copyToClipboard(sweeper.slpAddress)" />
                </div>
              </div>
              <q-icon
                size="1.75rem"
                name="expand_less"
                :class="['toggle-expand', expandSlpTokens ? '' : 'flipped']"
              />
            </div>
            <q-slide-transition>
              <div v-if="expandSlpTokens">
                <div v-for="(token, index) in tokens" :key="index" class="token-details">
                  <p>
                    {{ $t(isHongKong(currentCountry) ? 'PointId' : 'TokenId') }}: {{ ellipsisText(token.token_id) }}
                    <q-icon name="mdi-content-copy" @click="copyToClipboard(token.token_id)" />
                  </p>
                  <p>{{ $t('Symbol') }}: {{ token.symbol }}</p>
                  <img v-if="token.image_url.length > 0" :src="token.image_url" height="50" alt="" />
                  <p>{{ $t('Amount') }}: {{ token.spendable }}</p>
                  <template v-if="selectedToken !== token.token_id">
                    <q-btn color="primary" @click.prevent="sweepToken(token)" :disabled="sweeping || skippedTokens.includes(token.token_id)">
                      {{ $t('Sweep') }}
                    </q-btn>
                    <span class="text-uppercase q-ml-md q-mr-sm">{{ $t('or') }}</span>
                    <q-checkbox v-model="skippedTokens" v-bind:val="token.token_id" :label="$t('Skip')" />
                  </template>
                  <div v-if="sweeping && selectedToken === token.token_id">
                    <progress-loader />
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
      tokens: [].map(() => {
        return {
          token_id: '',
          symbol: '',
          image_url: '',
          spendable: 0,
          // also some other fields
        }
      }),
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
      expandCashTokens: true,
      expandSlpTokens: true,
      showSuccess: false,
      showQrScanner: false,
      error: null,
      passPhrase: '',
      isDecrypting: false,

      sweepTxidMap: {
        'bch': '',
        /** 'token-id-and-commitment': '', */
      },
      feeOptions: [
        { label: this.$t('Wallet'), value: 'wallet' },
        { label: this.$t('Address'), value: 'address' }
      ],
      payFeeFrom: { label: this.$t('Wallet'), value: 'wallet' }
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
    }
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
      const ctFts = parseInt(this.fungibleCashTokens?.length) || 0
      const ctNfts = parseInt(this.nonFungibleCashTokens?.length) || 0
      return ctFts + ctNfts
    },
    totalTokensCount() {
      const slpTokens = parseInt(this.tokens?.length) || 0
      return slpTokens + this.cashTokensCount
    },
    emptyAssets() {
      const DUST = 546 / 10 ** 8
      return this.bchBalance < DUST && this.totalTokensCount == 0
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
      decimals = parseInt(decimals)
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
    getFeeFunder () {
      let funder
      if (this.payFeeFrom.value === 'address') {
        funder = {
          address: this.sweeper.bchAddress,
          wif: this.wif
        }
      } else if (this.payFeeFrom.value === 'wallet') {
        funder = {
          walletHash: this.wallet.BCH.walletHash,
          mnemonic: this.wallet.mnemonic,
          derivationPath: this.wallet.BCH.derivationPath
        }
      }
      return funder
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
        this.sweeper.getNftCashTokens().then(results => {
          this.nonFungibleCashTokens = results
        }),
        this.sweeper.getFungibleCashTokens().then(results => {
          this.fungibleCashTokens = results
        }),
        this.sweeper.getTokensList().then((tokens) => {
          this.tokens = tokens.filter(token => token.spendable)
        }),
      ])

      const resp = await this.sweeper.getBchBalance()
      this.bchBalance = resp.spendable || 0
      this.fetching = false
      this.sweeping = false
    },
    async sweepToken (token) {
      const vm = this
      vm.sweeping = true
      vm.selectedToken = token.token_id
      
      const recipientAddress = await vm.getRecipientAddress('slp')
      if (!recipientAddress) {
        vm.$q.notify({
          message: vm.$t('FailedToGetAddress', {}, 'Failed to get recipient address'),
          icon: 'mdi-close-circle',
          color: 'red-5'
        })
        vm.sweeping = false
        vm.selectedToken = null
        return
      }
      
      vm.sweeper.sweepToken(
        token.address,
        vm.wif,
        token.token_id,
        token.spendable,
        vm.getFeeFunder(),
        recipientAddress
      ).then(function (result) {
        if (!result.success) {
          vm.$q.notify({
            message: result.error,
            icon: 'mdi-close-circle',
            color: 'red-5'
          })
          vm.selectedToken = null
        }
        vm.getTokens()
      })
    },
    async sweepCashTokenFungible(token) {
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
      this.sweeping = true
      this.selectedToken = token?.category
      return this.sweeper.sweepCashToken({
        tokenAddress: this.sweeper.tokenAddress,
        bchWif: this.sweeper.wif,
        token: {
          tokenId: token?.category,
        },
        tokenAmount: token.balance,
        feeFunder: this.getFeeFunder(),
        recipient: tokenAddress,
      }).then(result => {
        if (!result.success) {
          this.$q.notify({
            message: result.error,
            icon: 'mdi-close-circle',
            color: 'red-5'
          })
          this.selectedToken = null
        }
        this.getTokens()
          .then(() => {
            if (this.emptyAssets) this.showSuccess = true
          })
      })
    },
    async sweepCashTokenNonFungible(token=CashNonFungibleToken.parse()) {
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
      this.sweeping = true
      this.selectedToken = token?.category

      return this.sweeper.sweepCashToken({
        tokenAddress: this.sweeper.tokenAddress,
        bchWif: this.sweeper.wif,
        token: {
          tokenId: token?.category,
          capability: token?.capability,
          commitment: token?.commitment,
          txid: token?.currentTxid,
          vout: token?.currentIndex,
        },
        feeFunder: this.getFeeFunder(),
        recipient: tokenAddress,
      }).then(result => {
        if (!result.success) {
          this.$q.notify({
            message: result.error,
            icon: 'mdi-close-circle',
            color: 'red-5'
          })
          this.selectedToken = null
        }
        this.getTokens()
          .then(() => {
            if (this.emptyAssets) this.showSuccess = true
          })
      })
    },
    async sweepBch () {
      const recipientAddress = await this.getRecipientAddress('bch')
      if (!recipientAddress) {
        this.$q.notify({
          message: this.$t('FailedToGetAddress', {}, 'Failed to get recipient address'),
          icon: 'mdi-close-circle',
          color: 'red-5'
        })
        return
      }
      
      this.sweeping = true
      this.selectedToken = 'bch'
      this.sweeper.sweepBch(
        this.sweeper.bchAddress,
        this.wif,
        this.bchBalance,
        recipientAddress
      )
      this.getTokens(false)
          .then(() => {
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
  },
  mounted () {
    const vm = this
    // const divHeight = screen.availHeight - 120
    // vm.$refs.app.setAttribute('style', 'height:' + divHeight + 'px;')

    getMnemonic(vm.$store.getters['global/getWalletIndex']).then(function (mnemonic) {
      vm.wallet = markRaw(new Wallet(mnemonic))
    })

    if (vm.w) {
      vm.wif =  extractWifFromUrl(vm.w) || vm.w
      vm.getTokens(true)
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

  .text-subtitle1 {
    font-size: 1.125rem;
    font-weight: 500;
    color: rgba(0, 0, 0, 0.87);
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
      color: white;
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

    .text-subtitle1 {
      color: rgba(255, 255, 255, 0.87);
    }

    .text-red {
      color: #ef5350;
    }
  }
</style>

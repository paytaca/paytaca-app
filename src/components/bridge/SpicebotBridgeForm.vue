<template>
  <div>
    <div
      v-if="Array.isArray(errors) && errors.length"
      class="q-my-sm q-pa-sm rounded-borders bg-red-2 text-red"
    >
      <ul class="q-my-sm q-pl-lg">
        <li class="pt-label" :class="getDarkModeClass(darkMode)" v-for="(error, index) in errors" :key="index">
          {{ error }}
        </li>
      </ul>
    </div>
    <q-form v-if="!stagedSwapInfo.show" @submit="stageFormData()">
      <q-card class="q-mt-sm br-15 pt-card text-bow" :class="getDarkModeClass(darkMode)">
        <q-card-section class="row items-center justify-center">
          <div v-ripple class="text-center q-pa-sm q-mx-md cursor-pointer relative-position" @click="selectToken()">
            <template v-if="formData.token">
              <img
                height="40"
                :src="formData.token.image_url"
                alt=""
              />
              <div class="text-subtitle1 text-center pt-label" :class="getDarkModeClass(darkMode)">
                {{ formData.token && formData.token.name || 'Token Name' }}
              </div>
              <div class="text-subtitle1 text-center pt-label" :class="getDarkModeClass(darkMode)">
                SLP
                <q-icon name="arrow_right"/>
                SEP20
              </div>
            </template>
            <div v-else v-ripple class="text-center text-subtitle1 cursor-pointer relative-position q-pa-md">
              {{ $t(isHongKong(currentCountry) ? 'SelectPoint' : 'SelectToken') }}
            </div>
          </div>
        </q-card-section>
        <q-card-section>
          <div class="row no-wrap items-start">
            <div class="row items-center no-wrap q-my-sm custom-width">
              <!-- <img height="40" :src="formData.token.image_url"/> -->
              <div class="q-ml-sm">
                <div
                  :class="getDarkModeClass(darkMode)"
                  class="text-caption pt-label"
                  style="margin-bottom:-6px"
                >
                  {{ $t('YouSend') }}:
                </div>
                <div class="pt-label" :class="getDarkModeClass(darkMode)">
                  {{ formData.token && formData.token.name }}
                </div>
              </div>
            </div>
            <q-input
              dense
              outlined
              :disable="lockInputs"
              v-model.number="formData.amount"
              placeholder="0.0"
              class="q-space q-my-sm"
              :rules="[
                val => Number(val) > 0.01 || 'Must be greater than 0.01',
                val => !computedFormData.maxAllowed || Number(val) <= computedFormData.maxAllowed || 'Not enough liquidity',
                val => !computedFormData.selectedTokenBalance || computedFormData.selectedTokenBalance >= val || 'Insufficient balance',
              ]"
              reactive-rules
              bottom-slots
              :input-class="darkMode ? 'text-white' : 'text-black'"
            >
              <template v-slot:hint>
                <div
                  v-if="computedFormData.selectedTokenBalance !== null"
                  class="text-caption ellipsis text-right text-bow"
                  :class="getDarkModeClass(darkMode)"
                  @click="formData.amount = computedFormData.selectedTokenBalance"
                >
                  {{ $t('Balance') }}: {{ computedFormData.selectedTokenBalance }}
                </div>
              </template>
            </q-input>
          </div>
          <div class="row no-wrap items-start">
            <div class="row items-center no-wrap q-my-sm custom-width">
              <!-- <img height="40" :src="formData.token.image_url"/> -->
              <div class="q-ml-sm">
                <div
                  class="text-caption pt-label"
                  :class="getDarkModeClass(darkMode)"
                  style="margin-bottom:-6px"
                >
                  {{ $t('YouReceive') }}:
                </div>
                <div class="pt-label" :class="getDarkModeClass(darkMode)">
                  {{ formData.token && formData.token.name }}
                </div>
              </div>
            </div>
            <q-input
              dense
              outlined
              disable
              :modelValue="computedFormData.expectedAmount"
              placeholder="0.0"
              class="q-space q-my-sm"
              bottom-slots
              :input-class="darkMode ? 'text-white' : 'text-black'"
            />
          </div>
          <div class="row no-wrap items-start" style="margin-top: -10px;">
            <div class="row items-center no-wrap q-my-sm custom-width pt-label" :class="getDarkModeClass(darkMode)">
              {{ $t('Address') }}
            </div>
            <q-input
              key="defaultRecipient"
              autogrow
              dense
              outlined
              readonly
              :dark="darkMode"
              :modelValue="computedFormData.recipientAddress"
              class="q-space q-my-sm"
              bottom-slots
            />
          </div>
          <q-separator :color="darkMode ? 'grey' : 'black'"/>
          <q-item class="q-mb-sm">
            <q-item-section side>
              <q-item-label :class="darkMode ? 'text-grey-6' : ''">{{ $t('SwapRatio') }}</q-item-label>
              <q-item-label :class="darkMode ? 'text-grey-6' : ''">{{ $t('SEP20_VaultBalance') }}</q-item-label>
            </q-item-section>
            <q-item-section class="text-right">
              <q-item-label>
                {{ computedFormData.ratio.from }} :
                {{ computedFormData.ratio.to }}
              </q-item-label>
              <q-item-label>
                <template v-if="formData.token && formData.token.sep20_balance">
                  {{ formData.token.sep20_balance }}
                </template>
              </q-item-label>
            </q-item-section>
          </q-item>

          <q-btn
            no-caps
            :disable="lockInputs"
            :label="$t('Swap')"
            class="full-width button"
            type="submit"
          />
        </q-card-section>
      </q-card>
    </q-form>
    <q-card v-else class="q-mt-sm pt-card text-bow" :class="getDarkModeClass(darkMode)">
      <q-card-section>
        <div class="row items-center justify-start">
          <q-btn
            padding="sm"
            :disable="stagedSwapInfo.loading"
            flat
            round
            icon="arrow_back"
            @click="stagedSwapInfo.show = false"
          />
        </div>
        <div v-if="computedStagedSwapInfo.errors.length" class="q-my-sm q-pa-sm rounded-borders bg-red text-white">
          <ul class="q-my-sm q-pl-lg">
            <li
              class="pt-label"
              :class="getDarkModeClass(darkMode)"
              v-for="(error, index) in computedStagedSwapInfo.errors" :key="index"
            >
              {{ error }}
            </li>
          </ul>
        </div>
        <div class="text-center q-mx-md">
          <img
            height="40"
            :src="stagedSwapInfo.token.image_url"
            alt=""
          />
          <div class="text-subtitle1 text-center pt-label" :class="getDarkModeClass(darkMode)">
            {{ stagedSwapInfo.token && stagedSwapInfo.token.name || 'Token Name' }}
          </div>
          <div class="text-subtitle1 text-center pt-label" :class="getDarkModeClass(darkMode)">
            SLP
            <q-icon name="arrow_right"/>
            SEP20
          </div>
        </div>
      </q-card-section>
      <q-card-section>
        <q-item>
          <q-item-section>
            <q-item-label>
              {{ stagedSwapInfo.amount }} {{ stagedSwapInfo.token && stagedSwapInfo.token.name }} (SLP)
            </q-item-label>
            <q-item-label>
              {{ shortenSlpAddress(senderAddress) }}
              <q-popup-proxy :breakpoint="0">
                <div class="q-pa-md text-bow address-token-label" :class="getDarkModeClass(darkMode)">
                  {{ senderAddress }}
                </div>
              </q-popup-proxy>
            </q-item-label>
          </q-item-section>
          <q-item-section style="flex:1 1 1rem;" class="q-mx-sm">
            <q-icon name="arrow_forward"/>
          </q-item-section>
          <q-item-section>
            <q-item-label>
              {{ stagedSwapInfo.amount }} {{ stagedSwapInfo.token && stagedSwapInfo.token.name }} (SLP)
            </q-item-label>
            <q-item-label class="text-grey">
              <template v-if="stagedSwapInfo.spiceBotSwapRequest && stagedSwapInfo.spiceBotSwapRequest.from_address">
                {{ shortenSlpAddress(stagedSwapInfo.spiceBotSwapRequest.from_address) }}

                <q-popup-proxy :breakpoint="0">
                  <div class="q-pa-md text-bow address-token-label" :class="getDarkModeClass(darkMode)">
                    {{ stagedSwapInfo.spiceBotSwapRequest.from_address }}
                  </div>
                </q-popup-proxy>
              </template>
              <template>
                &nbsp;
              </template>
            </q-item-label>
          </q-item-section>
        </q-item>

        <q-item>
          <q-item-section>
            <q-item-label>
              {{ computedStagedSwapInfo.expectedAmount }}
              {{ stagedSwapInfo.token && stagedSwapInfo.token.name }} (SEP20)
            </q-item-label>
            <q-item-label class="text-grey">
              {{ shortenSlpAddress(stagedSwapInfo.token && stagedSwapInfo.token.sep20_source_address) }}
              <q-popup-proxy :breakpoint="0">
                <div class="q-pa-md text-bow address-token-label" :class="getDarkModeClass(darkMode)">
                  {{ stagedSwapInfo.token && stagedSwapInfo.token.sep20_source_address }}
                </div>
              </q-popup-proxy>
            </q-item-label>
          </q-item-section>
          <q-item-section style="flex:1 1 1rem;" class="q-mx-sm">
            <q-icon name="arrow_forward"/>
          </q-item-section>
          <q-item-section>
            <q-item-label>
              {{ computedStagedSwapInfo.expectedAmount }}
              {{ stagedSwapInfo.token && stagedSwapInfo.token.name }} (SEP20)
            </q-item-label>
            <q-item-label>
              {{ shortenSlpAddress(stagedSwapInfo.recipientAddress) }}
              <q-popup-proxy :breakpoint="0">
                <div class="q-pa-md text-bow address-token-label" :class="getDarkModeClass(darkMode)">
                  {{ stagedSwapInfo.recipientAddress }}
                </div>
              </q-popup-proxy>
            </q-item-label>
          </q-item-section>
        </q-item>

        <q-separator :color="darkMode ? 'grey' : 'black'"/>

        <q-item class="q-mb-sm">
          <q-item-section side>
            <q-item-label :class="darkMode ? 'text-grey-6' : ''">Swap ratio</q-item-label>
          </q-item-section>
          <q-item-section class="text-right">
            <q-item-label>
              {{ computedStagedSwapInfo.ratio.from }} :
              {{ computedStagedSwapInfo.ratio.to }}
            </q-item-label>
          </q-item-section>
        </q-item>
        <div v-if="stagedSwapInfo.loading" class="row items-center justify-center">
          <ProgressLoader />
        </div>
        <q-btn
          v-else
          no-caps
          :disable="computedStagedSwapInfo.errors.length > 0 || stagedSwapInfo.updatingSwapRequest || stagedSwapInfo.updatingSwapRequest"
          :loading="stagedSwapInfo.updatingSwapRequest"
          :label="$t('ConfirmSwap')"
          color="brandblue"
          class="full-width"
          @click="stagedSwapInfo.showConfirmSwipe = true"
        />
      </q-card-section>

      <DragSlide
        v-if="stagedSwapInfo.show && stagedSwapInfo.showConfirmSwipe"
        square
        :style="{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1500,
        }"
        @swiped="confirmSwiped()"
      />
    </q-card>
  </div>
</template>
<script>
import { markRaw } from '@vue/reactivity'
import { getMnemonic, Wallet, Address } from '../../wallet'
import {
  fetchTokensList,
  batchFetchSep20TokenBalances,
  getOrCreateSwapRequest
} from '../../wallet/spicebot-bridge'
import DragSlide from '../drag-slide.vue'
import ProgressLoader from '../ProgressLoader.vue'
import SecurityCheckDialog from '../SecurityCheckDialog.vue'
import SpicebotBridgeTokenSelectDialog from './SpicebotBridgeTokenSelectDialog.vue'
import SpicebotBridgeSwapListenerDialog from './SpicebotBridgeSwapListenerDialog.vue'
import { isHongKong, getDarkModeClass } from 'src/utils/theme-darkmode-utils'

export default {
  name: 'SpicebotBridgeForm',
  components: {
    DragSlide,
    ProgressLoader
  },
  data () {
    return {
      wallet: null,
      slpTokenBalances: [],
      tokens: [],
      errors: [],
      formData: {
        token: null,
        amount: 0
      },

      stagedSwapInfo: {
        show: false,
        showConfirmSwipe: false,

        loading: false,
        errors: [],

        token: null,
        amount: 0,
        recipientAddress: '',

        updatingSwapRequest: false,
        spiceBotSwapRequest: null
      },

      swapFulfillmentListener: {
        show: true,
        swapRequestId: null,
        swapRequest: null,

        sentTxid: ''
      }
    }
  },
  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    currentCountry () {
      return this.$store.getters['global/country'].code
    },
    theme () {
      return this.$store.getters['global/theme']
    },
    lockInputs () {
      if (!this.formData || !this.formData.token) return true
      if (this.stagedSwapInfo && this.stagedSwapInfo.show) return true

      return false
    },
    senderAddress () {
      return this.$store.getters['global/getAddress']('slp')
    },
    computedFormData () {
      const data = {
        expectedAmount: 0,
        ratio: {
          from: 1,
          to: 1
        },
        maxAllowed: 0,
        recipientAddress: '',
        selectedTokenBalance: null
      }
      if (this.formData?.token?.slp_to_sep20_ratio) {
        data.expectedAmount = this.formData.amount / (this.formData?.token?.slp_to_sep20_ratio)
        if (this.formData?.token?.slp_to_sep20_ratio < 1) data.ratio.to = 1 / this.formData?.token?.slp_to_sep20_ratio
        else data.ratio.from = this.formData?.token?.slp_to_sep20_ratio
      }

      if (this.formData?.token?.sep20_balance && this.formData?.token?.slp_to_sep20_ratio) {
        data.maxAllowed = this.formData?.token?.sep20_balance * this.formData?.token?.slp_to_sep20_ratio
      }

      if (this.wallet) {
        data.recipientAddress = this.wallet.sBCH._wallet.address
        // data.recipientAddress = '0x6516f05b533251d7cb03e37f5167eaf74949d47f'
      }

      if (this.formData?.token?.slp_token_id) {
        const tokenBalance = this.slpTokenBalances.find(tokenBalance => tokenBalance?.slp_token_id === this.formData.token.slp_token_id)
        data.selectedTokenBalance = tokenBalance.balance
      }

      return data
    },
    computedStagedSwapInfo () {
      const data = {
        expectedAmount: 0,
        ratio: {
          from: 1,
          to: 1
        },
        spicebotSwapRequestValid: false,
        errors: []
      }
      if (this.stagedSwapInfo?.token?.slp_to_sep20_ratio) {
        data.expectedAmount = this.stagedSwapInfo.amount / (this.stagedSwapInfo?.token?.slp_to_sep20_ratio)
        if (this.stagedSwapInfo?.token?.slp_to_sep20_ratio < 1) data.ratio.to = 1 / this.stagedSwapInfo?.token?.slp_to_sep20_ratio
        else data.ratio.from = this.stagedSwapInfo?.token?.slp_to_sep20_ratio
      }

      if (this.stagedSwapInfo.spiceBotSwapRequest) {
        const swapRequest = this.stagedSwapInfo.spiceBotSwapRequest

        data.spicebotSwapRequestValid = true &&
          String(this.stagedSwapInfo.token.slp_token_id).toLowerCase() === String(swapRequest?.token?.slp_token_id).toLowerCase() &&
          String(this.stagedSwapInfo.recipientAddress).toLowerCase() === String(swapRequest?.to_address).toLowerCase() &&
          Number(this.stagedSwapInfo.amount) === Number(swapRequest?.amount)

        data.spicebotSwapRequestValid = data.spicebotSwapRequestValid && Boolean(!swapRequest?.date_fulfilled)
      }

      if (!data.spicebotSwapRequestValid && !this.stagedSwapInfo?.updatingSwapRequest) {
        if (this.stagedSwapInfo?.spiceBotSwapRequest?.id) {
          data.errors.push('Invalid swap request.')
        } else {
          data.errors.push('Failed to generated swap request from Spicebot')
        }
      }
      if (Array.isArray(this.stagedSwapInfo?.errors) && this.stagedSwapInfo.errors.length) {
        data.errors = [...data.errors, ...this.stagedSwapInfo.errors]
      }

      return data
    },
    stagedSwapSlpSendParams () {
      const bchWallet = this.$store.getters['global/getWallet']('bch')
      const params = {
        amount: this.stagedSwapInfo?.amount,
        tokenId: this.stagedSwapInfo?.token?.slp_token_id,
        tokenType: 1,
        feeFunder: {
          walletHash: bchWallet.walletHash,
          mnemonic: this.wallet.mnemonic,
          derivationPath: bchWallet.derivationPath
        },
        changeAddresses: {
          bch: this.$store.getters['global/getChangeAddress']('bch'),
          slp: this.$store.getters['global/getChangeAddress']('slp')
        },
        sendToAddress: this.stagedSwapInfo?.spiceBotSwapRequest?.from_address,
        valid: this.computedStagedSwapInfo.spicebotSwapRequestValid
      }

      const addressValidator = new Address(params.sendToAddress)
      if (!addressValidator.isSLPAddress()) params.valid = false

      return params
    }
  },
  methods: {
    isHongKong,
    getDarkModeClass,
    shortenSlpAddress (value = '', keepPrefix = false) {
      if (!value) return value
      let prefix = ''
      let substring = String(value)
      if (substring.indexOf('simpleledger:') === 0) {
        prefix = 'simpleledger:'
        substring = substring.replace('simpleledger:', '')
      }

      if (substring.length >= 13) {
        substring = substring.substr(0, 6) + '...' + substring.substr(-4)
      }
      return (keepPrefix ? prefix : '') + substring
    },
    resetForm () {
      this.resetStagedFormData()
      this.resetFormData()
    },
    resetFormData () {
      this.formData.token = null
      this.formData.amount = 0
    },
    resetStagedFormData () {
      this.stagedSwapInfo.show = false
      this.stagedSwapInfo.showConfirmSwipe = false
      this.stagedSwapInfo.loading = false
      this.stagedSwapInfo.token = null
      this.stagedSwapInfo.amount = 0
      this.stagedSwapInfo.recipientAddress = ''
      this.stagedSwapInfo.spiceBotSwapRequest = null
    },
    stageFormData () {
      this.stagedSwapInfo.token = this.formData.token
      this.stagedSwapInfo.amount = this.formData.amount
      this.stagedSwapInfo.recipientAddress = this.computedFormData.recipientAddress
      this.updateStagedSwapRequest()

      this.stagedSwapInfo.show = true
      // this.stagedSwapInfo.showConfirmSwipe = true
    },
    confirmSwiped () {
      this.stagedSwapInfo.showConfirmSwipe = false
      this.$q.dialog({
        component: SecurityCheckDialog
      })
        .onOk(() => {
          this.commitStagedSwapInfo()
        })
        .onCancel(() => {
          this.stagedSwapInfo.showConfirmSwipe = true
        })
    },
    updateStagedSwapRequest () {
      this.stagedSwapInfo.updatingSwapRequest = true
      getOrCreateSwapRequest(
        this.stagedSwapInfo.token.slp_token_id,
        this.stagedSwapInfo.amount,
        this.stagedSwapInfo.recipientAddress
      )
        .then(response => {
          if (response && response.swapRequest) {
            this.stagedSwapInfo.spiceBotSwapRequest = response.swapRequest
            return Promise.resolve(response)
          }

          return Promise.reject(response)
        })
        .finally(() => {
          this.stagedSwapInfo.updatingSwapRequest = false
        })
    },
    commitStagedSwapInfo () {
      // was here
      this.stagedSwapInfo.loading = true
      if (!this.stagedSwapSlpSendParams.valid) {
        this.stagedSwapInfo.errors = [
          'Incorrect Swap Info'
        ]
        return
      }

      this.wallet.SLP.sendSlp(
        this.stagedSwapSlpSendParams.amount,
        this.stagedSwapSlpSendParams.tokenId,
        this.stagedSwapSlpSendParams.tokenType,
        this.stagedSwapSlpSendParams.sendToAddress,
        this.stagedSwapSlpSendParams.feeFunder,
        this.stagedSwapSlpSendParams.changeAddresses
      )
        .finally(() => {
          this.stagedSwapInfo.loading = false
          this.stagedSwapInfo.errors = []
        })
        .then((result) => {
          if (result.success) {
            this.swapFulfillmentListener.sentTxid = result.txid

            const dialogStyleClass = `pt-card text-bow ${this.getDarkModeClass(this.darkMode)}`
            this.$q.dialog({
              title: this.$t('TransactionSent') + '!',
              message: this.$t(isHongKong(this.currentCountry) ? 'Waiting_SEP20_PointSent' : 'Waiting_SEP20_TokenSent'),
              seamless: true,
              class: dialogStyleClass
            })
              .onDismiss(() => {
                this.$q.dialog({
                  component: SpicebotBridgeSwapListenerDialog,
                  componentProps: {
                    swapRequestId: this.stagedSwapInfo.spiceBotSwapRequest.id,
                    darkMode: this.darkMode
                  }
                })
                  .onDismiss(() => {
                    this.resetForm()
                  })
              })
            return Promise.resolve(result)
          }

          return Promise.reject(result)
        })
        .catch(error => {
          this.stagedSwapInfo.errors = []
          if (error?.error?.indexOf('not enough balance in sender') > -1) {
            this.stagedSwapInfo.errors.push(this.$t('NotEnoughBalForSendAmount'))
          } else if (error?.error?.indexOf('not enough balance in fee funder') > -1) {
            this.stagedSwapInfo.errors.push(this.$t('NotEnoughBchForFee'))
          } else if (error?.error) {
            this.stagedSwapInfo.errors.push(error.error)
          } else {
            this.stagedSwapInfo.errors.push(this.$t('UnknownErrorOccurred'))
          }
        })
    },
    async resolveTokenImage (slpTokenId, sep20ContractAddress) {
      try {
        const urlFromAssets = this.$store.getters['assets/getAssets']
          .filter(Boolean)
          .filter(asset => String(asset.id).toLowerCase === `slp/${slpTokenId}`.toLowerCase())
          .map(token => token && token.image_url)
          .find(Boolean)

        if (urlFromAssets) return urlFromAssets
      } catch (err) { console.error(err) }

      try {
        const urlFromSep20Assets = this.$store.getters['assets/getAssets']
          .filter(Boolean)
          .filter(asset => String(asset.id).toLowerCase === `sep20/${sep20ContractAddress}`.toLowerCase())
          .map(token => token && token.image_url)
          .find(Boolean)

        if (urlFromSep20Assets) return urlFromSep20Assets
      } catch (err) { console.error(err) }

      try {
        const { data: token } = await this.$axios.get(`https://watchtower.cash/api/tokens/${slpTokenId}/`)
        if (token?.image_url) return token.image_url
      } catch (err) { console.error(err) }

      try {
        const { data: token } = await this.$axios.get(`https://watchtower.cash/api/smartbch/token-contracts/${sep20ContractAddress}/`)
        if (token?.image_url) return token.image_url
      } catch (err) { console.error(err) }
    },
    updateWalletSlpTokenBalances (slp_token_id = '') {
      var tokens = []
      if (slp_token_id) tokens = [{ slp_token_id }]
      else tokens = this.tokens

      tokens.forEach(async (token) => {
        const { balance } = await this.wallet.SLP.getBalance(token.slp_token_id)
        const tokenBalance = this.slpTokenBalances.find(tokenBalance => tokenBalance?.slp_token_id === token.slp_token_id)
        if (tokenBalance) tokenBalance.balance = balance
        else this.slpTokenBalances.push({ slp_token_id: token.slp_token_id, balance: balance })

        // not necessary but helps keeping an updated asset list
        this.$store.commit('assets/updateAssetBalance', {
          id: `slp/${token.slp_token_id}`,
          balance: balance
        })
      })
    },
    async updateTokenSourceBalances () {
      const tokenVaultPairs = this.tokens.map(token => {
        return [token.sep20_contract, token.sep20_source_address]
      })

      const tokenVaultBalances = await batchFetchSep20TokenBalances(tokenVaultPairs)
      this.tokens.forEach(token => {
        const tokenVault = tokenVaultBalances.find(tv =>
          tv.token.toLowerCase() === token.sep20_contract.toLowerCase() &&
          tv.wallet.toLowerCase() === token.sep20_source_address.toLowerCase()
        )
        if (!tokenVault) return
        token.sep20_balance = tokenVault.balance
      })
    },
    selectToken () {
      this.$q.dialog({
        component: SpicebotBridgeTokenSelectDialog,
        componentProps: {
          darkMode: this.darkMode,
          tokens: this.tokens
        }
      })
        .onOk(token => {
          this.formData.token = token
        })
    },
    async fetchTokens () {
      const { tokens } = await fetchTokensList()
      if (!Array.isArray(tokens)) return
      this.tokens = tokens
      this.tokens.forEach(token => {
        this.resolveTokenImage(token?.slp_token_id, token?.sep20_contract)
          .then(tokenImageUrl => {
            if (!tokenImageUrl) return
            token.image_url = tokenImageUrl
            this.$forceUpdate()
          })
      })

      this.updateTokenSourceBalances()
      this.updateWalletSlpTokenBalances()
    },
    loadWallet () {
      const vm = this
      // Load wallets
      return getMnemonic(vm.$store.getters['global/getWalletIndex']).then(function (mnemonic) {
        const wallet = new Wallet(mnemonic, 'sBCH')
        return wallet.sBCH.getOrInitWallet()
          .then(() => {
            vm.wallet = markRaw(wallet)
          })
      })
    }
  },
  watch: {
    'formData.token.slp_token_id': {
      handler () {
        if (this.formData?.token?.slp_token_id) this.updateWalletSlpTokenBalances(this.formData.token.slp_token_id)
      }
    }
  },
  mounted () {
    this.loadWallet()
    this.fetchTokens()
  }
}
</script>

<style lang="scss" scoped>
  .custom-width {
    min-width: 130px;
    max-width: 150px;
  }
  .address-token-label {
    word-break: break-all;
    max-width: 80vw;
  }
</style>

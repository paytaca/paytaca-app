<template>
  <div class="static-container">
    <div id="app-container" :class="getDarkModeClass(darkMode)">
      <HeaderNav
        :title="$t('CreateGift')"
        backnavpath="/apps/gifts"
        class="q-px-sm apps-header gift-app-header"
      />
      <div class="q-pa-lg" style="width: 100%; color: black;">
        <div class="text-center" v-if="processing">
          <p :class="{'text-white': darkMode}" >{{ $t('CreatingGift') }}</p>
          <progress-loader :color="isNotDefaultTheme(theme) ? theme : 'pink'" />
        </div>
        <div class="q-mt-md" :class="{'text-white': darkMode}" v-if="!processing && !completed">
          <div class="text-h5 q-mb-md">{{ $t('CreateGift') }}</div>
          <div class="q-mb-lg">
            {{ $t('Balance') }}: {{ getAssetDenomination(denomination, spendableBch) }}
          </div>
          <label>
            {{ $t('EnterAmount') }}:
          </label>
          <q-input
            ref="amountInput"
            required
            :placeholder="$t('Amount')"
            filled
            clearable
            class="q-mt-sm"
            :rules="[val => !!val || $t('FieldIsRequired'), val => (amountBCH <= spendableBch) || $t('AmountGreaterThanBalance'), val => (amountBCH >= 0.00001) || $t('BelowMinimumGiftAmount')]"
            type="number"
            v-model="giftAmount"
            @input="giftAmount"
            :dark="darkMode"
            hide-bottom-space
          >
            <template v-slot:append>{{ denomination }}</template>
          </q-input>
          <p class="q-mt-sm">
            <template v-if="sendAmountMarketValue">
              {{ `~ ${parseFiatCurrency(sendAmountMarketValue, selectedMarketCurrency)}` }}
            </template>
          </p>

          <template v-if="createNewCampaign">
            <div v-if="campaignOptions.length > 1" class="row items-center justify-end">
              <q-btn
                flat
                no-caps
                padding="1px xs"
                @click="() => {
                  createNewCampaign = false
                  selectedCampaign = null
                }"
              >
                <q-icon size="1.25em" name="arrow_back" class="q-mr-xs"/>
                {{ $t('SelectExistingCampaign')}}
              </q-btn>
            </div>
            <label>
              {{ $t('CampaignName') }} <sup>*</sup>
            </label>
            <q-input
              ref="campaignNameInput"
              :placeholder="$t('CampaignName')"
              filled
              type="string"
              :rules="[val => !!val || $t('FieldIsRequired')]"
              v-model="campaignName"
              clearable
              :dark="darkMode"
            >
            </q-input>{{ $t('Name') }}: {{ campaignName }}

            <div class="q-pa-sm q-pb-xs">
            </div>

            <label>
              {{ $t('MaxAmountPerWallet') }} <sup>*</sup>
            </label>
            <q-input
              ref="maxAmountInput"
              :placeholder="$t('Amount')"
              filled
              type="text"
              clearable
              v-model="maxPerCampaign"
              :dark="darkMode"
              :error="maxPerCampaign > 0 && maxPerCampaign < amountBCH"
              :error-message="maxPerCampaign > 0 && maxPerCampaign < amountBCH ? $t('CannotBeLowerThanGiftAmount') : null"
            >
              <template v-slot:append>{{ denomination }}</template>
            </q-input>
          </template>
          <template v-else>
            <label>
              {{ $t('CampaignOptional') }}: <q-icon name="info" @click=" showCampaignInfo = !showCampaignInfo " />
            </label>
            <p v-if="showCampaignInfo" class="q-mt-md">{{ $t('CampaignDescription') }}</p>
            <q-select
              filled
              ref="campaignInput"
              clearable
              class="q-mt-sm"
              v-model="selectedCampaign"
              :dark="darkMode"
              :options="campaignOptions"
              :label="$t('SelectCampaign')"
              popup-content-style="color: black;"
              :error="campaignSelectionError !== null"
              :error-message="campaignSelectionError"
            />
          </template>

          <div class="q-pa-sm q-pt-lg flex flex-center">
            <q-btn
              no-caps
              rounded
              color="blue-9"
              type="submit"
              :label="$t('Generate')"
              class="flex flex-center button"
              :disable="(createNewCampaign && !campaignName) || disableGenerateButton() || amountBCH > spendableBch"
              @click="processRequest()"
            >
            </q-btn>
          </div>
        </div>
        <div v-if="qrCodeContents && completed" class="text-center" :class="{'text-white': darkMode}">
          <p style="font-size: 22px;">{{ $t('Amount') }}:<br>{{ getAssetDenomination(denomination, amountBCH) }}</p>
          <div v-if="amountBCH" style="margin-top: -10px;">
            {{ `~ ${parseFiatCurrency(sendAmountMarketValue, selectedMarketCurrency)}` }}
          </div>
          <div class="flex flex-center" style="margin-top: 30px;">
            <div class="flex flex-center" @click="copyToClipboard(qrCodeContents)">
              <qr-code :text="'https://gifts.paytaca.com/claim/?code=' + qrCodeContents" :size="200" />
            </div>
          </div>
          <p style="font-size: 18px;">{{ $t('ScanClaimGift') }}</p>
          <div class="">
            <div class="text-subtitle1 text-left">{{ $t('ShareGiftLink') }}:</div>
            <ShareGiftPanel :qr-share="qrCodeContents" :amount="amountBCH"/>
          </div>
          <div class="q-mt-md">
            <q-chip
              :color="giftStatus === 'completed' ? 'positive' : giftStatus === 'processing' ? 'warning' : 'negative'"
              text-color="white"
            >
              {{ giftStatus === 'completed' ? $t('Completed') : giftStatus === 'processing' ? $t('Processing') : $t('Failed') }}
            </q-chip>
            <q-btn
              v-if="giftStatus === 'failed'"
              color="primary"
              :loading="processing"
              class="q-mt-sm"
              @click="resubmitGift(failedGiftDetails)"
            >
              {{ $t('Resubmit') }}
            </q-btn>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import HeaderNav from '../../../components/header-nav'
import ProgressLoader from '../../../components/ProgressLoader'
import ShareGiftPanel from '../../../components/gifts/ShareGiftPanel.vue'
import { getMnemonic, Wallet } from '../../../wallet'
import axios from 'axios'
import { ECPair } from '@psf/bitcoincashjs-lib'
import { toHex } from 'hex-my-bytes'
import sha256 from 'js-sha256'
import { getAssetDenomination, parseFiatCurrency, convertToBCH } from 'src/utils/denomination-utils'
import { getDarkModeClass, isNotDefaultTheme } from 'src/utils/theme-darkmode-utils'

const aesjs = require('aes-js')
const short = require('short-uuid')
const pbkdf2 = require('pbkdf2')
const sss = require('shamirs-secret-sharing')

export default {
  name: 'Gifts',
  components: {
    HeaderNav,
    ProgressLoader,
    ShareGiftPanel,
  },
  props: {
    uri: {
      type: String,
      default: ''
    }
  },
  data () {
    return {
      giftAmount: 0,
      campaignOptions: [],
      createNewCampaign: false,
      selectedCampaign: null,
      campaignSelectionError: null,
      campaignName: null,
      maxPerCampaign: null,
      qrCodeContents: null,
      processing: false,
      completed: false,
      wallet: null,
      showCampaignInfo: false,
      giftStatus: null,
      failedGiftDetails: null
    }
  },
  watch: {
    selectedCampaign (val) {
      if (val?.value === 'create-new') {
        this.createNewCampaign = true
        this.maxPerCampaign = this.amountBCH
      } else {
        if (this.amountBCH > val?.limit) {
          this.campaignSelectionError = this.$t('CampaignLimitError')
        } else {
          this.campaignSelectionError = null
        }
      }
    },
    amountBCH (oldVal, newVal) {
      if (oldVal !== newVal) {
        this.selectedCampaign = null
        this.createNewCampaign = false
      }
    }
  },
  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    denomination () {
      return this.$store.getters['global/denomination']
    },
    theme () {
      return this.$store.getters['global/theme']
    },
    amountBCH () {
      return Number(this.convertToBCH(this.denomination, this.giftAmount))
    },
    selectedMarketCurrency () {
      const currency = this.$store.getters['market/selectedCurrency']
      return currency && currency.symbol
    },
    selectedAssetMarketPrice () {
      return this.$store.getters['market/getAssetPrice']('bch', this.selectedMarketCurrency)
    },
    sendAmountMarketValue () {
      if (!this.amountBCH) return ''
      if (!this.selectedAssetMarketPrice) return ''
      const computedBalance = this.amountBCH * Number(this.selectedAssetMarketPrice)
      if (!computedBalance) return ''

      return computedBalance.toFixed(2)
    },
    spendableBch () {
      const asset = this.$store.getters['assets/getAsset']('bch')
      const balance = asset[0].spendable
      if (!Number.isFinite(balance)) return null
      return balance
    },
    giftShare() {
      return this.$store.getters['gifts/getGiftShare'](this.giftCodeHash)
    },
    giftStatus() {
      return this.$store.getters['gifts/getGiftStatus'](this.giftCodeHash)
    }
  },
  methods: {
    getAssetDenomination,
    parseFiatCurrency,
    convertToBCH,
    getDarkModeClass,
    isNotDefaultTheme,
    encryptShard(shard) {
      const password = short.generate()
      const key = pbkdf2.pbkdf2Sync(password, '_saltDefault2024', 1, 128 / 8, 'sha512')
      const textBytes = aesjs.utils.utf8.toBytes(shard)
      const aesCtr = new aesjs.ModeOfOperation.ctr(key)
      const encryptedBytes = aesCtr.encrypt(textBytes)
      const encryptedHex = aesjs.utils.hex.fromBytes(encryptedBytes)
      return {
        code: password,
        encryptedHex: encryptedHex
      }
    },
    disableGenerateButton () {
      if (this.amountBCH >= 0.00001) {
        if (this.$refs.amountInput && !this.$refs.amountInput.hasError) {
          if (this.$refs.campaignInput) {
            if (this.$refs.campaignInput.hasError) {
              return true
            } else {
              return false
            }
          }
          if (this.$refs.maxAmountInput && !this.$refs.maxAmountInput.hasError) {
            return false
          }
        }
        return true
      }
      return true
    },
    generateGift () {
      const vm = this
      vm.processing = true
      const privateKey = ECPair.makeRandom()
      const wif = privateKey.toWIF()

      const BCHJS = require('@psf/bch-js')
      const bchjs = new BCHJS()
      const pair = bchjs.ECPair.fromWIF(wif)
      const address = bchjs.ECPair.toCashAddress(pair)
      const secret = Buffer.from(wif)
      const stateShare = sss.split(secret, { shares: 3, threshold: 2 })
      const shares = stateShare.map((share) => { return toHex(share) })
      const encryptedShard = this.encryptShard(shares[0])

      vm.giftCodeHash = sha256(encryptedShard.code)
      const payload = {
        gift_code_hash: vm.giftCodeHash,
        encrypted_share: encryptedShard.encryptedHex,
        address: address,
        share: shares[1],
        amount: parseFloat(this.amountBCH),
      }
      if (vm.selectedCampaign) {
        if (vm.createNewCampaign) {
          payload.campaign = {
            name: vm.campaignName,
            limit_per_wallet: vm.maxPerCampaign
          }
        } else {
          payload.campaign = {
            id: vm.selectedCampaign.value
          }
        }
      }

      // Save gift details first with processing status
      vm.$store.dispatch('gifts/saveGift', { 
        giftCodeHash: vm.giftCodeHash, 
        share: shares[2],
        status: 'processing',
        amount: this.amountBCH,
        address: address,
        payload: payload
      })
      vm.$store.dispatch('gifts/saveQr', { giftCodeHash: vm.giftCodeHash, qr: encryptedShard.code })

      const walletHash = this.wallet.BCH.getWalletHash()
      const url = `https://gifts.paytaca.com/api/gifts/${walletHash}/create/`
      
      this.submitGiftToServer(url, payload, shares[2], encryptedShard.code, address)
    },

    async submitGiftToServer(url, payload, share, qrCode, address) {
      const vm = this
      try {
        const resp = await axios.post(url, payload)
        if (resp.status === 200) {
          vm.qrCodeContents = qrCode
          try {
            const result = await vm.wallet.BCH.sendBch(this.amountBCH, address)
            if (result.success) {
              // Update gift status to completed
              vm.$store.dispatch('gifts/updateGiftStatus', {
                giftCodeHash: vm.giftCodeHash,
                status: 'completed'
              })
              vm.processing = false
              vm.completed = true
              vm.giftStatus = 'completed'

              // Update balance
              const response = await vm.wallet.BCH.getBalance()
              vm.$store.commit('assets/updateAssetBalance', {
                id: 'bch',
                balance: response.balance,
                spendable: response.spendable
              })
            } else {
              // Update status to failed
              vm.$store.dispatch('gifts/updateGiftStatus', {
                giftCodeHash: vm.giftCodeHash,
                status: 'failed'
              })
              vm.processing = false
              vm.giftStatus = 'failed'
              vm.failedGiftDetails = {
                payload: payload,
                share: share,
                qr: qrCode,
                address: address
              }
              vm.$q.notify({
                message: vm.$t('GiftCreatedButTransactionPending'),
                color: 'warning',
                timeout: 5000
              })
            }
          } catch (sendError) {
            console.error('Send BCH error:', sendError)
            vm.$store.dispatch('gifts/updateGiftStatus', {
              giftCodeHash: vm.giftCodeHash,
              status: 'failed'
            })
            vm.processing = false
            vm.giftStatus = 'failed'
            vm.failedGiftDetails = {
              payload: payload,
              share: share,
              qr: qrCode,
              address: address
            }
            vm.$q.notify({
              message: vm.$t('GiftCreatedButTransactionPending'),
              color: 'warning',
              timeout: 5000
            })
          }
        }
      } catch (error) {
        console.error('Gift creation API error:', error)
        vm.$store.dispatch('gifts/updateGiftStatus', {
          giftCodeHash: vm.giftCodeHash,
          status: 'failed'
        })
        vm.processing = false
        vm.giftStatus = 'failed'
        vm.failedGiftDetails = {
          payload: payload,
          share: share,
          qr: qrCode,
          address: address
        }
        vm.$q.notify({
          message: vm.$t('ErrorCreatingGiftPleaseRetry'),
          color: 'negative',
          timeout: 5000
        })
      }
    },

    async resubmitGift(giftDetails) {
      if (this.processing) return
      
      this.processing = true
      const walletHash = this.wallet.BCH.getWalletHash()
      const url = `https://gifts.paytaca.com/api/gifts/${walletHash}/create/`
      
      await this.submitGiftToServer(
        url,
        giftDetails.payload,
        giftDetails.share,
        giftDetails.qr,
        giftDetails.address
      )
    },

    copyToClipboard (value) {
      this.$copyText(value)
      this.$q.notify({
        message: this.$t('CopiedToClipboard'),
        timeout: 800,
        color: 'blue-9',
        icon: 'mdi-clipboard-check'
      })
    },
    processRequest () {
      this.generateGift()
    },
    getAmountOnDenomination (amount) {
      const amountStr = this.getAssetDenomination(this.denomination, amount)
      return parseFloat(amountStr.split(' ')[0])
    },
    async fetchCampaigns() {
      const mnemonic = await getMnemonic(this.$store.getters['global/getWalletIndex'])
      this.wallet = new Wallet(mnemonic)
      let walletHash = this.$store.getters['global/getWallet']?.('bch')?.walletHash
      if (!walletHash) {
        walletHash = this.wallet.BCH.getWalletHash()
      }

      const url = `https://gifts.paytaca.com/api/campaigns/${walletHash}/list/`
      axios.get(url).then((resp) => {
        this.campaignOptions = resp.data.campaigns.map(function (item, index) {
          return {
            label: `${item.name} -- ${item.limit_per_wallet} BCH per wallet`,
            limit: item.limit_per_wallet,
            value: item.id
          }
        })
        this.campaignOptions.push({
          label: `--- ${this.$t('CreateNewCampaign')} ---`,
          value: 'create-new'
        })
      })
    }
  },
  mounted () {
    this.fetchCampaigns()
  }
}
</script>

<style lang="scss" scoped>
  .fontStyle {
    font-size:medium;
  }
  display {
    display: none;
  }
</style>

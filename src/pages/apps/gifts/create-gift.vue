<template>
  <div class="static-container">
    <div
      dense
      style="background-color: #ECF3F3; min-height: 100vh;"
      :class="{ 'pt-dark': darkMode }"
      >
      <HeaderNav
        title="Gifts"
        backnavpath="/apps/gifts"
        style="position: fixed; top: 0; background: #ECF3F3; width: 100%; z-index: 100 !important;"
        class="q-px-sm"
      />
      <div class="q-pa-lg" style="width: 100%; color: black;" :style="{ 'padding-top': $q.platform.is.ios ? '145px' : '80px'}">
        <div class="text-center" v-if="processing">
          <p :class="{'text-white': darkMode}" >Creating gift...</p>
          <progress-loader />
        </div>
        <div :class="{'text-white': darkMode}" v-if="!processing && !completed">
          <div class="text-h5 q-mb-md">Create Gift</div>
          <label>
            Enter Amount Per Gift:
          </label>
          <q-input
            required
            placeholder="Amount"
            filled
            clearable
            :rules="[val => !!val || 'Field is required']"
            type="number"
            v-model="amountBCH"
            @input="this.amountBCH"
            :dark="darkMode"
            hide-bottom-space
          >
            <template v-slot:append>BCH</template>
          </q-input>
          <p class="q-mt-sm">
            <template v-if="sendAmountMarketValue">
              ~ {{ sendAmountMarketValue }} {{ String(selectedMarketCurrency).toUpperCase() }}
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
                Select existing campaign
              </q-btn>
            </div>
            <label>
              Campaign Name
            </label>
            <q-input
              placeholder="Campaign Name"
              filled
              type="string"
              v-model="campaignName"
              clearable
              :dark="darkMode"
            >
            </q-input>

            <div class="q-pa-sm q-pb-xs">
            </div>

            <label>
              Max Amount Per Wallet
            </label>
            <q-input
              placeholder="Amount"
              filled
              type="text"
              clearable
              v-model="maxPerCampaign"
              :dark="darkMode"
            ></q-input>
          </template>
          <template v-else>
            <label>
              Campaign (optional):
            </label>
            <q-select
              filled
              clearable
              v-model="selectedCampaign"
              :dark="darkMode"
              :options="campaignOptions"
              label="Select Campaign"
              popup-content-style="color: black;"
            />
          </template>

          <div class="q-pa-sm q-pt-lg flex flex-center">
            <q-btn
              no-caps
              rounded
              color="blue-9"
              type="submit"
              label="Generate"
              class="flex flex-center"
              @click="processRequest()"
            >
            </q-btn>
          </div>
        </div>
        <div v-if="qrCodeContents && completed" class="text-center" :class="{'text-white': darkMode}">
          <p style="font-size: 22px;">Amount:<br>{{ amountBCH }} BCH</p>
          <div class="flex flex-center" >
            <div class="flex flex-center col-qr-code" @click="copyToClipboard(qrCodeContents)">
              <qr-code :text="qrCodeContents" />
            </div>
            <!-- <div class="flex flex-center myStyle">
            </div> -->
          </div>
          <p style="font-size: 18px;">Scan to claim the gift</p>
          <div class="">
            <div class="text-subtitle1 text-left">Share gift link:</div>
            <ShareGiftPanel :qr-share="qrCodeContents" :amount="amountBCH"/>
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
      amountBCH: 0.001,
      campaignOptions: [],
      createNewCampaign: false,
      selectedCampaign: null,
      campaignName: null,
      maxPerCampaign: null,
      qrCodeContents: null,
      processing: false,
      completed: false,
      wallet: null,
      darkMode: this.$store.getters['darkmode/getStatus']
    }
  },
  watch: {
    selectedCampaign (val) {
      if (val?.value === 'create-new') {
        this.createNewCampaign = true
      }
    }
  },
  computed: {
    selectedMarketCurrency () {
      const currency = this.$store.getters['market/selectedCurrency']
      return currency && currency.symbol
    },
    selectedAssetMarketPrice () {
      return this.$store.getters['market/getAssetPrice']('bch', this.selectedMarketCurrency)
    },
    sendAmountMarketValue () {
      const parsedAmount = Number(this.amountBCH)
      // console.log(parsedAmount)
      if (!parsedAmount) return ''
      if (!this.selectedAssetMarketPrice) return ''
      const computedBalance = Number(parsedAmount || 0) * Number(this.selectedAssetMarketPrice)
      if (!computedBalance) return ''

      return computedBalance.toFixed(2)
    }
  },
  methods: {
    generateGift () {
      const vm = this
      vm.processing = true
      const privateKey = ECPair.makeRandom()
      const wif = privateKey.toWIF()

      const BCHJS = require('@psf/bch-js')
      const bchjs = new BCHJS()
      const pair = bchjs.ECPair.fromWIF(wif)
      const address = bchjs.ECPair.toCashAddress(pair)

      const sss = require('shamirs-secret-sharing')
      const secret = Buffer.from(wif)
      const stateShare = sss.split(secret, { shares: 3, threshold: 2 })
      const shares = stateShare.map((share) => { return toHex(share) })
      // console.log(shares)
      vm.giftCodeHash = sha256(shares[0])
      const payload = {
        gift_code_hash: vm.giftCodeHash,
        address: address,
        share: shares[1],
        amount: parseFloat(vm.amountBCH)
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
      const walletHash = this.wallet.BCH.getWalletHash()
      const url = `https://gifts.paytaca.com/api/gifts/${walletHash}/create/`
      axios.post(url, payload).then((resp) => {
        if (resp.status === 200) {
          vm.qrCodeContents = shares[0]
          vm.wallet.BCH.sendBch(this.amountBCH, address).then(function (result, err) {
            if (result.success) {
              vm.processing = false
              vm.$store.dispatch('gifts/saveGift', { giftCodeHash: vm.giftCodeHash, share: shares[2] })
              vm.$store.dispatch('gifts/saveQr', { giftCodeHash: vm.giftCodeHash, qr: shares[0] })
              vm.completed = true
            }
          })
        }
      }).catch((error) => {
        console.log(error)
        vm.processing = false
      })
    },
    copyToClipboard (value) {
      this.$copyText(value)
      this.$q.notify({
        message: 'Copied to clipboard',
        timeout: 800,
        color: 'blue-9',
        icon: 'mdi-clipboard-check'
      })
    },
    processRequest () {
      this.generateGift()
    },
    async fetchCampaigns() {
      const mnemonic = await getMnemonic()
      this.wallet = new Wallet(mnemonic)
      let walletHash = this.$store.getters['global/getWallet']?.('bch')?.walletHash
      if (!walletHash) {
        walletHash = this.wallet.BCH.getWalletHash()
      }

      const url = `https://gifts.paytaca.com/api/campaigns/${walletHash}/list/`
      axios.get(url).then((resp) => {
        this.campaignOptions = resp.data.campaigns.map(function (item, index) {
          return { label: item.name, value: item.id }
        })
        this.campaignOptions.push({
          label: '--- Create New Campaign ---',
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
    .col-qr-code {
    margin-left: auto;
    margin-right: auto;
    margin-bottom: 10px;
    text-align: center;
    width: 500px;
    height: 310px;
    border-radius: 16px;
    border: 4px solid #ed5f59;
    padding: 22px 10px 32px 10px;
    background: white;
  }
  .fontStyle {
    font-size:medium;
  }
  display {
    display: none;
  }
</style>

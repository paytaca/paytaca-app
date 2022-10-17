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
      <div class="q-pa-lg" style="width: 100%; color: black;">
        <div class="text-center" v-if="processing" style="margin-top: 80px;">
          <p :class="{'text-white': darkMode}" >Creating gift...</p>
          <progress-loader />
        </div>
        <div class="q-pt-lg" :class="{'text-white': darkMode}" v-if="!processing && !completed">
          <h5>Create Gift</h5>
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
          >
            <template v-slot:append>BCH</template>
          </q-input>
          <p style="margin-top: -12px;">
            ~ {{ sendAmountMarketValue }} {{ String(selectedMarketCurrency).toUpperCase() }}
          </p>

          <template v-if="createNewCampaign">
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
            <q-select filled v-model="selectedCampaign" :dark="darkMode" :options="campaignOptions" label="Select Campaign" />
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
        <div v-if="qrCodeContents && completed" class="text-center" :class="{'text-white': darkMode}" style="margin-top: 80px;">
          <p style="font-size: 22px;">Amount:<br>{{ amountBCH }} BCH</p>
          <div class="flex flex-center" >
            <div class="flex flex-center col-qr-code" @click="copyToClipboard(qrCodeContents)">
              <qr-code :text="qrCodeContents" />
            </div>
            <div class="flex flex-center myStyle">
            </div>
          </div>
          <p style="font-size: 18px;">Scan to claim the gift</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import HeaderNav from '../../../components/header-nav'
import { getMnemonic, Wallet } from '../../../wallet'
import ProgressLoader from '../../../components/ProgressLoader'
import axios from 'axios'
import { ECPair } from '@psf/bitcoincashjs-lib'
import { toHex } from 'hex-my-bytes'
import sha256 from 'js-sha256'

export default {
  name: 'Gifts',
  components: { HeaderNav, ProgressLoader },
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
      darkMode: this.$store.getters['darkmode/getStatus']
    }
  },
  watch: {
    selectedCampaign (val) {
      if (val.value === 'create-new') {
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
      console.log(parsedAmount)
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
    }
  },
  // wallet call function when mounted
  mounted () {
    const vm = this
    getMnemonic().then(function (mnemonic) {
      const wallet = new Wallet(mnemonic)
      wallet.sBCH.getOrInitWallet()
        .then(() => {
          vm.wallet = wallet
          const walletHash = vm.wallet.BCH.getWalletHash()
          const url = `https://gifts.paytaca.com/api/campaigns/${walletHash}/list/`
          axios.get(url).then((resp) => {
            vm.campaignOptions = resp.data.campaigns.map(function (item, index) {
              return { label: item.name, value: item.id }
            })
            vm.campaignOptions.push({
              label: '--- Create New Campaign ---',
              value: 'create-new'
            })
          })
        })
    })
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

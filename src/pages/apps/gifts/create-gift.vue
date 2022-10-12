<template>
  <div class="static-container">
    <div
      dense
      id="app-container"
      style="background-color: #ECF3F3; min-height: 100vh;"
      class="flex flex-center"
      >
      <HeaderNav
        title="Gifts"
        backnavpath="/apps/gifts"
        style="position: fixed; top: 0; background: #ECF3F3; width: 100%; z-index: 100 !important;"
        class="q-px-sm"
      />
      <div class="q-pa-lg" style="width: 100%; color: black;">
        <div class="q-pt-xl">
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
          >
          <!-- @input="amountBCH" -->
          </q-input>
          <div class="q-pa-sm">
          </div>

          <label>
            Enter number of Gift Items
          </label>
          <q-input
            required
            placeholder="Instances"
            filled
            type="number"
            oninput="javascript: if (this.value.length > this.maxLength) this.value = this.value.slice(0, this.maxLength);"
            maxlength="3"
            clearable
            :rules="[val => !!val || 'Field is required']"
            v-model="instances"
          >
          </q-input>
          <div class="q-pa-sm">
          </div>

          <label>
            Enter Campaign ID
          </label>
          <q-input
            placeholder="Campaign ID"
            filled
            type="string"
            clearable
          >
          </q-input>
          <div class="q-pa-sm q-pb-lg">
          </div>

          <label>
            Max Amount per Address
          </label>
          <q-input
            placeholder="Amount"
            filled
            type="text"
            clearable
            v-model="maxPerCampaign"
          ></q-input>
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
        <div v-if="qrCodeContents">
          <div class="flex flex-center" >
            <div class="flex flex-center col-qr-code">
              <qr-code :text="qrCodeContents" />
            </div>
            <div class="flex flex-center myStyle">
            </div>
          </div>
        </div>
        <p @click="copyToClipboard(qrCodeContents)">{{ qrCodeContents }}</p>
      </div>
    </div>
  </div>
</template>

<script>
import HeaderNav from '../../../components/header-nav'
import { getMnemonic, Wallet } from '../../../wallet'
import axios from 'axios'
import { ECPair } from '@psf/bitcoincashjs-lib'
import { toHex } from 'hex-my-bytes'
import sha256 from 'js-sha256'

export default {
  name: 'Gifts',
  components: { HeaderNav },
  props: {
    uri: {
      type: String,
      default: ''
    }
  },
  data () {
    return {
      amountBCH: 0.001,
      instances: 1,
      maxPerCampaign: null,
      qrCodeContents: null
    }
  },

  methods: {
    generateGift () {
      const vm = this
      const privateKey = ECPair.makeRandom()
      const wif = privateKey.toWIF()
      console.log('Private key:', wif)

      const BCHJS = require('@psf/bch-js')
      const bchjs = new BCHJS()
      const pair = bchjs.ECPair.fromWIF(wif)
      const address = bchjs.ECPair.toCashAddress(pair)
      console.log('Address:', address)
      // this.$store.dispatch('gifts/genCashAdd', this.str)

      const sss = require('shamirs-secret-sharing')
      const secret = Buffer.from(wif)
      const stateShare = sss.split(secret, { shares: 3, threshold: 2 })
      const shares = stateShare.map((share) => { return toHex(share) })

      vm.giftId = sha256(shares[0])
      console.log('Gift ID:', vm.uid)
      console.log('Shares:', shares)
      const payload = {
        share: shares[1],
        amount: vm.amountBCH,
        gift_id: vm.giftId
      }
      vm.wallet.BCH.sendBch(this.amountBCH, address).then(function (result, err) {
        if (result.success) {
          const url = 'https://gifts.paytaca.com/api/gifts/create/'
          axios.post(url, payload).then((resp) => {
            if (resp.status === 200) {
              vm.qrCodeContents = shares[0]
              console.log(vm.qrCodeContents)
            }
          })
        } else {
          console.error(err)
        }
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
      height: 300px;
      border-radius: 16px;
      border: 4px solid #ed5f59;
      padding: 10px 10px 32px 10px;
      background: white;
    }
    .fontStyle {
      font-size:medium;
    }
    display {
      display: none;
    }
  </style>

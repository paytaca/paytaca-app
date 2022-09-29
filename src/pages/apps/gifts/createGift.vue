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
            Enter Amount:
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
            @input="this.instances"
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
            @input="this.text"
            v-model="text"
          >
          </q-input>
            <div class="q-pa-sm q-pt-lg flex flex-center" style="width:100%">
              <q-btn
                no-caps
                rounded
                color="blue-9"
                type="submit"
                label="Generate"
                class="flex flex-center"
                id="canvasButton"
                @click="clickMe()"
              >
              </q-btn>
              <div class="q-pa-sm q-pb-lg"></div>
        </div>
        <!-- <div>
        {{ this.$store.state.gifts.privKey }}
        {{this.$store.state.gifts.cashAdd}}
        {{ this.$store.state.gifts.storeShare }}
        {{ this.$store.state.gift.recShare }}
        {{ this.$store.state.gifts.genGifts }}
        </div> -->
        <div>
          <div class="flex flex-center q-pb-none">
            <div class="flex flex-center">
            <div class="flex flex-center col-qr-code">
                <canvas id="canvas" class="flex flex-center"></canvas>
            </div>
              </div>
            <div class="flex flex-center myStyle">
            </div>
          </div>
          <div class="flex flex-center q-pt-sm" @click="copyToClipboard(this.cAdd)"  v-if="$store.cAdd !== 0">
              <p class="fontStyle flex flex-center">{{ this.cAdd }}</p>
            </div>
              <div class="flex flex-center q-pt-none">
              <p class="fontStyle">Click to Copy Address</p>
            </div>
        </div>
       </div>
      </div>
        </div>
      </div>
   <!--  </div>
  </div> -->
  </template>
<script>
import HeaderNav from '../../../components/header-nav'
import { getMnemonic, Wallet } from '../../../wallet'
import { v4 as uuidv4 } from 'uuid'
import { ECPair } from '@psf/bitcoincashjs-lib'
import { toHex } from 'hex-my-bytes'

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
      wallet: '',
      txid: '',
      amountBCH: '',
      instances: null,
      gift: {},
      text: null,
      // test
      vWif: '',
      cAdd: '',
      localShare: [],
      uid: '',
      gifts: {},
      hotdog: {},
      url: ''
    }
  },

  methods: {
    // test 9 23 2022
    clickMe () {
      for (let i = 0; i < this.instances; i++) {
        this.genPrivKey()
        // this.genCashAddress()
        this.genShares()
        this.qrCode()
        this.handleSubmit(this.cAdd)
        // this.recoverSec()
      }
    },
    genPrivKey () {
      const privateKey = ECPair.makeRandom()
      this.vWif = privateKey.toWIF()
      console.log('Private key:', this.vWif)
      this.$store.dispatch('gifts/genPrivKey', this.vWif)
      // generate cash address
      const BCHJS = require('@psf/bch-js')
      const bchjs = new BCHJS()
      const pair = bchjs.ECPair.fromWIF(this.vWif)
      this.cAdd = bchjs.ECPair.toCashAddress(pair)
      console.log('Address:', this.cAdd)
      this.$store.dispatch('gifts/genCashAdd', this.cAdd)
    },
    genShares () {
      // create shares and send to store
      const sss = require('shamirs-secret-sharing')
      const secret = Buffer.from(this.vWif)
      const stateShare = sss.split(secret, { shares: 3, threshold: 2 })
      this.shares = stateShare.map((share) => { return toHex(share) })
      this.$store.dispatch('gifts/genShares', this.shares)
      this.localShare = this.shares
      console.log('Shares:', this.shares)

      // create uid and put in dict with shares
      this.uid = uuidv4()
      console.log('Gift ID:', this.uid)
      this.gifts[this.uid] = this.shares
      this.$store.dispatch('gifts/storeGift', { uid: this.uid, shares: this.shares })
    },
    recoverSec () {
      const sss = require('shamirs-secret-sharing')
      const recovery = sss.combine([this.shares[0], this.shares[1]])
      console.log(recovery.toString())
      this.$store.dispatch('gifts/recoverSec', recovery.toString())
    },
    // /end test
    qrCode () {
      const key = this.localShare[0]
      // const key = this.vWif
      const QRCode = require('qrcode')
      const canvas = document.getElementById('canvas')
      QRCode.toCanvas(canvas, key, function (error) {
        if (error) console.error(error)
        console.log('success')
      })
    },
    async handleSubmit (cAdd) {
      const vm = this
      const address = cAdd
      vm.wallet.BCH.sendBch(this.amountBCH, address).then(function (result, err) {
        if (result.success) {
          vm.txid = result.txid
        } else {
          console.error(err)
        }
      })
    },
    // function to copy text via click
    copyToClipboard (value) {
      this.$copyText(value)
      this.$q.notify({
        message: 'Copied to clipboard',
        timeout: 800,
        color: 'blue-9',
        icon: 'mdi-clipboard-check'
      })
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

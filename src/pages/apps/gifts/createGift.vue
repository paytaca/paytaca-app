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
        backnavpath="/apps/chooseGift"
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
            <div class="q-pa-sm q-pt-lg flex flex-center">
              <q-btn
                no-caps
                rounded
                color="blue-9"
                type="submit"
                label="Generate"
                class="flex flex-center"
                @click="clickMe()"
              >
              </q-btn>
              <div class="q-pa-sm q-pb-lg"></div>
              <div class="q-pa-sm q-pt-lg flex flex-center" >
              <q-btn
                no-caps
                rounded
                color="blue-9"
                type="submit"
                label="cash address"
                class="flex flex-center"
                @click="spliceAll()"
              >
              </q-btn>
              </div>
        </div>

        <div>
        {{ this.$store.state.gifts.privKey }}
        {{this.$store.state.gifts.cashAdd}}
        {{ this.$store.state.gifts.storeShare }}
        <!-- {{ this.$store.state.gift.recShare }} -->
        {{ this.$store.state.gifts.genGifts }}
        <!-- {{ this.shares }} -->

        <!-- {{ this.$store.state.gift.apKeyStore }} -->
        </div>
      <div>
          <div class="flex flex-center" >
            <div class="flex flex-center col-qr-code">
                <canvas id="canvas" class="flex flex-center"></canvas>
                <!-- {{ this.$store.state.gift.gAmount }} -->
            </div>
            <div class="flex flex-center myStyle">
              <!-- <h5>{{ $store.state.gift.cashAddress }}</h5> -->
            </div>
          </div>
          <!-- <div class="flex flex-center" @click="copyToClipboard(this.$store.state.gift.cashAddress)">
            <div class="flex flex-center" v-if="$store.state.gift.cashAddress !== 0">
          <p class="fontStyle">{{ $store.state.gift.cashAddress }}</p>
          <p class="fontStyle">Click to Copy Address</p>
            </div>
            <div class="flex flex-center" v-else>
              <p class="fontStyle">{{ $store.state.gift.cashAddress }}</p>
            </div> -->
        <!-- </div> -->
      </div>
        </div>
      </div>
    </div>
  </div>
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
      instances: 0,
      text: ['hot', 'dog', 'chili'],
      id: 1,
      gift: {},
      // test
      vWif: '',
      str: '',
      localShare: [],
      uid: '',
      gifts: {}
    }
  },

  methods: {
    // test 9 22 2022

    // test 9 23 2022
    clickMe () {
      this.genPrivKey()
      this.genCashAddress()
      this.genShares()
      // this.recoverSec()
    },
    genPrivKey () {
      const privateKey = ECPair.makeRandom()
      this.vWif = privateKey.toWIF()
      console.log('Private key:', this.vWif)
      this.$store.dispatch('gifts/genPrivKey', this.vWif)
    },
    genCashAddress () {
      const BCHJS = require('@psf/bch-js')
      const bchjs = new BCHJS()
      // const pk = this.vWif
      const pair = bchjs.ECPair.fromWIF(this.vWif)
      this.str = bchjs.ECPair.toCashAddress(pair)
      console.log('Address:', this.str)
      this.$store.dispatch('gifts/genCashAdd', this.str)
    },
    genShares () {
      const sss = require('shamirs-secret-sharing')
      const secret = Buffer.from(this.vWif)
      const stateShare = sss.split(secret, { shares: 3, threshold: 2 })
      this.shares = stateShare.map((share) => { return toHex(share) })
      // commit('aSplitSecret', this.shares)
      this.$store.dispatch('gifts/genShares', this.shares)
      console.log('Shares:', this.shares)
      console.log('xxx:', this.shares)
      // this.gifts[uuidv4()] = this.text
      this.uid = uuidv4()
      console.log('Gift ID:', this.uid)
      this.gifts[this.uid] = this.localShares
      this.$store.dispatch('gifts/storeGift', { uid: this.uid, shares: this.shares })
    },
    recoverSec () {
      const sss = require('shamirs-secret-sharing')
      const recovery = sss.combine([this.shares[0], this.shares[1]])
      console.log(recovery.toString())
      this.$store.dispatch('gifts/recoverSec', recovery.toString())
    },
    // /end test
    recoverSecret () {
      this.$store.dispatch('gifts/recoverSecret')
    },
    qrCode () {
      const key = this.$store.state.gifts.share[0]
      const QRCode = require('qrcode')
      const canvas = document.getElementById('canvas')
      QRCode.toCanvas(canvas, key, function (error) {
        if (error) console.error(error)
        console.log('success!')
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
  </style>

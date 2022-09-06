<template>
  <div class="static-container">
    <!-- <QrScanner
      v-model="scanner.show"
      @decode="onScannerDecode"
    /> -->
    <div
      dense
      id="app-container"
      style="background-color: #ECF3F3; min-height: 100vh;"
      class="flex flex-center"
      :class="{ 'pt-dark': darkMode }"
    >
      <HeaderNav
        title="Gifts"
        backnavpath="/apps"
        style="position: fixed; top: 0; background: #ECF3F3; width: 100%; z-index: 100 !important;"
        class="q-px-sm"
      />

      <div class="q-mx-sm">
        <div class="q-pt-sm">
          <label>
            Enter Amount:
          </label>
          <q-input
            required
            placeholder="Amount"
            filled
            :dark="darkMode"
            clearable
            v-model="input.amount"
            :disable="handshakeOnProgress"
            :rules="[val => !!val || 'Field is required']"
            type="text"
            id="amount"

          >
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
            v-model="input.instance"
            :dark="darkMode"
            :max="input.quantity"
            oninput="javascript: if (this.value.length > this.maxLength) this.value = this.value.slice(0, this.maxLength);"
            maxlength="3"
            :disable="handshakeOnProgress"
            clearable
            :rules="[val => !!val || 'Field is required']"
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
            v-model="input.campID"
            :dark="darkMode"
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
            type="number"
            v-model="input.maxPerAddress"
            :dark="darkMode"
            clearable
          >
          </q-input>
            <div class="q-pa-sm q-pt-lg flex flex-center" >
              <!-- <qrcode-vue :value="value" color="#253933" :size="10" error-level="H" class="q-mb-sm"></qrcode-vue> -->
              <q-btn
                no-caps
                rounded
                color="blue-9"
                type="submit"
                :disable="handshakeOnProgress"
                label="Generate"
                @click="splitSecret()"
              >
              </q-btn>
            <div>
          </div>
        </div>
        <div class="q-pa-sm q-pt-lg flex flex-center" >
        <q-btn
                no-caps
                rounded
                color="blue-9"
                type="submit"
                :disable="handshakeOnProgress"
                label="recover"
                @click="recoverSecret()"
              ></q-btn>
        </div>
<<<<<<< HEAD
        <canvas id="canvas"> </canvas>
=======
>>>>>>> aac25a82912560e62e78cb0c375c308a1a4f166f
        </div>
      </div>
    </div>
  </div>
</template>
<script>

import HeaderNav from '../../components/header-nav'
// import { Notify } from 'quasar'
import { ECPair } from '@psf/bitcoincashjs-lib'
import { toHex } from 'hex-my-bytes'
// import { formatsByName, formatsByCoinType } from '@ensdomains/address-encoder'
// import { QRGenerator } from 'dynamic-qr-code-generator'
<<<<<<< HEAD
import { getMnemonic, Wallet } from '../../wallet'
=======
>>>>>>> aac25a82912560e62e78cb0c375c308a1a4f166f

export default {
  name: 'Gift',
  components: { HeaderNav },
  props: {
    uri: {
      type: String,
      default: ''
    }
  },
  data () {
    return {
      input: {
        amount: '',
        instance: '',
        campID: '',
        quantity: '100',
        maxPerAddress: '',
        shares: [],
<<<<<<< HEAD
        pk: '',
        wallet: ''
=======
        pk: ''
>>>>>>> aac25a82912560e62e78cb0c375c308a1a4f166f
      },
      generatingAddress: false,
      walletType: ''
    }
  },
  methods: {
    // method for splitting private key to 3 shares
    splitSecret () {
      this.pk = this.generatePrivateKey()
      const cashAdd = this.convertToCashAddress(this.pk)
      console.log(this.pk)
      console.log(cashAdd)
      const sss = require('shamirs-secret-sharing')
      const secret = Buffer.from(this.pk)
      const shares = sss.split(secret, { shares: 3, threshold: 2 })
      // console.log(toHex(shares[0]))
      this.shares = shares.map((share) => { return toHex(share) })
      this.qrCode()
      console.log(this.shares)
    },
    // method for recovering private key from 2 of 3 shares(splitsecret)
    recoverSecret () {
      const sss = require('shamirs-secret-sharing')
      const recovery = sss.combine([this.shares[0], this.shares[1]])
      console.log(recovery.toString())
    },

    // method for generating private key
    generatePrivateKey () {
      const keyPair = ECPair.makeRandom()
      return keyPair.toWIF()
    },

    // method for converting private key to cash address
    convertToCashAddress (wif) {
      const BCHJS = require('@psf/bch-js')
      const bchjs = new BCHJS()
      const pair = bchjs.ECPair.fromWIF(wif)
      const cAddress = bchjs.ECPair.toCashAddress(pair)
      // console.log(hotdog)
      return cAddress
    },

    qrCode () {
<<<<<<< HEAD
      const key = 'https://gifts.paytaca.com/claim?amount=<amount>&share=<share>&id=<id>'
      const QRCode = require('qrcode')
      const canvas = document.getElementById('canvas')

      QRCode.toCanvas(canvas, key, function (error) {
        if (error) console.error(error)
        console.log('success!')
      })
      /* QRCode.toDataURL(key, function (err, url) {
        if (err) console.error(err)
        console.log('success')
      }) */
=======
      const key = 'paytaca.com/gifts/?amount=<amount>&share=<share>&id=<id>'
      const QRCode = require('qrcode')
      // const canvas = document.getElementById('canvas')

      QRCode.toCanvas(key, function (error) {
        if (error) console.error(error)
        console.log('success!')
      })
>>>>>>> aac25a82912560e62e78cb0c375c308a1a4f166f
    }
  },
  computed: {
    insufficientBalance () {
      const hasValidBalance = this.formData.sourceToken.balance >= 0
      if (!hasValidBalance) return true

      return this.formData.sourceToken.balance < this.formData.amount
    }
<<<<<<< HEAD
  },
  mounted () {
    const vm = this
    getMnemonic().then(function (mnemonic) {
      const wallet = new Wallet(mnemonic)
      wallet.sBCH.getOrInitWallet()
        .then(() => {
          vm.wallet = wallet
        })
    })
=======
>>>>>>> aac25a82912560e62e78cb0c375c308a1a4f166f
  }
}
</script>

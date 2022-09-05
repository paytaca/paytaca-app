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
                @click="convertToCashAddress(generatePrivateKey())"
              ></q-btn>
        </div>
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
import { QRGenerator } from 'dynamic-qr-code-generator'

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
        pk: ''
      },
      generatingAddress: false,
      walletType: ''
    }
  },
  methods: {
    // method for splitting private key to 3 shares
    splitSecret () {
      this.pk = this.generatePrivateKey()
      const mamaw = this.convertToCashAddress(this.pk)
      // this.convertToCashAddress(this.generatePrivateKey())
      console.log(this.pk)
      console.log(mamaw)
      const sss = require('shamirs-secret-sharing')
      const secret = Buffer.from(this.pk)
      const shares = sss.split(secret, { shares: 3, threshold: 2 })
      // console.log(toHex(shares[0]))
      this.shares = shares.map((share) => { return toHex(share) })
      // console.log(this.convertToCashAddress(pk))
      console.log(this.shares)
    },
    // method for recovering private key from 2 of 3 shares(splitsecret)
    recoverSecret () {
      const sss = require('shamirs-secret-sharing')
      const recovery = sss.combine([this.shares[0], this.shares[1]])
      // console.log(this.shares[0].toString())
      console.log(recovery.toString())
    },

    // method for generating private key
    generatePrivateKey () {
      const keyPair = ECPair.makeRandom()
      return keyPair.toWIF()
    },

    convertToCashAddress (wif) {
      const BCHJS = require('@psf/bch-js')
      const bchjs = new BCHJS()
      const pair = bchjs.ECPair.fromWIF(wif)
      const hotdog = bchjs.ECPair.toCashAddress(pair)
      // console.log(hotdog)
      return hotdog
    },

    qrCode () {
      // var props = { value: 'paytaca.com/gifts/?amount=<amount>&share=<share>&id=<id>' }
      var props = { value: 'https://google.com' }
      return QRGenerator(props)
    }
  },
  computed: {
    insufficientBalance () {
      const hasValidBalance = this.formData.sourceToken.balance >= 0
      if (!hasValidBalance) return true

      return this.formData.sourceToken.balance < this.formData.amount
    }
  }
}
</script>

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
                @click="splitSecret"
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
                @click="generateAddress()"
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
// import { Wallet, storeMnemonic, generateMnemonic } from '../../wallet'
// import { addresses } from 'src/wallet/hopcash/config'
// import { mnemonicToSeed } from '@ethersproject/hdnode'
import { ECPair } from '@psf/bitcoincashjs-lib'
import { toHex } from 'hex-my-bytes'
import { formatsByName, formatsByCoinType } from '@ensdomains/address-encoder'

// const sBCHWalletType = 'Smart BCH'

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
        shares: []
      },
      generatingAddress: false,
      walletType: ''
    }
  },
  methods: {
    // method for splitting private key to 3 shares
    splitSecret () {
      const pk = this.generatePrivateKey()
      const sss = require('shamirs-secret-sharing')
      const secret = Buffer.from(pk)
      const shares = sss.split(secret, { shares: 3, threshold: 2 })
      // console.log(toHex(shares[0]))
      console.log(pk)
      this.shares = shares.map((share) => { return toHex(share) })
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
      /* Notify.create({
        message: keyPair.toWIF()
      }) */
    },

    // method for generating address derived from supposed one share of the private key
    generateAddress () {
      // const share = this.generatePrivateKey()
      const data = formatsByName.BCH.decoder(this.base58())
      // const data = formatsByName.BCH.decoder(this.generatePrivateKey.toString())
      // const data = (this.shares[0].toString())
      console.log(data)
      const addr = formatsByCoinType[0].encoder(data)
      console.log(addr)
      return addr
    },

    // method for validating if address is of bitcoin cash (legacy address)
    bchValid () {
      var bchaddr = require('bchaddrjs')
      // var isValidAddress = bchaddr.isValidAddress
      var isLegacyAddress = bchaddr.isLegacyAddress
      // console.log(this.base58())
      console.log(isLegacyAddress(this.generateAddress()))
      // console.log(isValidAddress(this.generateAddress()))
      // return isValidAddress
      return isLegacyAddress
    },

    // method for converting share[0] (hex) to base58 format
    base58 () {
      const check = require('base58check')
      const data = this.shares[0].toString()
      const done = check.encode(data)
      // const orig = check.decode(done, 'hex')
      console.log(done)
      return done
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

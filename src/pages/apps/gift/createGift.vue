<template>
  <div class="static-container">
    <div
      dense
      id="app-container"
      style="background-color: #ECF3F3; min-height: 100vh;"
      class="flex flex-center"
      :class="{ 'pt-dark': darkMode }"
    >
      <HeaderNav
        title="Gifts"
        backnavpath="/apps/chooseGift"
        style="position: fixed; top: 0; background: #ECF3F3; width: 100%; z-index: 100 !important;"
        class="q-px-sm"
      />
    <div class="q-pa-lg" style="width: 20%">
      <div class="q-pt-xl">
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
              <q-btn
                no-caps
                rounded
                color="blue-9"
                type="submit"
                label="Generate"
                @click="splitSecret(), card = true"
                class="flex flex-center"
              >
              </q-btn>
              <div class="q-pa-sm q-pb-lg"></div>
<!--               <q-btn
                no-caps
                rounded
                color="blue-9"
                type="submit"
                label="recover"
                @click="recoverSecret()"
              >
              </q-btn> -->
        </div>
        <q-dialog v-model="card" no-backdrop-dismiss full-height>
          <q-card class="my-card" >
            <q-card-section>
              <div class="flex flex-center">
                <canvas id="canvas" class="flex flex-center"></canvas>
                </div>
              </q-card-section>
              <q-card-section>
                <div>
                  <div @click="copyToClipboard(this.cashAdd)"> {{ this.cashAdd }}</div>
                </div>
              <!-- </div> -->
            </q-card-section>
          </q-card>
        </q-dialog>
    </div>
  </div>
  </div>
  </div>
</template>
<script>

// import HeaderNav from '../../components/header-nav'
import HeaderNav from '../../../components/header-nav'
// import { Notify } from 'quasar'
import { ECPair } from '@psf/bitcoincashjs-lib'
import { toHex } from 'hex-my-bytes'
// import { formatsByName, formatsByCoinType } from '@ensdomains/address-encoder'
// import { QRGenerator } from 'dynamic-qr-code-generator'
import { getMnemonic, Wallet } from '../../../wallet'
import { ref } from 'vue'

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
      input: {
        amount: '',
        instance: '',
        campID: '',
        quantity: '100',
        maxPerAddress: '',
        shares: [],
        pk: '',
        wallet: '',
        txid: ''
      },
      generatingAddress: false,
      walletType: '',
      card: ref(false),
      cashAdd: null
    }
  },
  methods: {
    // method for splitting private key to 3 shares
    async splitSecret () {
      this.pk = this.generatePrivateKey()
      this.cashAdd = this.convertToCashAddress(this.pk)
      console.log(this.pk)
      console.log(this.cashAdd)
      const sss = require('shamirs-secret-sharing')
      const secret = Buffer.from(this.pk)
      const shares = sss.split(secret, { shares: 3, threshold: 2 })
      this.shares = shares.map((share) => { return toHex(share) })
      this.handleSubmit(this.cashAdd)
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
      // console.log(cAddress)
      return cAddress
    },

    // generate qr code
    qrCode () {
      const key = this.pk
      const QRCode = require('qrcode')
      const canvas = document.getElementById('canvas')
      QRCode.toCanvas(canvas, key, function (error) {
        if (error) console.error(error)
        console.log('success!')
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
    // send bch to generated wallet
    async handleSubmit (cAdd) {
      const vm = this
      const address = cAdd
      vm.wallet.BCH.sendBch(vm.input.amount, address).then(function (result, err) {
        if (result.success) {
          vm.input.txid = result.txid
        } else {
          console.error(err)
        }
      })
    }
  },
  computed: {
    getAddress () {
      const address = this.cashAdd
      return address
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

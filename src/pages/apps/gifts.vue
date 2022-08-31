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
            type="text"
          >
          </q-input>
          <div class="q-pa-md">
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
          >
          </q-input>
          <div class="q-pa-md">
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
          <div class="q-pa-md">
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
            <div class="q-pa-md q-pt-lg flex flex-center" >
              <q-btn
                no-caps
                rounded
                color="blue-9"
                label="Generate"
                type="submit"
                :disable="handshakeOnProgress"
                @click="recoverSecret()"
              >
              </q-btn>
<!-- <q-btn
  no-caps
  rounded
  color="blue-9"
  label="wallet"
  type="submit"
  :disable="handshakeOnProgress"
  @click="createWallets"
  >
  </q-btn
> -->
            <div>
          </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script>

import HeaderNav from '../../components/header-nav'
import { Notify } from 'quasar'
// import { Wallet, storeMnemonic, generateMnemonic } from '../../wallet'
// import { addresses } from 'src/wallet/hopcash/config'
// import { mnemonicToSeed } from '@ethersproject/hdnode'

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
        maxPerAddress: ''
      },
      generatingAddress: false,
      walletType: ''
    }
  },
  methods: {
    splitSecret () {
      const sss = require('shamirs-secret-sharing')
      const secret = Buffer.from('qz7xc0vl85nck65ffrsx5wvewjznp9lflgktxc5878')
      const shares = sss.split(secret, { shares: 3, threshold: 2 })
      return shares
    /*     Notify.create({
        message: shares[0].toString()
      }) */
    },
    recoverSecret () {
      const sss = require('shamirs-secret-sharing')
      const recovery = sss.combine(this.splitSecret())
      Notify.create({
        message: recovery.toString()
      })
    }
  }
}
</script>

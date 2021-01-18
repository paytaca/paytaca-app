<template>
  <div>
    <div class="row">
        <div class="col q-mt-md q-pl-md text-center q-pr-md">
          <router-link :to="{ path: '/'}">
            <i class="material-icons q-mt-sm icon-arrow-left" style="font-size: 35px; float: left; color: #3b7bf6;">arrow_back</i>
          </router-link>
          <p class="text-center select q-mt-sm text-token" style="font-size: 22px;">
            SEND
          </p>
        </div>
    </div>
    <div class="q-pa-md">
      <div v-if="scanner.error" class="text-center bg-red-1 text-red q-pa-lg">
        <q-icon name="error" left/>
        {{ scanner.error }}
      </div>
      <div>
      <qrcode-stream
        v-if="scanner.show"
        :camera="scanner.frontCamera ? 'front': 'auto'"
        @decode="onDecode"
        @init="onInit"
      >
        <div
          :style="{
            position: 'absolute',
            bottom: '1rem',
            right: '1rem'
          }"
        >
          <q-btn
            rounded
            padding="xs"
            :icon="scanner.frontCamera ? 'camera_rear': 'camera_front'"
            @click="scanner.frontCamera = !scanner.frontCamera"
          />
        </div>
      </qrcode-stream>
      </div>
      <div class="row justify-around q-my-sm">
        <q-btn
          no-caps
          icon="qr_code_scanner"
          :label="scanner.show ? 'Cancel': 'Scan QR code'"
          @click="scanner.show = !scanner.show"
        />
      </div>
      <div class="q-pa-md text-center text-weight-medium">
        {{ scanner.decodedContent }}
      </div>
    </div>
    <div class="q-px-lg">
      <q-form class="q-pa-sm" @submit="() => sendData.isSendingBCH ? submitBCHSend() : submitSendToken()">
        <q-input
          label="Amount"
          stack-label
          :suffix="sendData.isSendingBCH ? 'BCH': tokenStats.symbol"
          :readonly="sendData.sent"
          v-model="sendData.amount"
          :rules="[
            val => (val && val > 0) || 'Invalid amount'
          ]"
        />
        <q-field
          label="Send to"
          stack-label
          :readonly="sendData.sent"
          v-model="sendData.recipientAddress"
          reactive-rules
          :rules="[
            validators.isValidAddress
          ]"
        >
          <template v-slot:control="{value}">
            <div class="text-nowrap">
              <span v-if="value.length > 25">
                {{ value.substr(0, 20) }}....{{ value.substr(-4) }}
              </span>
              <span v-else>
                {{ value }}
              </span>
            </div>
          </template>
        </q-field>
        <div class="row justify-center q-px-md q-py-sm">
          <q-btn
            no-caps
            :loading="sendData.sending"
            :disable="sendData.sent"
            color="teal"
            type="submit"
            label="Send"
          />
        </div>
      </q-form>
    </div>
    <q-dialog v-model="showSendSuccessDialog">
      <q-card>
        <q-card-section>
          <div class="row justify-center items-center">
            <q-icon
              name="done"
              size="2rem"
              color="teal"
              class="font-weight-medium"
            />
            Success!
          </div>
          <q-item>
            <q-item-section>
              <q-item-label>
                {{ (Array.isArray(sendData.txid) ? sendData.txid[0] :sendData.txid) || '######################' }}
              </q-item-label>
              <q-item-label caption>
                Transaction ID
              </q-item-label>
            </q-item-section>
          </q-item>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- <router-link to="send" class="row q-pl-lg q-pr-lg q-pt-sm q-pb-sm token-link">
      <div style="background-color: gray; padding: 3px 5px 4px 5px; border-radius: 4px"><q-icon class="color-light-gray icon-size" :name="fasQrcode" /></div>
      <div class="col q-pl-sm q-pr-sm token-name-container">
        <p class="q-ma-none text-token"><b>BCH</b></p>
      </div>
    </router-link>
    <router-link to="send" class="row q-pl-lg q-pr-lg q-pt-sm q-pb-sm token-link">
      <div style="background-color: gray; padding: 3px 5px 4px 5px; border-radius: 4px"><q-icon class="color-light-gray icon-size" :name="fasWallet" /></div>
      <div class="col q-pl-sm q-pr-sm token-name-container">
        <p class="q-ma-none text-token"><b>SPICE</b></p>
      </div>
    </router-link> -->
  </div>
</template>

<script>
import walletUtils from '../../utils/common.js'
import sendBCH from '../../utils/send-bch.js'
import sendToken from '../../utils/send-slp-token.js'
import { QrcodeStream } from 'vue-qrcode-reader'
import { fasQrcode, fasWallet } from '@quasar/extras/fontawesome-v5'

const bchjs = walletUtils.getBCHJS(walletUtils.NET_MAINNET)

export default {
  name: 'Send-page',

  components: {
    QrcodeStream
  },

  props: {
    assetId: {
      // assetId will determine whether to send an slp token or bch
      // no assetId means that bch is intended to be sent
      type: String,
      required: false
    }
  },

  data () {
    return {
      showSendSuccessDialog: false,

      fetchingTokenStats: false,
      tokenStats: null,

      scanner: {
        show: false,
        frontCamera: false,
        error: '',
        decodedContent: ''
      },

      sendData: {
        sent: false,
        sending: false,
        success: false,
        error: '',
        txid: '',

        isSendingBCH: true,
        tokenId: '',
        amount: null, // this will be in terms of bch or the token specified
        recipientAddress: '',
      }
    }
  },

  computed: {
    address () {
      return this.$store.getters['global/address']
    },

    validators () {
      return {
        isValidAddress: (val) => {
          try {
            return bchjs.Address.isCashAddress(val) || ''
          } catch (err) {
            return 'Invalid address'
          }
        },

        isValidCashAddress: (val) => {
          try {
            // need to check if slp address or not because .isCashAddress() seems to validate slp addresses
            return (bchjs.Address.isCashAddress(val) && !bchjs.SLP.Address.isSLPAddress(val)) || 'Not a valid cash address'
          } catch (err) {
            return 'Invalid address'
          }
        },

        isValidSLPAddress (val) {
          try {
            console.log('validating slp address')
            return bchjs.SLP.Address.isSLPAddress(val) || 'Not a valid SLP address'
          } catch (err) {
            return 'Invalid address'
          }
        }
      }
    }
  },

  methods: {
    fetchTokenStats () {
      if (!this.assetId) return Promise.reject()

      return this.$store.dispatch('assets/getSLPTokenStats', {tokenId: this.assetId})
        .then(tokenStats => {
          this.tokenStats = tokenStats
          return Promise.resolve()
        })
    },

    onDecode(content) {
      this.sendData.recipientAddress = content
    },

    onInit(promise) {
      promise
        .then(() => {
          console.log('Successfully initilized! Ready for scanning now!')
          this.scanner.error = ''
        })
        .catch(error => {
          this.scanner.show = false
          if (error.name === 'NotAllowedError') {
            this.scanner.error = 'Permission required to access to camera'
            // this.scanner.error = 'Hey! I need access to your camera'
          } else if (error.name === 'NotFoundError') {
            this.scanner.error = 'No camera found on this device'
            // this.scanner.error = 'Do you even have a camera on your device?'
          } else if (error.name === 'NotSupportedError') {
            this.scanner.error = 'Unable to acccess camera in non-secure context'
            // this.scanner.error = 'Seems like this page is served in non-secure context (HTTPS, localhost or file://)'
          } else if (error.name === 'NotReadableError') {
            this.scanner.error = 'Unable to access camera.'
            // this.scanner.error = 'Couldn\'t access your camera. Is it already in use?'
          } else if (error.name === 'OverconstrainedError') {
            this.scanner.frontCamera = false
            this.scanner.error = 'Constraints don\'t match any installed camera. Did you ask for the front camera although there is none?'
          } else {
            this.scanner.error = 'Unknown error: ' + error.message
          }
        })
    },

    submitBCHSend () {
      this.sendData.sending = true
      this.sendData.sent = true
      sendBCH(
        walletUtils.parseAddress(this.address, walletUtils.ADDR_CASH),
        this.$aes256.decrypt(this.$store.getters['global/getWIF'](this.address)),
        walletUtils.parseAddress(this.sendData.recipientAddress, walletUtils.ADDR_CASH),
        this.sendData.amount,
      )
        .finally(() => {
          this.sendData.sending = false
        })
        .then(res => {
          this.showSendSuccessDialog = true
          this.sendData.success = true
          this.sendData.txid = res
        })
        .catch(err => {
          this.sendData.success = false
          this.sendData.error = err
        })
    },

    submitSendToken () {
      this.sendData.sending = true
      this.sendData.sent = true

      sendToken(
        walletUtils.parseAddress(this.address, walletUtils.ADDR_SLP),
        this.$aes256.decrypt(this.$store.getters['global/getWIF'](this.address)),
        walletUtils.parseAddress(this.sendData.recipientAddress, walletUtils.ADDR_SLP),
        this.sendData.tokenId,
        this.sendData.amount
      )
        .finally(() => {
          this.sendData.sending = false
        })
        .then(res => {
          this.showSendSuccessDialog = true
          this.sendData.success = true
          this.sendData.txid = res
        })
        .catch(err => {
          this.sendData.success = false
          this.sendData.error = err
        })
    }
  },

  mounted () {
    if (this.assetId) {
      console.log('got token id')
      this.fetchTokenStats()
        .then(() => {
          console.log('token stats fetch success')
          this.sendData.isSendingBCH = false
          this.sendData.tokenId = this.tokenStats.id
        })
    }
  },

  created () {
    this.fasQrcode = fasQrcode
    this.fasWallet = fasWallet
  }
}
</script>

<style lang="scss">
  .color-light-gray {
    color: #444646;
  }
  .icon-size {
    font-size: 18px;
  }
  .token-name-container {
    padding-top: 2px;
  }
  .asset {
    color: #B4BABA;
    position: absolute;
  }
  .icon-arrow-left {
    position: absolute;
    left: 20px;
    color: #3992EA;
  }
  .icon-size-1 {
    font-size: 26px;
  }
  .slp_tokens {
    color: #636767;
  }
  .token-link {
    color: #000;
    text-decoration: none;
  }
  .text-token {
    color: #444646;
  }
</style>

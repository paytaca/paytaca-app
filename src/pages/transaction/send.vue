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
      <div class="qrcode-stream-container q-pa-lg" v-if="scanner.show">
        <qrcode-stream class="qrocode-stream"
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
            <q-btn color="#fff"
              rounded
              padding="xs"
              :icon="scanner.frontCamera ? 'camera_rear': 'camera_front'"
              @click="scanner.frontCamera = !scanner.frontCamera"
            />
          </div>
        </qrcode-stream>
      </div>
      <div class="row justify-around q-my-lg" v-if="sendData.recipientAddress === ''">
        <button class="btn-scanner" @click="scanner.show = !scanner.show">
          <b>{{ scanner.show ? 'Cancel': 'Scan QR code' }}</b>
          <i class="q-ml-sm mdi" :class="[scanner.show ? 'mdi-close-circle': 'mdi-data-matrix-scan']"></i>
        </button>
        <!-- <q-btn
          no-caps
          icon="qr_code_scanner"
          :label="scanner.show ? 'Cancel': 'Scan QR code'"
          @click="scanner.show = !scanner.show"
        /> -->
      </div>
      <div class="q-pa-md text-center text-weight-medium">
        {{ scanner.decodedContent }}
      </div>
    </div>
    <!-- <div class="send-input-fields"> -->
      <div class="q-px-lg" v-if="sendData.recipientAddress !== ''">
        <form class="q-pa-sm" @submit="() => sendData.isSendingBCH ? submitBCHSend() : submitSendToken()">
          <div class="row">
            <div class="col q-mt-sm">
              <label class="get-started-text"><b>Amount</b></label>
              <input type="number" step="0.0001" class="form-input form-input-amount q-mt-xs text-right" @keyup="swipeConfirm" v-model="sendData.amount" :readonly="sendData.sent">
            </div>
          </div>
          <div class="row">
            <div class="col q-mt-sm se">
              <label class="get-started-text"><b>Send to</b></label>
              <input type="text" class="form-input q-mt-xs text-right q-pl-md q-pr-md" v-model="sendData.recipientAddress" :readonly="sendData.sent">
            </div>
          </div>
          <div class="row">
            <div class="col q-mt-sm se">
              <button class="submit-btn q-mt-md" style="background: #3b7bf6; font-size: 18px;" @click="()=>{offlineMessage=true}">Send</button>
            </div>
          </div>
          <!-- <div class="row" v-if="sendData.amount !== null">
            <div class="col q-pt-md">
              <button type="submit" class="btn-send-submit"><b>Send</b>&nbsp;<i class="mdi mdi-send"></i></button>
            </div>
          </div> -->
        </form>
        <!-- <q-form class="q-pa-sm" @submit="() => sendData.isSendingBCH ? submitBCHSend() : submitSendToken()">
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
        </q-form> -->
      </div>
    <!-- </div> -->
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

    <offline-pop-message v-if="offlineMessage"/>
    <online-pop-message v-if="onlineMessage"/>

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

    <!-- <div class="confirmation-slider" ref="confirmation-slider" v-if="sendData.amount !== null">
      <div id="status">
        <label class="swipe-confrim-label">Swipe to confirm</label>

        <input id="confirm" type="range" value="0" min="0" max="100" @change="tiggerRange" ref="swipe-submit">
        <span class="mdi mdi-arrow-right-circle" style="position: absolute; z-index: 1000; bottom: 20px; right: 20px: "></span>
  
      </div>
    </div> -->
  </div>
</template>

<script>
import walletUtils from '../../utils/common.js'
import sendBCH from '../../utils/send-bch.js'
import sendToken from '../../utils/send-slp-token.js'
import { QrcodeStream } from 'vue-qrcode-reader'
import { fasQrcode, fasWallet } from '@quasar/extras/fontawesome-v5'
import OnlinePopMessage from '../../components/OnlinePopMessage.vue'
import OfflinePopMessage from '../../components/OfflinePopMessage.vue'

const bchjs = walletUtils.getBCHJS(walletUtils.NET_MAINNET)

export default {
  name: 'Send-page',

  components: {
    QrcodeStream,
    OnlinePopMessage,
    OfflinePopMessage
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
      },

      offlineMessage: false,
      onlineMessage: false
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
      this.scanner.show = !this.scanner.show
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
    },
    swipeConfirm (event) {
      this.$refs['confirmation-slider'].style.display = this.sendData.amount !== null ? 'block' : 'none';
      this.$refs['confirmation-slider'].style.display = this.sendData.amount !== '' ? 'block' : 'none';
    },
    tiggerRange () {
      // alert(this.$refs['swipe-submit'].value)
      if(this.$refs['swipe-submit'].value > 99) {
        this.sendData.isSendingBCH ? this.submitBCHSend() : this.submitSendToken()
      }
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
  .qrcode-stream-container {
    background-image: linear-gradient(to right bottom, #3b7bf6, #a866db, #da53b2, #ef4f84, #ed5f59);
    border-radius: 20px;
  }
  .qrocode-stream {
    height: 300px !important;
    border-radius: 20px !important;
  }
  .swipe-confrim-label {
    position: absolute;
    color: #fff !important;
    margin-top: 5px;
    display: block;
    font-size: 18px;
    top: 12px;
    right: 16px;
  }
  .confirmation-slider {
    position: fixed;
    bottom: 0px;
    width: 100%;
    border: 1px solid #fff;
    text-align:center;
  }
  #status {
    height:62px;
    background-image: linear-gradient(to right bottom, #3b7bf6, #a866db, #da53b2, #ef4f84, #ed5f59);
  }

  @keyframes fadein {
    from{ opacity:0; }
    to{ opacity:1; }
  }

  .delete-notice { display:none; user-select:none; font-size:20px; line-height:50px; color:#ED4545; animation:fadein 4s ease; }

  #confirm {
    appearance:none!important;
    background:transparent;
    height:62px;
    padding:0 5px;
    width:100%;
  }

  #confirm::-webkit-slider-thumb {
    appearance:none!important;
    height:48px;
    width:160px;
    border:3px solid rgba(60, 100, 246, .6);
    border-radius:24px;
    cursor:e-resize;
    background: no-repeat no-repeat;
    background-image: linear-gradient(to right bottom, #3b7bf6, #a866db, #da53b2, #ef4f84, #ed5f59);
   }

  #confirm:hover::-webkit-slider-thumb {
    border:3px solid rgba(60, 100, 246, .5);
  }
  .form-input {
    width: 100%;
    height: 38px;
    border-radius: 18px;
    border: 1px solid #008BF1;
    outline: 0;
    text-overflow: ellipsis;
  }
  .form-input:focus {
    border-color: #89BFF4;
    box-shadow: 0px 0px 2px 2px rgba(137, 191, 244, .5);
  }
  .form-input-amount {
    padding-right: 14px;
  }
  .send-input-fields {
    border-top-left-radius: 22px;
    border-top-right-radius: 22px;
    background-color: #fff;
    /*display: none;*/
  }
  .btn-scanner {
    border-radius: 20px;
    outline: none;
    border: none;
    height: 40px;
    padding-left: 20px;
    padding-right: 20px;
    color: #fff;
    background-color: rgb(60, 100, 246) !important;
  }
  .btn-send-submit {
    border-radius: 20px;
    outline: none;
    border: none;
    height: 40px;
    width: 100%;
    color: #fff;
    box-shadow: 1px 2px 2px 1px rgba(99, 103, 103, .2);
    background-image: linear-gradient(to right bottom, #3b7bf6, #a866db, #da53b2, #ef4f84, #ed5f59);
  }
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

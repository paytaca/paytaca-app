<template>
  <div class="static-container">
    <QrScanner
      v-model="showQrScanner"
      @decode="onScannerDecode"
    />
    <QRUploader ref="qr-upload" @detect-upload="onScannerDecode" />
    <div id="app-container" class="sticky-header-container" :class="getDarkModeClass(darkMode)">
      <div>
        <header-nav :title="$t(`${action}Gift`)" backnavpath="/apps/gifts" />
        <div :style="{ 'padding-top': $q.platform.is.ios ? '85px' : '60px'}">
          <div id="app" ref="app" :class="{'text-black': !darkMode}">
            <div v-if="processing" style="text-align: center; padding-top: 25px;">
              <p>{{ $t(`${action}ingGift`) }}</p>
              <progress-loader />
            </div>
            <q-form v-if="!processing && !completed" class="text-center" style="margin-top: 25px;">
              <textarea
                v-model="scannedShare"
                rows="2"
                :placeholder="$t('PasteGiftCodeHere')"
                class="full-width text-black bg-white rounded-borders text-subtitle1 q-px-sm"
                :disabled="error"
              >
              </textarea>
              <br>
              <template v-if="!scannedShare">
                <div style="margin-top: 20px; margin-bottom: 20px; font-size: 15px; color: grey;">
                  {{ $t('or') }}
                </div>
                <div class="row items-center justify-around">
                  <q-btn
                    round
                    size="lg"
                    class="btn-scan button text-white bg-grad"
                    icon="mdi-qrcode"
                    @click="showQrScanner = true"
                  />
                  <q-btn
                    round
                    size="lg"
                    class="btn-scan button text-white bg-grad"
                    icon="upload"
                    @click="$refs['qr-upload'].$refs['q-file'].pickFiles()"
                  />
                </div>
              </template>
              <div style="margin-top: 20px;">
                <q-btn color="primary" v-if="scannedShare.length > 0 && !error" @click.prevent="claimGift(null)">
                  {{ $t(action) }}
                </q-btn>
              </div>
            </q-form>
            <div class="text-center q-pt-md">
              <p v-if="bchAmount" style="font-size: 24px;">{{ $t('Amount') }}:<br>{{ getAssetDenomination(denomination, bchAmount) }}</p>
              <p v-if="completed" style="color: green; font-size: 20px;">{{ $t(`${action}GiftCompleted`) }}</p>
              <p v-if="error" style="color: red; font-size: 20px;">
                {{ error }}
              </p>
              <q-btn
                v-if="completed || error"
                class="q-mt-md button"
                @click="$router.push('/')"
              >
                {{ $t("GoToHome") }}
              </q-btn>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { markRaw } from '@vue/reactivity'
import axios from 'axios'
import sha256 from 'js-sha256'
import HeaderNav from '../../../components/header-nav'
import ProgressLoader from '../../../components/ProgressLoader'
import SweepPrivateKey from '../../../wallet/sweep'
import QrScanner from '../../../components/qr-scanner.vue'
import { getMnemonic, Wallet } from '../../../wallet'
import { getAssetDenomination } from 'src/utils/denomination-utils'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import QRUploader from 'src/components/QRUploader'

const aesjs = require('aes-js')
const pbkdf2 = require('pbkdf2')

export default {
  name: 'sweep',
  props: {
    actionProp: {
      type: String,
      default: 'Claim'
    },
    giftCodeHash: String,
    claimShare: String,
    localShare: String,
    code: {
      type: String,
      default: ''
    }
  },
  components: {
    HeaderNav,
    ProgressLoader,
    QrScanner,
    QRUploader
  },
  data () {
    return {
      action: 'Claim',
      wallet: null,
      sweeper: null,
      bchAmount: null,
      scannedShare: '',
      processing: false,
      completed: false,
      error: null,
      showQrScanner: false
    }
  },
  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    denomination () {
      return this.$store.getters['global/denomination']
    },
    theme () {
      return this.$store.getters['global/theme']
    }
  },
  methods: {
    getAssetDenomination,
    getDarkModeClass,
    decryptShard(encryptedHex, password) {
      const key = pbkdf2.pbkdf2Sync(password, '_saltDefault2024', 1, 128 / 8, 'sha512')
      const encryptedBytes = aesjs.utils.hex.toBytes(encryptedHex)
      const aesCtr = new aesjs.ModeOfOperation.ctr(key)
      const decryptedBytes = aesCtr.decrypt(encryptedBytes)
      var decryptedText = aesjs.utils.utf8.fromBytes(decryptedBytes)
      return decryptedText
    },
    claimGift (giftCodeHash) {
      const vm = this
      vm.processing = true
      const sss = require('shamirs-secret-sharing')
      let giftCode
      if (!giftCodeHash) {
        if (this.scannedShare.split('?code=').length === 2) {
          giftCode = this.scannedShare.split('?code=')[1]
        } else {
          giftCode = this.scannedShare
        }
        giftCodeHash = sha256(giftCode)
      }

      if (vm.action === 'Recover') {
        giftCode = vm.localShare
      }
      const url = `https://gifts.paytaca.com/api/gifts/${giftCodeHash}/${vm.action.toLowerCase()}`
      const walletHash = this.wallet.BCH.getWalletHash()
      axios.post(url, { wallet_hash: walletHash }).then((resp) => {
        const share1 = resp.data.share
        let share2
        if (resp.data.encrypted_share) {
          share2 = this.decryptShard(resp.data.encrypted_share, giftCode)
        } else {
          share2 = giftCode
        }

        let privateKey
        try {
          privateKey = sss.combine([share1, share2])
        } catch (error) {
          // fallback for when sss.combine causes an error because share2 was
          // not decrypted successfully and thus contains unreadable characters
          // when recovering gift
          privateKey = sss.combine([share1, giftCode])
        }
        vm.sweeper = new SweepPrivateKey(privateKey.toString())
        vm.sweeper.getBchBalance().then(function (data) {
          vm.bchAmount = data.spendable || 0
          if (vm.bchAmount > 0) {
            vm.sweeper.sweepBch(
              vm.sweeper.bchAddress,
              privateKey.toString(),
              vm.bchAmount,
              vm.$store.getters['global/getAddress']('bch')
            )
            if (vm.action === 'Recover') {
              vm.$store.dispatch('gifts/deleteGift', giftCodeHash)
            }

            vm.wallet.BCH.getBalance().then(function (response) {
              vm.$store.commit('assets/updateAssetBalance', {
                id: 'bch',
                balance: response.balance,
                spendable: response.spendable
              })
            })

            vm.completed = true
          } else {
            vm.error = vm.$t('GiftAlreadyClaimed')
          }
          vm.processing = false
        })
      }).catch((error) => {
        console.log(error)
        vm.error = error?.response?.data?.message
        vm.processing = false
      })
    },
    async onScannerDecode (content) {
      this.showQrScanner = false
      const code = Array.isArray(content) ? content[0].rawValue : content
      if (code.split('?code=').length === 2) {
        this.scannedShare = code.split('?code=')[1]
      } else {
        this.scannedShare = code
      }
      this.claimGift(null)
    }
  },
  async mounted () {
    const vm = this

    const divHeight = screen.availHeight - 120
    vm.$refs.app.setAttribute('style', 'height:' + divHeight + 'px;')

    if (vm.actionProp) {
      vm.action = vm.actionProp
    }

    await getMnemonic(vm.$store.getters['global/getWalletIndex']).then(function (mnemonic) {
      vm.wallet = markRaw(new Wallet(mnemonic))
      if (vm.action === 'Recover') {
        vm.claimGift(vm.giftCodeHash)
      } else if (vm.claimShare) {
        vm.scannedShare = vm.claimShare
        vm.claimGift(null)
      }
    })

    // check if code is not empty (from qr reader redirection)
    if (vm.code !== '') {
      vm.scannedShare = vm.code.split('=')[1]
      vm.claimGift(null)
    }
  }
}
</script>

<style scoped>
  #app {
    padding: 25px;
    overflow-y: auto;
    z-index: 1 !important;
    min-height: 100vh;
  }
  .btn-scan {
    background-image: linear-gradient(to right bottom, #3b7bf6, #3681e8, #318bda, #2c95cc, #279fbe);
    color: white;
  }
</style>

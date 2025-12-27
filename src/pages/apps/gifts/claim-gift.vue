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
    async getRecipientAddress(walletType = 'bch') {
      // Get address from the current wallet instance instead of global store
      // to ensure we use the correct wallet in multi-wallet setup
      if (!this.wallet) return null
      
      const lastAddressIndex = this.$store.getters['global/getLastAddressIndex'](walletType)
      const wallet = walletType === 'slp' ? this.wallet.SLP : this.wallet.BCH
      
      try {
        const addressSet = await wallet.getAddressSetAt(lastAddressIndex)
        return addressSet.receiving
      } catch (error) {
        console.error('Error getting recipient address:', error)
        return null
      }
    },
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
      vm.error = null
      
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
      
      const sharesUrl = `https://gifts.paytaca.com/api/gifts/${giftCodeHash}/`
      const claimUrl = `https://gifts.paytaca.com/api/gifts/${giftCodeHash}/${vm.action.toLowerCase()}`
      const walletHash = this.wallet.BCH.getWalletHash()
      
      // First API call: Get shares from dedicated endpoint
      axios.get(sharesUrl).then(async (resp) => {
        if (!resp.data?.share) {
          vm.error = resp.data?.message || vm.$t('FailedToGetShares', {}, 'Failed to get gift shares')
          vm.processing = false
          return
        }
        
        const share1 = resp.data.share
        
        let share2
        if (resp.data.encrypted_share) {
          try {
            share2 = this.decryptShard(resp.data.encrypted_share, giftCode)
          } catch (decryptError) {
            vm.error = vm.$t('DecryptFailed', {}, 'Failed to decrypt gift share')
            vm.processing = false
            return
          }
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
          try {
            privateKey = sss.combine([share1, giftCode])
          } catch (fallbackError) {
            vm.error = vm.$t('ShareCombinationFailed', {}, 'Failed to combine gift shares')
            vm.processing = false
            return
          }
        }
        
        vm.sweeper = new SweepPrivateKey(privateKey.toString())
        
        try {
          const balanceData = await vm.sweeper.getBchBalance()
          vm.bchAmount = balanceData.spendable || 0
          
          if (vm.bchAmount > 0) {
            const recipientAddress = await vm.getRecipientAddress('bch')
            
            if (!recipientAddress) {
              vm.error = vm.$t('FailedToGetAddress', {}, 'Failed to get recipient address')
              vm.processing = false
              return
            }
            
            // Create transaction without broadcasting
            const sweepResult = await vm.sweeper.sweepBch(
              vm.sweeper.bchAddress,
              privateKey.toString(),
              vm.bchAmount,
              undefined, // feeFunder
              recipientAddress,
              false // broadcast = false
            )
            
            if (!sweepResult.success) {
              vm.error = sweepResult.error || vm.$t('SweepFailed', {}, 'Failed to create transaction')
              vm.processing = false
              return
            }
            
            // Extract transaction hex
            const transactionHex = sweepResult.transaction
            if (!transactionHex) {
              vm.error = vm.$t('TransactionHexMissing', {}, 'Failed to get transaction hex')
              vm.processing = false
              return
            }
            
            // Second API call: Submit transaction_hex to record claim/recover
            const claimResp = await axios.post(claimUrl, {
              wallet_hash: walletHash,
              transaction_hex: transactionHex
            })
            
            // Handle API response
            if (claimResp.data.success) {
              vm.completed = true
            } else {
              vm.error = claimResp.data.message || vm.$t('ClaimFailed', {}, 'Failed to claim gift')
            }
          } else {
            vm.error = vm.$t('GiftAlreadyClaimed')
          }
        } catch (error) {
          // Handle errors from transaction creation or claim submission
          if (error.response?.data?.error) {
            vm.error = error.response.data.error
          } else if (error.response?.data?.message) {
            vm.error = error.response.data.message
          } else if (error.message) {
            vm.error = error.message
          } else {
            vm.error = vm.$t('ClaimFailed', {}, 'Failed to claim gift')
          }
        }
        
        vm.processing = false
      }).catch((error) => {
        // Handle 404 and other errors from the shares endpoint
        if (error.response?.status === 404 || error.response?.data?.error) {
          vm.error = error.response.data.error || error.response.data.message || vm.$t('GiftDoesNotExist', {}, 'Gift does not exist')
        } else {
          vm.error = error?.response?.data?.message || error?.response?.data?.error || error?.message || vm.$t('ClaimFailed', {}, 'Failed to claim gift')
        }
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

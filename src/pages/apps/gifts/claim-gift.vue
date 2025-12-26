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
      console.log('[Gift Claiming] Starting gift claim process...')
      console.log('[Gift Claiming] Action:', vm.action)
      console.log('[Gift Claiming] Scanned share length:', this.scannedShare?.length)
      
      const sss = require('shamirs-secret-sharing')
      let giftCode
      if (!giftCodeHash) {
        if (this.scannedShare.split('?code=').length === 2) {
          giftCode = this.scannedShare.split('?code=')[1]
          console.log('[Gift Claiming] Extracted gift code from URL parameter')
        } else {
          giftCode = this.scannedShare
          console.log('[Gift Claiming] Using scanned share directly as gift code')
        }
        giftCodeHash = sha256(giftCode)
        console.log('[Gift Claiming] Computed gift code hash:', giftCodeHash)
      } else {
        console.log('[Gift Claiming] Using provided gift code hash:', giftCodeHash)
      }

      if (vm.action === 'Recover') {
        giftCode = vm.localShare
        console.log('[Gift Claiming] Recovery mode - using localShare as gift code')
        console.log('[Gift Claiming] Local share length:', giftCode?.length)
      }
      
      console.log('[Gift Claiming] Gift code length:', giftCode?.length)
      console.log('[Gift Claiming] Gift code (first 20 chars):', giftCode?.substring(0, 20))
      
      const url = `https://gifts.paytaca.com/api/gifts/${giftCodeHash}/${vm.action.toLowerCase()}`
      const walletHash = this.wallet.BCH.getWalletHash()
      console.log('[Gift Claiming] Fetching shares from server...')
      console.log('[Gift Claiming] URL:', url)
      console.log('[Gift Claiming] Wallet hash:', walletHash)
      
      axios.post(url, { wallet_hash: walletHash }).then((resp) => {
        console.log('[Gift Claiming] Server response status:', resp.status)
        console.log('[Gift Claiming] Server response data:', {
          has_share: !!resp.data.share,
          share_length: resp.data.share?.length,
          has_encrypted_share: !!resp.data.encrypted_share,
          encrypted_share_length: resp.data.encrypted_share?.length
        })
        
        const share1 = resp.data.share
        console.log('[Gift Claiming] Share[1] from server length:', share1?.length)
        console.log('[Gift Claiming] Share[1] (first 20 chars):', share1?.substring(0, 20))
        
        let share2
        if (resp.data.encrypted_share) {
          console.log('[Gift Claiming] Decrypting encrypted_share with gift code...')
          try {
            share2 = this.decryptShard(resp.data.encrypted_share, giftCode)
            console.log('[Gift Claiming] ✅ Successfully decrypted share[0]')
            console.log('[Gift Claiming] Share[0] length:', share2?.length)
            console.log('[Gift Claiming] Share[0] (first 20 chars):', share2?.substring(0, 20))
          } catch (decryptError) {
            console.error('[Gift Claiming] ❌ Failed to decrypt share[0]:', decryptError)
            console.error('[Gift Claiming] Decrypt error details:', {
              message: decryptError.message,
              stack: decryptError.stack
            })
            throw decryptError
          }
        } else {
          console.log('[Gift Claiming] No encrypted_share found, using gift code directly as share[0]')
          share2 = giftCode
        }

        console.log('[Gift Claiming] Combining shares to reconstruct private key...')
        console.log('[Gift Claiming] Share[0] length:', share2?.length)
        console.log('[Gift Claiming] Share[1] length:', share1?.length)
        
        let privateKey
        try {
          privateKey = sss.combine([share1, share2])
          console.log('[Gift Claiming] ✅ Successfully combined shares')
          console.log('[Gift Claiming] Private key length:', privateKey?.length)
          console.log('[Gift Claiming] Private key (first 20 chars):', privateKey?.toString().substring(0, 20))
        } catch (error) {
          console.error('[Gift Claiming] ❌ Failed to combine shares:', error)
          console.error('[Gift Claiming] Trying fallback with gift code directly...')
          // fallback for when sss.combine causes an error because share2 was
          // not decrypted successfully and thus contains unreadable characters
          // when recovering gift
          try {
            privateKey = sss.combine([share1, giftCode])
            console.log('[Gift Claiming] ✅ Fallback combination succeeded')
          } catch (fallbackError) {
            console.error('[Gift Claiming] ❌ Fallback also failed:', fallbackError)
            throw fallbackError
          }
        }
        
        console.log('[Gift Claiming] Creating SweepPrivateKey instance...')
        vm.sweeper = new SweepPrivateKey(privateKey.toString())
        console.log('[Gift Claiming] Sweeper address:', vm.sweeper.bchAddress)
        
        console.log('[Gift Claiming] Checking balance at gift address...')
        vm.sweeper.getBchBalance().then(async function (data) {
          console.log('[Gift Claiming] Balance check result:', {
            balance: data.balance,
            spendable: data.spendable,
            unspent: data.unspent
          })
          
          vm.bchAmount = data.spendable || 0
          console.log('[Gift Claiming] BCH amount to sweep:', vm.bchAmount)
          
          if (vm.bchAmount > 0) {
            console.log('[Gift Claiming] Balance > 0, proceeding with sweep...')
            const recipientAddress = await vm.getRecipientAddress('bch')
            console.log('[Gift Claiming] Recipient address:', recipientAddress)
            
            if (!recipientAddress) {
              console.error('[Gift Claiming] ❌ Failed to get recipient address')
              vm.error = vm.$t('FailedToGetAddress', {}, 'Failed to get recipient address')
              vm.processing = false
              return
            }
            
            console.log('[Gift Claiming] Sweeping funds...')
            console.log('[Gift Claiming] From:', vm.sweeper.bchAddress)
            console.log('[Gift Claiming] To:', recipientAddress)
            console.log('[Gift Claiming] Amount:', vm.bchAmount)
            
            try {
              const sweepResult = await vm.sweeper.sweepBch(
                vm.sweeper.bchAddress,
                privateKey.toString(),
                vm.bchAmount,
                undefined, // feeFunder
                recipientAddress
              )
              console.log('[Gift Claiming] Sweep result:', {
                success: sweepResult.success,
                txid: sweepResult.txid,
                error: sweepResult.error
              })
              
              if (!sweepResult.success) {
                console.error('[Gift Claiming] ❌ Sweep failed:', sweepResult.error)
                vm.error = sweepResult.error || vm.$t('SweepFailed', {}, 'Failed to sweep funds')
                vm.processing = false
                return
              }
              
              console.log('[Gift Claiming] ✅ Sweep transaction broadcasted successfully')
              console.log('[Gift Claiming] Transaction ID:', sweepResult.txid)
              
              // Wait a bit for transaction to propagate before updating balance
              console.log('[Gift Claiming] Waiting for transaction to propagate...')
              await new Promise(resolve => setTimeout(resolve, 3000))
              
              vm.wallet.BCH.getBalance().then(function (response) {
                console.log('[Gift Claiming] Updated wallet balance:', {
                  balance: response.balance,
                  spendable: response.spendable
                })
                vm.$store.commit('assets/updateAssetBalance', {
                  id: 'bch',
                  balance: response.balance,
                  spendable: response.spendable
                })
              })
              
              console.log('[Gift Claiming] ✅ Claim completed successfully')
              vm.completed = true
            } catch (sweepError) {
              console.error('[Gift Claiming] ❌ Sweep failed with exception:', sweepError)
              console.error('[Gift Claiming] Sweep error details:', {
                message: sweepError.message,
                stack: sweepError.stack,
                response: sweepError.response
              })
              vm.error = sweepError.message || sweepError.toString() || vm.$t('SweepFailed', {}, 'Failed to sweep funds')
            }
          } else {
            console.warn('[Gift Claiming] ⚠️ Balance is 0 or negative')
            console.warn('[Gift Claiming] This gift may have already been claimed')
            vm.error = vm.$t('GiftAlreadyClaimed')
          }
          vm.processing = false
        }).catch((balanceError) => {
          console.error('[Gift Claiming] ❌ Balance check failed:', balanceError)
          console.error('[Gift Claiming] Balance error details:', {
            message: balanceError.message,
            stack: balanceError.stack
          })
          vm.error = balanceError.message || vm.$t('FailedToCheckBalance', {}, 'Failed to check gift balance')
          vm.processing = false
        })
      }).catch((error) => {
        console.error('[Gift Claiming] ❌ API request failed:', error)
        console.error('[Gift Claiming] Error response:', error?.response?.data)
        console.error('[Gift Claiming] Error status:', error?.response?.status)
        console.error('[Gift Claiming] Error message:', error?.message)
        vm.error = error?.response?.data?.message || error?.message || vm.$t('ClaimFailed', {}, 'Failed to claim gift')
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

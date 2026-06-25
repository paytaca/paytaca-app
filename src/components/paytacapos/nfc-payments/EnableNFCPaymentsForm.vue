<template>
    <EncryptionPubkeyInput
        v-if="showEncryptionPubkeyInput && posDevice"
        :pos-id="posDevice?.posid"
        @submit="submitEncryptionPublicKey"
        @close="$emit('close')"
    />
    <NfcSetupRequestCode 
        v-if="showRequestCode && requestCode" 
        :pos-id="posDevice?.posid" 
        :request-code="requestCode"
        @regenerate="generateRequestCode"
        @close="$emit('close')"
        :key="nfcSetupRequestCodeKey"
        />
</template>
<script>

import BCHJS from '@psf/bch-js';
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils';
import { computed, onMounted, ref, watch } from 'vue';
import { useQuasar } from 'quasar';
import { encryptWithPublicKey } from 'src/utils/ecies';
import { loadCardMerchantWallet } from 'src/services/wallet';
import { useStore } from 'vuex';
import EncryptionPubkeyInput from './EncryptionPubkeyInput.vue';
import QrScanner from 'src/components/qr-scanner.vue'
import NfcSetupRequestCode from './NfcSetupRequestCode.vue';

export default {
    name: 'EnableNFCPaymentsForm',
    components: {
        EncryptionPubkeyInput,
        QrScanner,
        NfcSetupRequestCode
    },
    emits: ['close'],
    props: {
        wallet: {
            type: Object,
            required: true
        },
        posDevice: {
            type: Object,
            required: true
        }
    },
    setup (props, { emit }) {

        const $q = useQuasar()
        const $store = useStore()
        const bchjs = new BCHJS()

        const showEnableNFCPaymentsForm = ref(true)
        const showEncryptionPubkeyInput = ref(true)
        const showRequestCode = ref(false)
        const encryptionPublicKey = ref('')
        const showQrScanner = ref(false)
        const generatingLinkCode = ref(false)
        const requestCode = ref(null)
        const nfcSetupRequestCodeKey = ref(0) // Used to force remount NfcSetupRequestCode component when request code changes

        const darkMode = computed(() => {
            return $store.getters['darkmode/getStatus']
        })

        watch(requestCode, () => { 
            console.log('Request code updated:', requestCode.value) 
        })

        onMounted(() => {
            if (!encryptionPublicKey.value) {
                showEncryptionPubkeyInput.value = true
            } else {
                showEncryptionPubkeyInput.value = false
            }
        })

        const scanPosEncryptionPublicKey = () => {
            showQrScanner.value = true
        }

        const onEncryptionPublicKeyScanned = (result) => {
            showQrScanner.value = false
            try {
                encryptionPublicKey.value = result
                $q.notify({
                    message: 'Encryption public key scanned successfully',
                    color: 'positive',
                    icon: 'check_circle',
                    timeout: 2000
                })
                // Automatically generate request code after scanning the public key
                generateRequestCode({ checkExpiry: true })
            } catch (error) {
                console.error('Error processing scanned encryption public key:', error)
                $q.notify({
                    message: 'Invalid encryption public key',
                    color: 'negative',
                    icon: 'error',
                    timeout: 2000
                })
            }
        }

        const submitEncryptionPublicKey = async (pubkey) => {
            console.log('Submitting encryption public key:', pubkey)
            if (!pubkey?.trim()) {
                $q.notify({
                message: 'Please enter or scan the encryption public key',
                color: 'warning',
                icon: 'warning',
                timeout: 2000
                })
                return
            }
            // Set the encryption public key only when submitted
            encryptionPublicKey.value = pubkey?.trim()
            
            $q.notify({
                message: 'Encryption public key submitted successfully',
                color: 'positive',
                icon: 'check_circle',
                timeout: 2000
            })
            // Generate request code with the entered encryption public key
            await generateRequestCode({ checkExpiry: true })
        }

        const generateRequestCode = async (opts) => {
            console.log('Generating request code with encryption public key:', encryptionPublicKey.value)
            const wallet = props.wallet.BCH
            const xpubkey = await wallet.getXPubKey()

            if (!encryptionPublicKey.value) {
                $q.notify({
                    message: 'Encryption public key is required to generate link code',
                    color: 'warning',
                    icon: 'warning',
                    timeout: 2000
                })
                return
            }

            try {
                const wallet = props.wallet.BCH

                // Encrypt xpubkey with POS device's public key using ECIES
                const merchantWallet = await loadCardMerchantWallet()
                const _data = {
                    xpubkey: xpubkey,
                    privateKey: merchantWallet.privkey()
                }
                const encrypted = encryptWithPublicKey(_data, encryptionPublicKey.value)
                const nonce = Math.floor(Math.random() * (2 ** 31 - 1))
                const privkey = await wallet.getPrivateKey(nonce)

                // Sign the encrypted data for verification
                const signature = bchjs.BitcoinCash.signMessageWithPrivKey(privkey, encrypted.encryptedData)

                const data = {
                    walletHash: wallet.walletHash,
                    posid: props.posDevice.posid,
                    encryptKey: encrypted.encryptKey,
                    encryptedData: encrypted.encryptedData,
                    nonce: nonce,
                    signature: signature,
                    opts: {
                        checkExpiry: opts?.checkExpiry,
                    }
                }

                console.log('Data to generate request code:', data)

                generatingLinkCode.value = true
                requestCode.value = await $store.dispatch('paytacapos/generateNfcSetupCode', data)
                console.log('>>>>Generated request code:', requestCode.value)
                showEncryptionPubkeyInput.value = false
                showRequestCode.value = true
                
            } catch (error) {
                console.error('Error generating request code:', error)
                $q.notify({
                    message: `Failed to generate request code: ${error?.message}`,
                    color: 'negative',
                    icon: 'error',
                    timeout: 3000
                })
            } finally {
                generatingLinkCode.value = false
                nfcSetupRequestCodeKey.value += 1 // Force remount NfcSetupRequestCode to reset its state with the new request code
            }
        }

        return {
            bchjs,
            darkMode,
            showEnableNFCPaymentsForm,
            showEncryptionPubkeyInput,
            encryptionPublicKey,
            getDarkModeClass,
            scanPosEncryptionPublicKey,
            onEncryptionPublicKeyScanned,
            submitEncryptionPublicKey,
            showRequestCode,
            requestCode,
            generateRequestCode,
            nfcSetupRequestCodeKey
        }
    }
}

</script>
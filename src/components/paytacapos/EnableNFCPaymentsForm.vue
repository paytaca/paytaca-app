<template>
    <EncryptionPubkeyInput
        v-if="posDevice && showEncryptionPubkeyInput"
        :pos-id="posDevice?.posid"
        @submit="submitEncryptionPublicKey"
        @close="$emit('close')"
    />
</template>
<script>

import EncryptionPubkeyInput from './EncryptionPubkeyInput.vue';
import QrScanner from 'src/components/qr-scanner.vue'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils';
import { computed, onMounted, ref } from 'vue';
import { useQuasar } from 'quasar';
import { encryptWithPublicKey } from 'src/utils/ecies';
import { loadCardMerchantWallet } from 'src/services/wallet';
import { useStore } from 'vuex';
import BCHJS from '@psf/bch-js';

export default {
    name: 'EnableNFCPaymentsForm',
    components: {
        EncryptionPubkeyInput,
        QrScanner
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
    setup (props, { emits }) {

        const showEnableNFCPaymentsForm = ref(true)
        const showEncryptionPubkeyInput = ref(true)
        const encryptionPublicKey = ref('')
        const encryptionPublicKeyInput = ref('')
        const showQrScanner = ref(false)
        const generatingLinkCode = ref(false)
        const $q = useQuasar()
        const $store = useStore()
        const bchjs = new BCHJS()

        const darkMode = computed(() => {
            return $store.getters['darkmode/getStatus']
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
                encryptionPublicKeyInput.value = result
                encryptionPublicKey.value = result
                $q.notify({
                    message: 'Encryption public key scanned successfully',
                    color: 'positive',
                    icon: 'check_circle',
                    timeout: 2000
                })
                // Automatically generate link code after scanning the public key
                generateLinkCode({ checkExpiry: true })
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
            // Generate link code with the entered encryption public key
            await generateLinkCode({ checkExpiry: true })
        }

        const generateLinkCode = async (opts) => {
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
                const addressIndex = 0
                const merchantWallet = await loadCardMerchantWallet(addressIndex)
                const _data = {
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
                    encryptedData: encrypted.encryptedData,
                    nonce: nonce,
                    signature: signature,
                    opts: {
                        checkExpiry: opts?.checkExpiry,
                    }
                }

                console.log('Data to generate link code:', data)

                generatingLinkCode.value = true
                await $store.dispatch('paytacapos/generateNfcSetupCode', data)
                
            } catch (error) {
                console.error('Error generating link code:', error)
                $q.notify({
                    message: `Failed to generate link code: ${error?.message}`,
                    color: 'negative',
                    icon: 'error',
                    timeout: 3000
                })
            } finally {
                generatingLinkCode.value = false
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
            submitEncryptionPublicKey
        }
    }
}

</script>
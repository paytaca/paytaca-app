<template>
    <QrScanner v-model="showQrScanner" @decode="onEncryptionPublicKeyScanned" />
    <q-dialog v-model="showDialog" @hide="onDialogHide" seamless class="no-click-outside">
        <q-card class="br-15 pt-card-2 text-bow" :class="getDarkModeClass(darkMode)">
            <div class="row no-wrap items-center justify-center q-pl-md q-py-sm">
                <div class="text-h5 q-space q-mt-sm"> {{ $t('POSID')}}#{{ paddedPosId }}</div>
                <q-btn
                flat
                padding="sm"
                icon="close"
                v-close-popup
                class="close-button"
                />
            </div>
            <q-card-section class="q-gutter-y-sm">
                <q-banner class="rounded-borders" :class="darkMode ? 'bg-grey text-white': ''">
                <div class="row no-wrap">
                    <div class="row items-center q-mr-sm">
                    <q-icon name="info" size="1.5em"/>
                    </div>
                    <div class="row">
                    Make sure the POS device is using the latest version of Paytaca POS. 
                    </div>
                </div>
                </q-banner>
                <div :class="darkMode ? 'bg-grey text-white': ''">
                    <q-input
                        dense
                        outlined
                        class="full-width"
                        label="Encryption Public Key"
                        hint="Please enter the encryption public key of the POS device."
                        v-model="encryptionPublicKey"
                    >
                        <template v-slot:control>
                        <span class="ellipsis" style="direction: rtl;">
                            {{ encryptionPublicKey || 'Loading...' }}
                        </span>
                        </template>
                        <template v-slot:append>
                        <q-btn
                            padding="sm"
                            flat
                            icon="qr_code_scanner"
                            :dark="darkMode"
                            @click="scanPosEncryptionPublicKey()"
                        />
                        <q-btn
                            padding="sm"
                            flat
                            icon="send"
                            :dark="darkMode"
                            @click="submitEncryptionPublicKey()"
                        />
                        </template>
                    </q-input>
                </div>
                </q-card-section>
            </q-card>
    </q-dialog>
</template>
<script>
import QrScanner from 'src/components/qr-scanner.vue'
import { computed, ref, onMounted } from 'vue'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils';
import { useStore } from 'vuex';

export default {
    name: 'EncryptionPubkeyScanner',
    components: {
        QrScanner
    },
    props: {
        posId: {
            type: [Number, String],
            required: true
        }
    },
    emits: ['submit', 'close'],
    setup(props, { emit }) {
        const showDialog = ref(false)
        const encryptionPublicKey = ref("")
        const showQrScanner = ref(false)
        const $store = useStore()

        const paddedPosId = computed(() => {
            return String(props.posId).padStart(6, '0')
        })

        const darkMode = computed(() => {
            return $store.getters['darkmode/getStatus']
        })

        onMounted(() => {
            // Automatically show the dialog when the component is mounted
            showDialog.value = true
            console.log('props.posId:', props.posId)
        })

        const onEncryptionPublicKeyScanned = (result) => {
            console.log('Scanned encryption public key:', result)
            // Handle the scanned encryption public key as needed
            encryptionPublicKey.value = result
            showQrScanner.value = false
        }

        const scanPosEncryptionPublicKey = () => {
            showQrScanner.value = true
        }

        const submitEncryptionPublicKey = () => {
            emit('submit', encryptionPublicKey.value)
        }

        const onDialogHide = () => {
            emit('close')
        }

        return {
            showDialog,
            encryptionPublicKey,
            showQrScanner,
            paddedPosId,
            darkMode,
            onEncryptionPublicKeyScanned,
            scanPosEncryptionPublicKey,
            submitEncryptionPublicKey,
            onDialogHide,
            getDarkModeClass
        }
    }
}
</script>
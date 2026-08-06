<template>
    <QrScanner v-model="showQrScanner" @decode="onEncryptionPublicKeyScanned" />
    <q-dialog v-model="showDialog" @hide="onDialogHide" seamless class="no-click-outside">
        <q-card class="br-15 pt-card-2 text-bow" :class="getDarkModeClass(darkMode)" style="width:min(400px, 90vw)">
            <div class="row no-wrap items-center q-pl-lg q-pr-sm q-py-sm">
                <div class="text-h6 q-space">{{ $t('POSID') }}#{{ paddedPosId }}</div>
                <q-btn flat round dense icon="close" v-close-popup />
            </div>
            <q-card-section class="q-pt-none q-px-lg q-pb-lg">
                <q-form @submit="submitEncryptionPublicKey" class="q-gutter-y-md">
                    <div class="text-caption text-grey q-mt-sm">
                        <q-icon name="info" size="1.2em" class="q-mr-xs" />
                        {{ $t('PosDeviceLatestVersionWarning', {}, 'Make sure the POS device is using the latest version of Paytaca POS.') }}
                    </div>
                    <q-input
                        dense
                        outlined
                        :dark="darkMode"
                        :label="$t('EncryptionPublicKey', {}, 'Encryption Public Key')"
                        v-model="encryptionPublicKey"
                        hide-bottom-space
                    >
                        <template v-slot:control>
                            <span class="ellipsis" style="direction: rtl;">
                                {{ encryptionPublicKey || $t('EnterPosEncryptionPublicKey', {}, 'Enter the encryption public key...') }}
                            </span>
                        </template>
                        <template v-slot:append>
                            <q-btn padding="sm" flat icon="qr_code_scanner" :dark="darkMode" @click="scanPosEncryptionPublicKey()" />
                        </template>
                    </q-input>
                    <div class="row q-gutter-sm">
                        <q-btn outline no-caps color="grey" class="col" :label="$t('Cancel')" @click="onDialogHide" />
                        <q-btn no-caps class="button col" :label="$t('Submit')" type="submit" />
                    </div>
                </q-form>
            </q-card-section>
        </q-card>
    </q-dialog>
</template>
<script>
import QrScanner from 'src/components/qr-scanner.vue'
import { computed, ref, onMounted } from 'vue'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils';
import { useStore } from 'vuex';
import { useI18n } from 'vue-i18n';

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
        const { t: $t } = useI18n()

        const paddedPosId = computed(() => {
            return String(props.posId).padStart(6, '0')
        })

        const darkMode = computed(() => {
            return $store.getters['darkmode/getStatus']
        })

        onMounted(() => {
            showDialog.value = true
        })

        const onEncryptionPublicKeyScanned = (result) => {
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

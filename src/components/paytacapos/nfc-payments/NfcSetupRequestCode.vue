<template>
    <q-dialog v-model="showDialog" @hide="onDialogHide" seamless class="no-click-outside">
        <q-card class="br-15 pt-card-2 text-bow" :class="getDarkModeClass(darkMode)" style="width:min(420px, 90vw)">
            <div class="row no-wrap items-center q-pl-lg q-pr-sm q-py-sm">
                <div class="text-h6 q-space">{{ $t('POSID') }}#{{ paddedPosId }}</div>
                <q-btn flat round dense icon="close" v-close-popup />
            </div>
            <q-card-section class="q-pt-none q-px-lg q-pb-lg">
                <div class="text-caption text-grey q-mb-md q-mt-sm">
                    <q-icon name="info" size="1.2em" class="q-mr-xs" />
                    {{ $t('ScanToConnect', {}, 'Scan with POS device to connect') }}
                </div>
                <div class="qr-code-container">
                    <q-skeleton v-if="generatingLinkCode" height="250px" width="250px" />
                    <qr-code v-else :text="qrCodeData" :size="qrCodePxSize" />
                </div>
                <div class="row items-center justify-between q-mt-sm q-mb-lg">
                    <div class="text-caption text-grey">{{ $t('QrCodeSize', {}, 'QR code size') }}</div>
                    <q-btn-group flat>
                        <q-btn padding="xs sm" icon="zoom_out" @click="() => qrCodePxSize = Math.max(100, qrCodePxSize - 25)" />
                        <q-btn padding="xs sm" icon="zoom_in" @click="() => qrCodePxSize = Math.min(350, qrCodePxSize + 25)" />
                    </q-btn-group>
                </div>
                <div v-if="qrCodeData" class="q-mb-md">
                    <q-input dense outlined readonly :dark="darkMode" :label="$t('LinkUrl', {}, 'Link URL')">
                        <template v-slot:control>
                            <a :href="qrCodeDataLink" target="_blank" class="ellipsis" style="direction: rtl;">
                                {{ qrCodeDataLink }}
                            </a>
                        </template>
                        <template v-slot:append>
                            <q-btn padding="sm" flat icon="content_copy" :dark="darkMode" @click="copyToClipboard(qrCodeDataLink, $t('LinkCodeUrlCopied', {}, 'Link code URL copied'))" />
                        </template>
                    </q-input>
                </div>
                <div class="row items-center justify-between q-pt-xs">
                    <div v-if="Number.isFinite(codeExpiresIn)" class="text-caption text-grey">
                        <template v-if="codeExpiresIn > 1000">
                            {{ $t('LinkExpiresIn') }} {{ formatTimestampToText(requestCode?.expiresAt * 1000) }}
                        </template>
                        <template v-else-if="codeExpiresIn < -1000">
                            {{ $t('LinkExpired') }} {{ formatTimestampToText(requestCode?.expiresAt * 1000) }}
                        </template>
                        <template v-else-if="codeExpiresIn > 0">
                            {{ $t('LinkExpiresIn') }}
                            <span :class="darkMode ? 'text-white' : 'text-brandblue'">{{ codeExpiresIn }}</span>
                            {{ codeExpiresIn > 1 ? $t('Seconds') : $t('Second') }}
                        </template>
                        <template v-else-if="codeExpiresIn < 0">
                            {{ $t('LinkExpired') }}
                            <span :class="darkMode ? 'text-white' : 'text-brandblue'">{{ codeExpiresIn * -1 }}</span>
                            {{ codeExpiresIn < -1 ? $t('Seconds') : $t('Second') }} {{ $t('Ago') }}
                        </template>
                    </div>
                    <q-btn
                        :disable="generatingLinkCode"
                        :loading="generatingLinkCode"
                        padding="none"
                        flat
                        no-caps
                        class="button button-text-primary"
                        :class="getDarkModeClass(darkMode)"
                        :label="$t('GenerateNewCode')"
                        @click="generateRequestCode()"
                        style="text-decoration:underline;"
                    />
                </div>
            </q-card-section>
        </q-card>
    </q-dialog>
</template>
<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils';
import { formatTimestampToText } from 'src/wallet/anyhedge/formatters';
import { computed, onMounted, ref, onUnmounted, watch, inject } from 'vue';
import { useStore } from 'vuex';
import { useQuasar } from 'quasar';
import { useI18n } from 'vue-i18n';
import { cardLogger } from 'src/utils/debug-logger.js';

export default {
    name: 'NfcSetupRequestCode',
    props: {
        posId: {
            type: [String, Number],
            required: true
        },
        requestCode: {
            type: Object,
            required: true
        }
    },
    emits: ['close', 'regenerate', 'next'],
    setup (props, { emit }) {

        const $store = useStore()
        const $q = useQuasar()
        const $copyText = inject('$copyText')
        const { t: $t } = useI18n()

        const showDialog = ref(true)
        const generatingLinkCode = ref(false)
        const qrCodePxSize = ref(200)
        const requestCode = ref(props.requestCode)

        const darkMode = computed(() => { return $store.getters['darkmode/getStatus']})
        const paddedPosId = computed(() => props.posId.toString().padStart(6, '0'))

        const qrCodeDataLink = computed(() => `app://com.paytaca.pos/link?code=${qrCodeDataB64.value}`)
        const qrCodeDataB64 = computed(() => btoa(qrCodeData.value))

        const expirationUpdateInterval = ref(null)
        const codeExpiresIn = ref(null)

        const qrCodeData = computed(() => {
            return JSON.stringify({
                code: requestCode.value?.code,
                encryptKey: requestCode.value?.encryptKey,
                nonce: requestCode.value?.nonce,
            })
        })

        watch(requestCode, () => updateCodeExpiration())

        onMounted(() => {
            expirationUpdateInterval.value = setInterval(() => updateCodeExpiration(), 1000)
            updateCodeExpiration()
        })

        onUnmounted(() => clearInterval(expirationUpdateInterval.value))

        function updateCodeExpiration() {
        if (!requestCode.value?.expiresAt) return codeExpiresIn.value = null
            codeExpiresIn.value = Math.round(requestCode.value?.expiresAt - Date.now() / 1000)
        }

        const onDialogHide = () => {
            emit('close')
        }

        function copyToClipboard(value, message) {
            $copyText(value)
            $q.notify({
                message: message || $t('CopiedToClipboard', {}, 'Copied to clipboard'),
                timeout: 800,
                color: 'blue-9',
                icon: 'mdi-clipboard-check'
            })
        }

        function generateRequestCode() {
            cardLogger.log('Generating new request code...')
            emit('regenerate')
        }

        return {
            qrCodePxSize,
            showDialog,
            darkMode,
            getDarkModeClass,
            paddedPosId,
            onDialogHide,
            qrCodeDataLink,
            qrCodeData,
            copyToClipboard,
            generatingLinkCode,
            generateRequestCode,
            codeExpiresIn,
            formatTimestampToText
        }
    }
}
</script>
<style scoped>
.qr-code-container {
  display: flex;
  flex-flow: column;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
  border: 1px solid rgba(128, 128, 128, 0.2);
  padding: 1.5rem;
  margin: 0;
}
</style>

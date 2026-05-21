<template>
        <!-- <q-resize-observer @resize="resizeQrSize" /> -->
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
            <div class="qr-code-container">
                <div class="row items-center justify-center">
                <q-skeleton v-if="generatingLinkCode" height="250px" width="250px"/>
                <qr-code
                    v-else
                    :key="qrCodePxSize"
                    :text="qrCodeData"
                    :size="qrCodePxSize"
                />
                </div>
                <div class="row items-center justify-end">
                <q-btn-group rounded class="q-r-mb-md q-r-mr-md">
                    <q-btn padding="xs md" text-color="black" icon="zoom_out" @click="() => qrCodePxSize -= 25"/>
                    <q-btn padding="xs md" text-color="black" icon="zoom_in" @click="() => qrCodePxSize += 25"/>
                </q-btn-group>
                </div>
            </div>
            <div v-if="qrCodeData" class="row items-center justify-end q-gutter-sm">
                <q-field
                    dense
                    outlined
                    readonly
                    :dark="darkMode"
                    class="full-width">
                    <template v-slot:control>
                    <a :href="qrCodeDataLink" target="_blank" class="ellipsis" style="direction: rtl;">
                        {{ qrCodeDataLink }}
                    </a>
                    </template>
                    <template v-slot:append>
                    <q-btn
                        padding="sm"
                        flat
                        icon="content_copy"
                        :dark="darkMode"
                        @click="copyToClipboard(qrCodeDataLink, 'Link code url copied')"
                    />
                    </template>
                </q-field>
            </div>
            <div class="row items-center justify-center q-gutter-xs">
                <span v-if="codeExpiresIn > 1000" class="text-grey">
                {{ $t('LinkExpiresIn') }}
                {{ formatTimestampToText(requestCode?.expiresAt * 1000) }}
                </span>
                <span v-else-if="codeExpiresIn < -1000" class="text-grey">
                {{ $t('LinkExpired') }} {{ formatTimestampToText(requestCode?.expiresAt * 1000) }}
                </span>
                <span v-else-if="codeExpiresIn > 0" class="text-grey">
                {{ $t('LinkExpiresIn') }}
                <span :class="darkMode ? 'text-white' : 'text-brandblue'">{{ codeExpiresIn }}</span>
                {{ codeExpiresIn > 1 ? $t('Seconds'): $t('Second') }}
                </span>
                <span v-else-if="codeExpiresIn < 0" class="text-grey">
                {{ $t('LinkExpired') }}
                <span :class="darkMode ? 'text-white' : 'text-brandblue'">{{ codeExpiresIn * -1 }}</span>
                {{ codeExpiresIn < -1 ? $t('Seconds'): $t('Second') }} {{ $t('Ago') }}
                </span>
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
                <!-- in case codeExpiresIn is not a number nothing will be shown -->
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

        const showDialog = ref(true)
        const generatingLinkCode = ref(false)
        const qrCodePxSize = ref(200)
        const requestCode = ref(props.requestCode)

        const darkMode = computed(() => { return $store.getters['darkmode/getStatus']})
        const paddedPosId = computed(() => props.posId.toString().padStart(6, '0'))

        const qrCodeDataLink = computed(() => `app://com.paytaca.pos/link?code=${qrCodeDataB64.value}`)
        const qrCodeDataB64 = computed(() => btoa(qrCodeData.value))

        const qrCodeData = computed(() => {
            return JSON.stringify({
                code: requestCode.value?.code,
                encryptKey: requestCode.value?.encryptKey,
                nonce: requestCode.value?.nonce,
            })
        })

        watch(requestCode, () => updateCodeExpiration())

        const expirationUpdateInterval = ref(null)
        const codeExpiresIn = ref(null)
        onMounted(() => {
            expirationUpdateInterval.value = setInterval(() => updateCodeExpiration(), 1000)
            updateCodeExpiration()
        })
    
        onMounted(() => {
            console.log(requestCode.value)
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
                message: message || 'Copied to clipboard',
                timeout: 800,
                color: 'blue-9',
                icon: 'mdi-clipboard-check'
            })
        }

        function generateRequestCode() {
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
  position:relative;
  margin-left: -10px;
  margin-right: -10px;

  background-color: white;

  display: flex;
  flex-flow: column;
  justify-content: center;
  align-content: center;

  border-radius: 16px;
  border: 2px solid #ed5f59;

  padding: 1rem;
}
</style>

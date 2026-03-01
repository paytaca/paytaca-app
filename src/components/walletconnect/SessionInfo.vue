<template>
  <q-card :class=" flat ? 'session session-info-flat q-pa-sm': 'session session-info q-pa-sm'"  :flat="flat">
    <q-card-section style="padding-bottom: 0px">
      <div class="row items-start">
        <div class="col">
          <template v-if="sessionType==='proposal'">
              <PeerInfo :metadata="peerMetadata" :session-id="session.id" :session-topic="session.topic"> 
                <template v-slot:name> 
                  <div class="row flex items-center">
                    <span>{{ peerMetadata?.name || 'App'}} {{ $t('WantsToConnect', {}, 'wants to connect') }}. </span>
                  </div>
                </template>
              </PeerInfo>
          </template>
          <template v-if="sessionType==='active'">
              <PeerInfo  :metadata="peerMetadata" :session-id="session.id" :session-topic="session.topic"/>
          </template>
          <template v-if="sessionType==='request'">
              <PeerInfo  :metadata="peerMetadata" :session-id="!hideSessionId && session?.id" :session-topic="!hideTopic && session?.topic"> 
                <template v-slot:name> 
                  <div class="row items-center">
                    <div v-if="session?.params?.request?.params?.userPrompt" class="text-bold col-auto">
                      {{ session?.params?.request?.params?.userPrompt || `Sign a ${method}`}}
                    </div>
                    <div class="col q-mr-xs">
                      <q-icon name="notifications_active" color="warning" size="sm"></q-icon>
                    </div>
                  </div>
                </template>
                <template v-slot:url>
                  <div class="row">
                    <div class="col-12 text-light session-info-attribute-url">
                      {{ $t('OriginLabel', {}, 'Origin:') }} <span style="word-break: break-all;">{{ session.verifyContext?.verified?.origin }}</span>
                    </div>
                    <div class="col-12 text-light session-info-attribute">
                      {{ $t('MethodLabel', {}, 'Method:') }} {{ session.params?.request?.method }}
                    </div>
                    <div v-if="!hideSessionId" class="col-12 text-light session-info-attribute">
                      Sid: {{ session?.id}}
                    </div>
                    <div v-if="!hideTopic" class="col-12 text-light session-info-attribute">
                      {{ $t('TopicLabel', {}, 'Topic:') }} {{session.session?.topic?.replace(session.session.topic.slice(3, session.session.topic.length - 6), '...') }}
                    </div>
                  </div>
                </template>
              </PeerInfo>
          </template>
        </div>
        <div v-if="sessionType === 'active'" class="col-auto q-ml-sm flex flex-center">
          <q-btn
            :icon="isExpanded ? 'expand_less' : 'chevron_right'"
            @click="toggleExpand"
            class="expand-btn"
            color="grey-7"
            flat
            round
            size="lg"
          />
        </div>
      </div>
      
      <div v-if="sessionType === 'active' && isExpanded" class="q-mt-md q-mb-sm text-center">
        <div v-if="addressBalance !== null" class="q-mb-sm">
          <span v-if="addressBalanceLoading" class="text-grey">{{ $t('LoadingBalance', {}, 'Loading balance...') }}</span>
          <span v-else class="text-weight-bold text-primary" style="font-size: 16px;">{{ addressBalance }} BCH</span>
        </div>
        <q-btn
          outline
          rounded
          size="sm"
          color="primary"
          icon="fas fa-qrcode"
          :label="$t('ShowConnectedAddress', {}, 'Show Connected Address')"
          @click="openAddressDialog"
          no-caps
          :disable="!account"
        />
      </div>

    </q-card-section>

    <!-- Address Dialog -->
    <q-dialog 
      v-model="showAddressDialog" 
      persistent
      transition-show="scale"
      transition-hide="scale"
    >
      <q-card class="address-dialog br-15 pt-card" :class="getDarkModeClass(darkMode)">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">{{ $t('ConnectedAddress', {}, 'Connected Address') }}</div>
          <q-space />
          <q-btn icon="close" flat round dense @click="showAddressDialog = false" />
        </q-card-section>

        <q-card-section class="q-pt-lg q-pb-md text-center">
          <!-- Address Format Toggle -->
          <div class="address-format-container q-mb-md">
            <div class="row flex-center">
              <q-img src="bch-logo.png" height="25px" width="25px" @click="addressFormat = 'cash'" />
              <span @click="addressFormat = 'cash'">&nbsp;BCH</span>
              <q-toggle
                v-model="isTokenFormat"
                class="text-bow"
                style="margin: auto;"
                keep-color
                color="teal-5"
                size="lg"
                checked-icon="img:ct-logo.png"
                unchecked-icon="img:bch-logo.png"
              />
              <q-img src="ct-logo.png" height="25px" width="25px" @click="addressFormat = 'token'" />
              <span @click="addressFormat = 'token'">&nbsp;CashToken</span>
            </div>
          </div>

          <!-- QR Code -->
          <div class="qr-container q-mb-md" v-if="qrCodeDataUrl">
            <img :src="qrCodeDataUrl" alt="QR Code" class="qr-image" />
          </div>

          <!-- Address Display -->
          <div class="address-text-container q-mb-sm" v-if="displayAddress">
            <div class="text-subtitle2 text-weight-medium address-display-text">
              {{ displayAddress }}
            </div>
          </div>

          <!-- Copy and Deposit Buttons -->
          <div class="q-gutter-sm">
            <q-btn
              outline
              rounded
              size="sm"
              color="primary"
              icon="fas fa-copy"
              :label="$t('Copy')"
              @click="copyCurrentAddress"
            />
            <q-btn
              outline
              rounded
              size="sm"
              color="primary"
              icon="fas fa-arrows-down-to-line"
              :label="$t('Deposit')"
              @click="goToDeposit"
            />
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>
    <q-card-actions v-if="sessionType !== 'active' || isExpanded" class="row justify-around q-gutter-x-md q-mt-lg" style="padding-top: 0px">
      <slot name="actions"></slot>
    </q-card-actions>
  </q-card>
</template>
<script setup>
import { computed, ref, watch, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useRouter } from "vue-router";
import PeerInfo from './PeerInfo.vue'
import { shortenAddressForDisplay } from '../../utils/address-utils'
import { toTokenAddress } from 'src/utils/crypto';
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { useStore } from 'vuex'
import QRCode from 'qrcode'
import Watchtower from 'src/lib/watchtower'

const props = defineProps({
    sessionType: { type: String, required: true }, /* proposal | request | active */
    session: { type: Object, required: true}, // sessionProposal | sessionRequest | activeSession
    flat: { type: Boolean },
    hideSessionId: { type: Boolean },
    hideTopic: { type: Boolean },
    addressDisplayFormatter: { type: Function },
    addressDisplayFormat: { type: String /*cashaddr | tokenaddr */}
})
const peerMetadata = computed(() => {
  if (props.sessionType === 'proposal') {
    return structuredClone(props.session.proposer.metadata)
  }
  if (props.sessionType === 'active') {
    return structuredClone(props.session.peer.metadata)
  }
  if (props.sessionType === 'request') {
    // props.session is a sessionRequest object 
    // and session is a property of the sessionRequest object
    if (props.session.session) {
      return structuredClone(props.session.session.peer.metadata)
    }
  }
  return {}
})

const $q = useQuasar()
const $router = useRouter()
const $store = useStore()

// Address dialog state - defined early to avoid render issues
const showAddressDialog = ref(false)
const addressFormat = ref('cash')
const qrCodeDataUrl = ref('')
const addressBalance = ref(null)
const addressBalanceLoading = ref(false)

// Collapsible state - start collapsed by default
const isExpanded = ref(false)

function toggleExpand() {
  isExpanded.value = !isExpanded.value
  // Load balance when expanding if not already loaded
  if (isExpanded.value && addressBalance.value === null && !addressBalanceLoading.value) {
    fetchAddressBalance()
  }
}

const watchtower = new Watchtower()

async function fetchAddressBalance() {
  if (!rawAddress.value) {
    addressBalance.value = null
    return
  }
  
  addressBalanceLoading.value = true
  try {
    const response = await watchtower.BCH._api.get(`balance/bch/${rawAddress.value}/`)
    addressBalance.value = response?.data?.balance || 0
  } catch (error) {
    console.error('Error fetching address balance:', error)
    addressBalance.value = null
  } finally {
    addressBalanceLoading.value = false
  }
}



const isTokenFormat = computed({
  get: () => addressFormat.value === 'token',
  set: (val) => addressFormat.value = val ? 'token' : 'cash'
})

const darkMode = computed(() => $store.getters['darkmode/getStatus'])

// Generate QR code when display address changes
async function generateQRCode(address) {
  if (!address) {
    qrCodeDataUrl.value = ''
    return
  }
  try {
    const dataUrl = await QRCode.toDataURL(address, {
      width: 200,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    })
    qrCodeDataUrl.value = dataUrl
  } catch (error) {
    console.error('Error generating QR code:', error)
    qrCodeDataUrl.value = ''
  }
}

// Watch for dialog open and address format changes
watch(showAddressDialog, (isOpen) => {
  if (isOpen) {
    generateQRCode(displayAddress.value)
    fetchAddressBalance()
  }
})

watch(addressFormat, () => {
  if (showAddressDialog.value) {
    generateQRCode(displayAddress.value)
  }
})

const account = computed(() => {
  // session 
  if (props.session?.namespaces?.bch?.accounts[0]) 
    return props.session?.namespaces?.bch?.accounts[0]
  // session request
  if (props.session?.session?.namespaces?.bch?.accounts[0]) 
    return props.session?.session?.namespaces?.bch?.accounts[0]
  return ''
})

const rawAddress = computed(() => {
  if (account.value) {
    return account.value.replace('bch:', '')
  }
  return ''
})

const formattedCashAddress = computed(() => {
  if (rawAddress.value) {
    return shortenAddressForDisplay(rawAddress.value)
  }
  return ''
})

const formattedTokenAddress = computed(() => {
  if (rawAddress.value) {
    return shortenAddressForDisplay(toTokenAddress(rawAddress.value))
  }
  return ''
})

// Computed that depends on address dialog state
const displayAddress = computed(() => {
  if (!rawAddress.value) return ''
  if (addressFormat.value === 'token') {
    return toTokenAddress(rawAddress.value)
  }
  return rawAddress.value
})

async function selectAssetToSend(address) {
  const tokenAddress = toTokenAddress(address)
  $router.push('/send/select-asset/?address=' + tokenAddress + '&back-path=/apps/wallet-connect')
}

function goToDeposit() {
  if (rawAddress.value) {
    selectAssetToSend(rawAddress.value)
  }
}

function openAddressDialog() {
  showAddressDialog.value = true
  
  // Generate QR code immediately when opening
  if (displayAddress.value) {
    generateQRCode(displayAddress.value)
  }
}

// Watch to detect when dialog opens/closes
watch(showAddressDialog, (newVal, oldVal) => {
})

async function copyCurrentAddress() {
  if (!displayAddress.value) return

  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(displayAddress.value)
    } else {
      // Fallback for browsers without clipboard API
      const textarea = document.createElement('textarea')
      textarea.value = displayAddress.value
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }
    $q.notify({
      message: `${addressFormat.value === 'token' ? 'Token' : 'Cash'} address copied to clipboard`,
      timeout: 800,
      color: 'blue-9',
      icon: 'mdi-clipboard-check'
    })
  } catch (error) {
    console.error('Error copying to clipboard:', error)
    $q.notify({
      message: 'Failed to copy',
      timeout: 800,
      color: 'negative',
      icon: 'mdi-clipboard-off'
    })
  }
}

</script>

<style lang="scss" scoped>
/* Inherit background and darken */
.q-card__section--vert {
  padding: 5px;
}

.session {
  background: inherit;
  position:relative;
  border-radius: 15px;
  font-family: monospace
}

.session-info:after {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  background-color: rgb(0,0,0,0.25);
  border-radius: 15px;
  pointer-events: none;
}

.session-info-flat:after {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  background-color: rgb(253,253,253, .023);
  border: 1px solid #80808038;
  border-radius: 15px;
  pointer-events: none;
}

.session-info-attribute {
  font-family: monospace;
  color: #ff6000;
  font-size: x-small;
}
.session-info-attribute-url {
  font-family: monospace;
  font-size: x-small;
}

.q-card {
  position: relative; /* Ensure the card is positioned */
  z-index: 1; /* Or a lower index if the child should overlay it */
}

.q-icon {
  position: relative;
  z-index: 10; /* Ensure the icon is clickable over the card */
}

.address-dialog {
  width: 340px;
  max-width: 95vw;
  padding: 16px;
}

.qr-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 16px;
  background-color: white;
  border-radius: 12px;
  display: inline-block;
}

.address-format-container {
  display: inline-block;
  padding: 8px 16px;
  background-color: rgba(128, 128, 128, 0.1);
  border-radius: 8px;
}

.qr-image {
  width: 200px;
  height: 200px;
  display: block;
}

.address-text-container {
  background-color: rgba(128, 128, 128, 0.1);
  border-radius: 8px;
  padding: 12px 16px;
  word-break: break-all;
}

.address-display-text {
  font-family: monospace;
  font-size: 14px;
  line-height: 1.5;
}

.address-format-toggle {
  margin-top: 8px;
}

.expand-btn {
  transition: transform 0.3s ease;
}

.expand-btn:hover {
  transform: scale(1.15);
}

.expand-btn .q-icon {
  font-size: 28px;
  font-weight: bold;
}
</style>

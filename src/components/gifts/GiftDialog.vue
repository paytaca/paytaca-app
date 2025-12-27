<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" position="bottom" seamless>
    <q-card class="bottom-card" :class="darkMode ? 'pt-card-3' : 'text-black'">
      <div class="row no-wrap items-center justify-center q-pl-md q-mt-sm">
        <div class="text-h6 q-space q-mt-sm">{{ $t('Gift') }}</div>
        <q-btn
          flat
          padding="sm"
          icon="close"
          v-close-popup
        />
      </div>
      <q-card-section style="max-height:calc(90vh - 3.5rem);overflow-y:auto" class="q-pt-sm">
        <!-- Show QR code and URL when showQr is true -->
        <template v-if="showQr">
          <div class="text-center text-h5 q-mb-md">{{ $t('Amount') }}: {{ amount }} BCH</div>
          <div class="row justify-center q-mb-md">
            <qr-code :text="qrCodeContents" :size="200" icon="bch-logo.png"/>
          </div>
          <div
            class="q-py-sm q-px-md q-px-lg q-my-xs row items-center no-wrap rounded-borders q-mb-sm"
            style="border:1px solid grey; position:relative"
            v-ripple
            @click="() => copyToClipboard(qrCodeContents)"
          >
            <div class="ellipsis">{{ qrCodeContents }}</div>
            <q-icon name="content_copy" size="1.25em" class="q-ml-sm"/>
          </div>
          <div class="text-center text-subtitle1">{{ $t('ScanClaimGift') }}</div>
        </template>
        
        <!-- Show gift details when showQr is false -->
        <template v-else>
          <div class="q-pa-md">
            <div class="row q-mb-md">
              <div class="col-5 text-grey-7">{{ $t('DateCreated', {}, 'Date Created') }}:</div>
              <div class="col-7 text-right">{{ formattedDateCreated }}</div>
            </div>
            <div class="row q-mb-md">
              <div class="col-5 text-grey-7">{{ $t('Amount') }}:</div>
              <div class="col-7 text-right text-weight-medium">{{ amount }} BCH</div>
            </div>
            <div class="row q-mb-md" v-if="formattedDateClaimed">
              <div class="col-5 text-grey-7">{{ $t('DateClaimed', {}, 'Date Claimed') }}:</div>
              <div class="col-7 text-right">{{ formattedDateClaimed }}</div>
            </div>
            <div class="row q-mt-md">
              <div class="col-12 text-center">
                <q-badge
                  :class="getStatusBadgeClass()"
                  class="status-badge-small"
                >
                  <q-icon 
                    :name="getStatusIcon()" 
                    size="12px" 
                    class="q-mr-xs"
                  />
                  {{ getStatusText() }}
                </q-badge>
              </div>
            </div>
          </div>
        </template>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>
<script setup>
import { computed, inject } from 'vue'
import { useStore } from 'vuex'
import { useQuasar } from 'quasar'
import { useDialogPluginComponent } from 'quasar'
import { useI18n } from "vue-i18n"
import { formatDistance } from 'date-fns'

// dialog plugins requirement
defineEmits([
  // REQUIRED; need to specify some events that your
  // component will emit through useDialogPluginComponent()
  ...useDialogPluginComponent.emits
])
const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()

const $copyText = inject('$copyText')
const { t } = useI18n()
const $q = useQuasar()
const $store = useStore()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])

const props = defineProps({
  gift: Object,
  showQr: {
    type: Boolean,
    default: false
  }
})

const qrCodeContents = computed(() => {
  const giftCode = props.gift?.qr || props.gift?.giftCode
  if (!giftCode) return ''
  const url = 'https://gifts.paytaca.com/claim/?code='
  return url + giftCode
})
const amount = computed(() => props.gift?.amount)

const isClaimed = computed(() => {
  return props.gift?.date_claimed && props.gift?.date_claimed !== 'None'
})

const isRecovered = computed(() => {
  return props.gift?.recovered === true || props.gift?.recovered === 'true' || props.gift?.recovered === 1
})

const formattedDateCreated = computed(() => {
  if (!props.gift?.date_created) return ''
  try {
    const date = new Date(props.gift.date_created)
    const now = new Date()
    const diffTime = Math.abs(now - date)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays < 7) {
      // Show relative time for dates less than 7 days ago
      return formatDistance(date, now, { addSuffix: true })
    } else {
      // Show absolute date for dates 7 days or more ago
      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    }
  } catch (e) {
    return props.gift.date_created
  }
})

const formattedDateClaimed = computed(() => {
  if (!props.gift?.date_claimed || props.gift?.date_claimed === 'None') return ''
  try {
    const date = new Date(props.gift.date_claimed)
    const now = new Date()
    const diffTime = Math.abs(now - date)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays < 7) {
      // Show relative time for dates less than 7 days ago
      return formatDistance(date, now, { addSuffix: true })
    } else {
      // Show absolute date for dates 7 days or more ago
      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    }
  } catch (e) {
    return props.gift.date_claimed
  }
})

function getStatusBadgeClass() {
  if (isRecovered.value) return 'status-recovered'
  if (isClaimed.value) return 'status-claimed'
  return 'status-unclaimed'
}

function getStatusIcon() {
  if (isRecovered.value) return 'mdi-recycle'
  if (isClaimed.value) return 'mdi-check-circle'
  return 'mdi-clock-outline'
}

function getStatusText() {
  if (isRecovered.value) return t('Recovered', {}, 'RECOVERED')
  if (isClaimed.value) return t('Claimed', {}, 'CLAIMED')
  return t('Unclaimed', {}, 'UNCLAIMED')
}

function copyToClipboard (value, message=t('CopiedToClipboard')) {
  $copyText(value)
  $q.notify({
    message: message,
    timeout: 800,
    color: 'blue-9',
    icon: 'mdi-clipboard-check'
  })
}
</script>

<style scoped>
.status-badge-small {
  padding: 4px 12px;
  border-radius: 12px;
  font-weight: 600;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  display: inline-flex;
  align-items: center;
}

.status-badge-small.status-claimed {
  background: rgba(76, 175, 80, 0.15);
  color: #4caf50;
  border: 1px solid rgba(76, 175, 80, 0.3);
}

.status-badge-small.status-recovered {
  background: rgba(255, 152, 0, 0.15);
  color: #ff9800;
  border: 1px solid rgba(255, 152, 0, 0.3);
}

.status-badge-small.status-unclaimed {
  background: rgba(33, 150, 243, 0.15);
  color: #2196f3;
  border: 1px solid rgba(33, 150, 243, 0.3);
}
</style>

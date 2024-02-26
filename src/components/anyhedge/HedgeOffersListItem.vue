<template>
  <q-card-section v-ripple style="position:relative">
    <div class="row q-mb-sm">
      <q-badge v-if="isPending && isExpired" color="red">{{ $t('Expired') }}</q-badge>
      <q-badge v-else :color="resolvePositionOfferColor(hedgePositionOffer?.status)">{{ $t(formatPositionOfferStatus(hedgePositionOffer?.status)) }}</q-badge>
      <q-badge v-if="hedgePositionOffer?.id" color="grey" class="q-ml-xs">#{{ hedgePositionOffer?.id }}</q-badge>
      <div class="q-space"></div>
      <div class="text-grey">{{ formatDate(hedgePositionOffer?.createdAt * 1000) }}</div>
    </div>
    <div v-if="hedgePositionOffer?.expiresAt">
      {{ $t('ExpiresAt') }}: {{ formatTimestampToText(hedgePositionOffer?.expiresAt * 1000) }}
    </div>
    <div class="row">
      <div class="col">
        <div>{{ getAssetDenomination(denomination, hedgePositionOffer?.satoshis / (10**8)) }}</div>
      </div>
      <div class="col" style="text-align:right">
        {{ hedgePositionOffer?.lowLiquidationPriceMultiplier * 100 }}% -
        {{ hedgePositionOffer?.highLiquidationPriceMultiplier * 100 }}%
      </div>
    </div>
    <div>
      <q-icon name="mdi-timer-sand"/>
      {{ formatDuration(hedgePositionOffer?.durationSeconds) }}
    </div>
    <q-menu touch-position class="pt-card text-bow" :class="getDarkModeClass(darkMode)">
      <q-list>
        <q-item
          v-if="hedgePositionOffer?.hedgePosition"
          clickable
          v-ripple
          v-close-popup
          @click="viewHedgePosition()"
        >
          <q-item-section>
            <q-item-label>{{ $t('ViewContract') }}</q-item-label>
          </q-item-section>
        </q-item>
        <q-item
          v-if="isPending"
          clickable
          v-ripple
          v-close-popup
          @click="openUpdateExpirationForm()"
        >
          <q-item-section>
            <q-item-label>
              <template v-if="hedgePositionOffer?.expiresAt">{{ $t('UpdateExpiry') }}</template>
              <template v-else>{{ $t('SetExpiration') }}</template>
            </q-item-label>
          </q-item-section>
        </q-item>
        <q-item
          v-if="isPending"
          clickable
          v-ripple
          v-close-popup
          @click="confirmRemoveHedgeOffer()"
        >
          <q-item-section>
            <q-item-label>{{ $t('RemoveOffer') }}</q-item-label>
          </q-item-section>
        </q-item>
      </q-list>
    </q-menu>
  </q-card-section>
</template>
<script setup>
import { formatTimestampToText, formatDate, formatDuration, parseHedgePositionOffer, formatPositionOfferStatus, resolvePositionOfferColor } from 'src/wallet/anyhedge/formatters'
import { ref, computed, watch, onUnmounted, onMounted } from 'vue'
import { useStore } from 'vuex'
import { format, useQuasar } from 'quasar'
import { anyhedgeBackend } from 'src/wallet/anyhedge/backend'
import HedgeContractDetailDialog from './HedgeContractDetailDialog.vue'
import { getAssetDenomination } from 'src/utils/denomination-utils'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { useI18n } from 'vue-i18n'

const { capitalize } = format
const store = useStore()
const darkMode = computed(() => store.getters['darkmode/getStatus'])
const denomination = computed(() => store.getters['global/denomination'])
const $q = useQuasar()
const $t = useI18n().t

const $emit = defineEmits([
  'removed',
  'updated',
])

const props = defineProps({
  hedgePositionOffer: Object,
})
const isPending = computed(() => props.hedgePositionOffer?.status === 'pending')

const nowTimestamp = ref(Date.now())
const updateNowTimeoutId = ref(null)
onUnmounted(() => clearTimeout(updateNowTimeoutId))
onMounted(() => updateNowTimestamp())
function updateNowTimestamp() {
  nowTimestamp.value = Date.now()

  // incase there is an existing timeout, must clear before updating
  clearTimeout(updateNowTimeoutId.value)
  updateNowTimeoutId.value = setTimeout(() => updateNowTimestamp(), 60 * 1000)
}

const isExpired = computed(() => props.hedgePositionOffer?.expiresAt && nowTimestamp.value / 1000 > props.hedgePositionOffer?.expiresAt)
watch(isExpired, () => $emit('updated', props.hedgePositionOffer))

function openUpdateExpirationForm() {
  console.log(props.hedgePositionOffer?.expiresAt * 1000)
  let initialValue = null
  if (props.hedgePositionOffer?.expiresAt) {
    const dateObj = new Date(props.hedgePositionOffer?.expiresAt * 1000)
    const val = {
      year: String(dateObj.getFullYear()),
      month: String(dateObj.getMonth() + 1),
      date: String(dateObj.getDate()),
      hour: String(dateObj.getHours()),
      minute: String(dateObj.getMinutes()),
    }
    if (val.month.length == 1) val.month = '0' + val.month
    if (val.date.length == 1) val.date = '0' + val.date
    if (val.hour.length == 1) val.hour = '0' + val.hour
    if (val.minute.length == 1) val.minute = '0' + val.minute
    initialValue = `${val.year}-${val.month}-${val.date}T${val.hour}:${val.minute}`
  }
  console.log(initialValue)
  $q.dialog({
    title: $t('SetExpiration'),
    prompt: {
      type: 'datetime-local',
      model: initialValue,
      clearable: true,
      outlined: true,
      dense: true,
      dark: darkMode.value,
      rules: [
        val => !val || new Date(val) > Date.now() || $t('CurrentTimeError')
      ]
    },
    ok: $t('OK'),
    cancel: $t('Cancel'),
    seamless: true,
    class: `br-15 pt-card text-bow ${getDarkModeClass(darkMode)}`
  })
    .onOk(updateExpiration)
}

function updateExpiration(expirationTime) {
  const data = {
    expires_at: expirationTime ? new Date(expirationTime).toISOString() : null,
  }
  const dialog = $q.dialog({
    title: expirationTime ? $t('UpdatingExpiration') : $t('RemovingExpiration'),
    progress: true,
    persistent: true,
    seamless: true,
    class: `br-15 pt-card text-bow ${getDarkModeClass(darkMode)}`
  })
  anyhedgeBackend.patch(`anyhedge/hedge-position-offers/${props.hedgePositionOffer?.id}/`, data)
    .then(async (response) => {
      if (!response?.data?.id) return Promise.reject({ response })
      dialog.update({ title: $t('ExpirationUpdated') })
      const updatedData = parseHedgePositionOffer(response?.data)
      if (updatedData?.hedgePosition) updatedData.hedgePosition = await updatedData?.hedgePosition
      Object.assign(props.hedgePositionOffer, updatedData)
      $emit('updated', updatedData)
      return Promise.resolve(response)
    })
    .finally(() => {
      dialog.update({ progress: false, persistent: false })
    })
}

function confirmRemoveHedgeOffer() {
  const position = props.hedgePositionOffer.position
  const title = $t(`Remove${capitalize(position)}PositionOffer`)
  const message = $t(`Remove${capitalize(position)}PositionOfferDescription`)
  $q.dialog({
    title,
    message,
    ok: $t('OK'),
    cancel: $t('Cancel'),
    seamless: true,
    class: `br-15 pt-card text-bow ${getDarkModeClass(darkMode)}`
  })
    .onOk(() => removeHedgePositionOffer())
}
function removeHedgePositionOffer() {
  const position = props.hedgePositionOffer.position
  const message = $t(`Removing${capitalize(position)}PositionOffer`)
  const dialog = $q.dialog({
    title: $t('Removing'),
    message,
    persistent: true,
    progress: true,
    seamless: true,
    class: `br-15 pt-card text-bow ${getDarkModeClass(darkMode)}`
  })
  anyhedgeBackend.delete(`anyhedge/hedge-position-offers/${props.hedgePositionOffer.id}/`)
    .catch(error => {
      if (error?.response?.status === 404) return Promise.resolve()
      return Promise.reject(error)
    })
    .then(() => {
      dialog.update({
        title: $t('Removed'),
        message: $t(`${capitalize(position)}PositionOfferRemoved`)
      }).onDismiss(() => $emit('removed', props.hedgePositionOffer))
    })
    .catch(error => {
      console.error(error)
      let message = $t(`Remove${capitalize(position)}PositionError`)
      if (typeof error?.request?.data === 'string') message = error?.request?.data
      else if (error?.request?.data?.[0]) message = error?.request?.data?.[0]
      dialog.update({
        title: $t('Error'),
        message: message,
      })
    })
    .finally(() => {
      dialog.update({ persistent: false, progress: false })
    })
}

function viewHedgePosition() {
  $q.dialog({
    component: HedgeContractDetailDialog,
    componentProps: {
      contract: props.hedgePositionOffer?.hedgePosition,
    }
  })
}
</script>
<template>
  <q-card-section v-ripple style="position:relative">
    <div class="row q-mb-sm">
        <q-badge :color="statusToColor(hedgePositionOffer?.status)">{{ parseHedgePositionStatus(hedgePositionOffer?.status) }}</q-badge>
        <q-badge v-if="hedgePositionOffer?.id" color="grey" class="q-ml-xs">#{{ hedgePositionOffer?.id }}</q-badge>
        <div class="q-space"></div>
        <div class="text-grey">{{ formatDate(hedgePositionOffer?.createdAt * 1000) }}</div>
      </div>
      <div v-if="hedgePositionOffer?.expiresAt">
        Expires at: {{ formatTimestampToText(hedgePositionOffer?.expiresAt * 1000) }}
      </div>
      <div class="row">
        <div class="col">
          <div>{{ hedgePositionOffer?.satoshis / (10**8) }} BCH</div>
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
      <q-menu
        touch-position
        :class="{
          'pt-dark': darkMode,
          'text-black': !darkMode,
        }"
      >
        <q-list>
          <q-item
            v-if="hedgePositionOffer?.hedgePosition"
            clickable
            v-ripple
            v-close-popup
            @click="viewHedgePosition()"
          >
            <q-item-section>
              <q-item-label>View contract</q-item-label>
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
                <template v-if="hedgePositionOffer?.expiresAt">Update expiry</template>
                <template v-else>Set expiration</template>
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
              <q-item-label>Remove offer</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </q-menu>
  </q-card-section>
</template>
<script setup>
import { formatTimestampToText, formatDate, formatDuration, parseHedgePositionOffer } from 'src/wallet/anyhedge/formatters'
import { computed } from 'vue'
import { useStore } from 'vuex'
import { format, useQuasar } from 'quasar'
import { anyhedgeBackend } from 'src/wallet/anyhedge/backend'
import HedgeContractDetailDialog from './HedgeContractDetailDialog.vue'

const { capitalize } = format
const store = useStore()
const darkMode = computed(() => store.getters['darkmode/getStatus'])
const $q = useQuasar()

const $emit = defineEmits([
  'removed',
  'updated',
])

const props = defineProps({
  hedgePositionOffer: Object,
})
const isPending = computed(() => props.hedgePositionOffer?.status === 'pending')

const statusColorMap = { pending: 'amber', accepted: 'teal', settled: 'green', agreed: 'green', cancelled: 'red' }
function statusToColor(value) {
  return statusColorMap[value] || 'grey'
}

function parseHedgePositionStatus(status) {
  if (!status) return ''
  switch(status) {
    case 'pending':
      return 'Pending'
    case 'accepted':
      return 'Accepted'
    case 'settled':
    case 'agreed':
      return 'Agreed'
    default:
      return capitalize(status)
  }
}

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
    title: 'Set expiration',
    prompt: {
      type: 'datetime-local',
      model: initialValue,
      clearable: true,
      outlined: true,
      dense: true,
      dark: darkMode.value,
      rules: [
        val => !val || new Date(val) > Date.now() || 'Must be after current time',
      ]
    },
    cancel: true,
    class: darkMode.value ? 'text-white br-15 pt-dark-card' : 'text-black',
  })
    .onOk(updateExpiration)
}

function updateExpiration(expirationTime) {
  const data = {
    expires_at: expirationTime ? new Date(expirationTime).toISOString() : null,
  }
  const dialog = $q.dialog({
    title: expirationTime ? 'Updating expiration' : 'Removing expiration',
    progress: true,
    persistent: true,
    class: darkMode.value ? 'text-white br-15 pt-dark-card' : 'text-black',
  })
  anyhedgeBackend.patch(`anyhedge/hedge-position-offers/${props.hedgePositionOffer?.id}/`, data)
    .then(async (response) => {
      if (!response?.data?.id) return Promise.reject({ response })
      dialog.update({ title: 'Expiration updated' })
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
  $q.dialog({
    title: `Remove ${props.hedgePositionOffer.position} position offer`,
    message: `Removing ${props.hedgePositionOffer.position} position offer. Are you sure?`,
    ok: true,
    cancel: true,
    class: darkMode.value ? 'text-white br-15 pt-dark-card' : 'text-black',
  })
    .onOk(() => removeHedgePositionOffer())
}
function removeHedgePositionOffer() {
  const dialog = $q.dialog({
    title: 'Removing',
    message: `Removing ${props.hedgePositionOffer.position} position offer`,
    persistent: true,
    progress: true,
    class: darkMode.value ? 'text-white br-15 pt-dark-card' : 'text-black',
  })
  anyhedgeBackend.delete(`anyhedge/hedge-position-offers/${props.hedgePositionOffer.id}/`)
    .catch(error => {
      if (error?.response?.status === 404) return Promise.resolve()
      return Promise.reject(error)
    })
    .then(() => {
      dialog.update({
        title: 'Removed',
        message: `${capitalize(props.hedgePositionOffer.position)} position offer removed`,
      }).onDismiss(() => $emit('removed', props.hedgePositionOffer))
    })
    .catch(error => {
      console.error(error)
      let message = `Failed to remove ${props.hedgePositionOffer.position} position offer`
      if (typeof error?.request?.data === 'string') message = error?.request?.data
      else if (error?.request?.data?.[0]) message = error?.request?.data?.[0]
      dialog.update({
        title: 'Error',
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
<template>
  <q-dialog v-model="showDialog" full-width persistent @before-hide="$emit('back')">
    <q-card class="br-15 text-bow pt-card-2" :class="getDarkModeClass(darkMode)">
      <div class="row justify-between q-pt-md q-pb-md">
        <span class="text-h6 q-pl-lg">Settings</span>
        <div>
          <q-btn
            flat
            padding=""
            icon="close"
            class="close-button"
            v-close-popup
          />
        </div>
      </div>

      <div style="max-height: 325px; overflow: auto" class="q-mb-md">
        <div class="q-mx-lg q-mb-lg text-bow" v-if="!loading">
          <div class="row">
            <span>Status: {{ isActive ? 'Active' : 'Inactive' }} </span>
            <q-icon
              class="q-py-xs q-mx-xs"
              size="1em"
              :color="isActive ? 'green' : 'grey'"
              name="circle"/>
          </div>
          <div class="row">
            <q-select
              color="primary"
              class="col"
              outlined
              v-model="selectedInactiveTime"
              :options="inactiveDurationOpts"
              hide-bottom-space
              dense
              :label="inactiveLabel"
              :hint="inactiveHint"
              :hide-hint="!isActive"
              @update:model-value="onSetInactive">
              <template v-slot:option="scope">
                <q-item :class="darkMode ?  'text-white' : 'text-black'">
                  {{ scope.opt.label }}
                </q-item>
              </template>
            </q-select>
          </div>
          <div v-if="!isActive" class="row justify-end q-mt-xs">
            <q-btn class="br-15 sm-font-size" dense flat @click="onSetActive()">Set as active</q-btn>
          </div>
        </div>
      </div>
    </q-card>
  </q-dialog>
</template>
<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import ConfirmationDialog from './ConfirmationDialog.vue'
import { backend } from 'src/exchange/backend'
import { bus } from 'src/wallet/event-bus.js'
import { wallet } from 'src/exchange/wallet'

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      username: 'Arbiter 1',
      status: 'Active',
      readOnlyState: true,
      currencies: null,
      inactiveFor: null,
      inactiveDurationOpts: [
        { label: '1 hour', value: 1 },
        { label: '3 hours', value: 3 },
        { label: '16 hours', value: 16 },
        { label: '24 hours', value: 24 },
        { label: 'Indefinitely', value: 438000 }
      ],
      loading: true,
      selectedInactiveTime: null,
      showDialog: true
    }
  },
  emits: ['setInactive', 'back'],
  computed: {
    inactiveLabel () {
      const indefinitely = this.inactiveFor?.affix?.startsWith('hour') && Number(this.inactiveFor?.value) > 24
      return this.isActive ? 'Set as inactive' : `Currently inactive ${!indefinitely ? 'for' : ''}`
    },
    inactiveHint () {
      return 'Set yourself as unavailable to oversee transactions for a period of time'
    },
    isActive () {
      return !this.inactiveFor || this.inactiveFor?.value < 0
    }
  },
  watch: {},
  async mounted () {
    await this.fetchUserData()
    this.loading = false
  },
  methods: {
    getDarkModeClass,
    fetchUserData () {
      return new Promise((resolve, reject) => {
        backend.get(`/ramp-p2p/arbiter/${wallet.walletHash}`, { authorize: true })
          .then((response) => {
            this.currencies = response.data?.fiat_currencies
            this.selectedInactiveTime = null
            const providedTimestamp = new Date(response.data?.inactive_until).getTime()
            const currentTimestamp = Date.now()
            const millisecondsDifference = providedTimestamp - currentTimestamp
            const hoursDifference = millisecondsDifference / (1000 * 60 * 60)
            let inactiveFor = {
              value: Number(Math.ceil(hoursDifference)),
              affix: hoursDifference.toFixed(0) > 1 ? 'hours' : 'hour'
            }
            if (hoursDifference < 1) {
              const minutesDifference = millisecondsDifference / (1000 * 60)
              inactiveFor = {
                value: Number(minutesDifference.toFixed(0)),
                affix: minutesDifference.toFixed(0) > 1 ? 'minutes' : 'minute'
              }
            }
            if (inactiveFor.value > 0) {
              if (inactiveFor.affix?.startsWith('hour') && inactiveFor.value > 24) {
                this.selectedInactiveTime = 'Indefinitely'
              } else {
                this.selectedInactiveTime = `${inactiveFor.value} ${inactiveFor.affix}`
              }
            }
            this.inactiveFor = inactiveFor
            resolve(response.data)
          })
          .catch((error) => {
            this.handleRequestError(error)
            reject(error)
          })
      })
    },
    onSetActive () {
      const message = 'You will start to receive new contracts to oversee again.'
      this.$q.dialog({
        componentProps: {
          title: 'Are you sure?',
          message: message
        },
        component: ConfirmationDialog
      }).onOk(() => {
        this.setInactiveHours(-438000)
      }).onCancel(() => {})
    },
    onSetInactive (data) {
      const message = `You will no longer receive new contracts to oversee ${data.label === 'Indefinitely' ? 'indefinitely' : `in the next ${data.label}`}.
      However, we recommend continuing to oversee any existing contracts you’re currently handling.`
      this.$q.dialog({
        componentProps: {
          title: 'Are you sure?',
          message: message
        },
        component: ConfirmationDialog
      }).onOk(() => {
        this.setInactiveHours(data.value)
      }).onCancel(() => {})
    },
    setInactiveHours (hours) {
      const body = {
        inactive_hours: hours
      }
      backend.patch('/ramp-p2p/arbiter/', body, { authorize: true })
        .then(() => {
          this.fetchUserData()
          this.$emit('setInactive')
          this.$emit('back')
        })
        .catch((error) => {
          this.handleRequestError(error)
        })
    },
    editName () {
      this.readOnlyState = false
      this.$refs.inputRef.focus()
    },
    saveName () {
      // save name

      this.readOnlyState = true
      this.$refs.inputRef.blur()
    },
    separator (mode, index) {
      if (this.currencies.length - 2 < index) {
        return ''
      } else {
        return mode ? 'border-bottom: 1px solid grey' : 'border-bottom: 1px solid #DAE0E7'
      }
    },
    handleRequestError (error) {
      bus.emit('handle-request-error', error)
    }
  }
}
</script>
<style lang="scss" scoped>
.inactive-color {
  color: #ed5e59;
  -webkit-text-fill-color: #ed5e59;
}
.active-color {
  color: #8ec351;
  -webkit-text-fill-color: #8ec351;
}
</style>

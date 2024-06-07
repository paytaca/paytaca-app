<template>
  <q-dialog full-width persistent>
    <q-card class="br-15 text-bow" :class="getDarkModeClass(darkMode)">
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

      <q-scroll-area style="height: 325px;" class="q-mb-md">
        <div class="q-mx-lg q-mb-lg text-bow">
          <div class="row">
            <div class="col-auto">
              <span>Status: {{ isActive ? 'Active' : 'Inactive' }} </span><q-icon class="q-my-sm q-mx-xs" :color="isActive ? 'green': 'red'" :name="isActive ? 'visibility': 'visibility_off'"/></div>
          </div>
          <div class="row">
            <q-select
              class="col"
              outlined
              v-model="selectedInactiveTime"
              :options="inactiveDurationOpts"
              hide-bottom-space
              dense
              :hide-dropdown-icon="!isActive"
              :readonly="!isActive"
              :hide-hint="!isActive"
              :label="inactiveLabel"
              :hint="inactiveHint"
              @update:model-value="onSetInactive">
            </q-select>
          </div>
          <div v-if="!isActive" class="row q-mt-sm">
            <q-btn class="col br-15 q-mx-lg sm-font-size button" dense flat @click="onSetActive()">Set as active</q-btn>
          </div>

          <div class="q-pt-md">
            <div>Currency</div>
            <q-list dense bordered padding class="rounded-borders">
              <q-item v-for="(currency, index) in currencies" :key="index" :style="separator(darkMode, index)">
                <q-item-section>
                  {{ currency }}
                </q-item-section>
              </q-item>
            </q-list>
          </div>
        </div>
      </q-scroll-area>
    </q-card>
  </q-dialog>
</template>
<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import ConfirmationDialog from './ConfirmationDialog.vue'
import { backend } from 'src/wallet/ramp/backend'

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      username: 'Arbiter 1',
      status: 'Active',
      readOnlyState: true,
      currencies: ['PHP', 'USD', 'CAD'],
      inactiveFor: null,
      inactiveDurationOpts: [
        { label: '1 hour', value: 1 },
        { label: '3 hours', value: 3 },
        { label: '16 hours', value: 16 },
        { label: '24 hours', value: 24 },
        { label: 'Indefinitely', value: 438000 }
      ],
      loading: true,
      selectedInactiveTime: null
    }
  },
  computed: {
    inactiveLabel () {
      return this.isActive ? 'Set as inactive' : `Currently inactive ${Number(this.inactiveFor?.value) <= 24 ? 'for' : ''}`
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
        backend.get('ramp-p2p/arbiter/detail', { authorize: true })
          .then((response) => {
            this.selectedInactiveTime = null
            const providedTimestamp = new Date(response.data?.inactive_until).getTime()
            const currentTimestamp = Date.now()
            const millisecondsDifference = providedTimestamp - currentTimestamp
            const hoursDifference = millisecondsDifference / (1000 * 60 * 60)
            let inactiveFor = {
              value: hoursDifference.toFixed(0),
              affix: 'hour(s)'
            }
            if (hoursDifference < 1) {
              const minutesDifference = millisecondsDifference / (1000 * 60)
              inactiveFor = {
                value: minutesDifference.toFixed(0),
                affix: 'minute(s)'
              }
            }
            if (inactiveFor.value > 0) {
              if (inactiveFor.value > 24) {
                this.selectedInactiveTime = 'Indefinitely'
              } else {
                this.selectedInactiveTime = `${inactiveFor.value} ${inactiveFor.affix}`
              }
            }
            this.inactiveFor = inactiveFor
            resolve(response.data)
          })
          .catch((error) => { reject(error) })
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
      backend.patch('ramp-p2p/arbiter/detail', body, { authorize: true })
        .then(() => {
          this.fetchUserData()
        })
        .catch((error) => { console.error(error?.response) })
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

<template>
  <q-dialog full-width persistent>
    <q-card class="br-15">
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
        <div class="q-mx-lg q-mb-lg">
          <div class="q-pt-md">
            <div>
              <q-select
                outlined
                v-model="unavailableFor"
                :options="unavailableDurationOpts"
                hide-bottom-space
                :hide-hint="!unavailableHint"
                dense
                :label="!unavailableFor ? 'Set as unavailable': 'Set as unavailable for the next'"
                :hint="unavailableHint">
              </q-select>
            </div>
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
      isActive: true,
      status: 'Active',
      readOnlyState: true,
      currencies: ['PHP', 'USD', 'CAD'],
      unavailableFor: null,
      unavailableDurationOpts: [
        { label: '1 hour', value: 1 },
        { label: '3 hours', value: 3 },
        { label: '16 hours', value: 16 },
        { label: '24 hours', value: 24 },
        { label: 'Indefinitely', value: 438000 }
      ],
      loading: true
    }
  },
  computed: {
    unavailableHint () {
      return !this.unavailableFor ? 'Set yourself as unavailable to oversee transactions for a period of time' : ''
    }
  },
  watch: {
    isActive (stat) {
      if (stat) {
        this.status = 'Active'
      } else {
        this.status = 'Inactive'
      }
    },
    unavailableFor (value) {
      if (this.loading) return
      this.onSetUnavailable(value)
    }
  },
  async mounted () {
    // console.log('userData:', this.userData)
    // this.unavailableFor = this.userData.unavailable_until
    await this.fetchUserData()
    this.loading = false
    console.log('unavailableFor:', this.unavailableFor)
  },
  methods: {
    getDarkModeClass,
    fetchUserData () {
      return new Promise((resolve, reject) => {
        backend.get('ramp-p2p/arbiter/detail', { authorize: true })
          .then((response) => {
            console.log(response.data)
            this.unavailableFor = response.data?.unavailable_until
            const providedTimestamp = new Date(response.data?.unavailable_until).getTime()
            const currentTimestamp = Date.now()
            const millisecondsDifference = providedTimestamp - currentTimestamp
            const hoursDifference = millisecondsDifference / (1000 * 60 * 60)
            let unavailableFor = `${hoursDifference.toFixed(0)} hour(s)`
            if (hoursDifference < 1) {
              const minutesDifference = millisecondsDifference / (1000 * 60)
              unavailableFor = `${minutesDifference.toFixed(0)} minutes`
            }
            this.unavailableFor = unavailableFor
            resolve(response.data)
          })
          .catch((error) => { reject(error) })
          .finally(() => {
            if (this.unavailableFor) {
              this.unavailableDurationOpts.unshift({ label: 'Set as available', value: -24 })
            }
          })
      })
    },
    onSetUnavailable (data) {
      console.log('setUnavailable:', data.label)
      // this.showConfirmUnavailableDialog = true
      const message = `You’ll no longer receive new contracts to oversee ${data.label === 'Indefinitely' ? 'indefinitely' : `in the next ${data.label}`}. 
      However, we recommend continuing to oversee any existing contracts you’re currently handling.`
      this.$q.dialog({
        componentProps: {
          title: 'Are you sure?',
          message: message
        },
        component: ConfirmationDialog
      }).onOk(() => {
        this.setUnavailable(data.value)
      }).onCancel(() => {
        console.log('back')
      })
    },
    setUnavailable (hours) {
      const body = {
        unavailable_hours: hours
      }
      backend.patch('ramp-p2p/arbiter/detail', body, { authorize: true })
        .then((response) => {
          console.log(response.data)
        })
        .catch((error) => {
          console.error(error?.response)
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

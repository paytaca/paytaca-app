<template>
  <q-dialog ref="enter-country-city" seamless persistent class="no-click-outside">
    <q-card
      style="min-width: 350px"
      class="br-15 pt-card text-bow"
      :class="getDarkModeClass(darkMode)"
    >
      <q-card-section>
        <div class="text-h5" style="font-size: 18px;">
          {{ currentName ? 'Update' : 'Enter' }} {{ enterType }}
        </div>
      </q-card-section>

      <q-card-section class="q-pt-none">
        <q-input
          :dark="darkMode"
          :disable="isLoading"
          :loading="isLoading"
          dense
          v-model="name"
          autofocus
          @keyup.enter="v-close-popup"
        />
      </q-card-section>

      <q-card-actions align="right" class="text-primary">
        <q-btn
          flat
          :disable="isLoading"
          :label="$t('Cancel')"
          v-close-popup
        />
        <q-btn
          flat
          :disable="isLoading"
          :label="$t(currentName ? 'Update' : 'OK')"
          @click="updateCountryCity"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { updateDeviceNotifType, parseDeviceId } from 'src/utils/engagementhub-utils'

export default {
  name: 'EnterCountryCityDialog',

  props: {
    currentName: { type: String, default: '' },
    enterType: { type: String, default: 'country' },
    deviceNotifTypesId: { type: Number, default: -1 }
  },

  data () {
    return {
      name: '',
      isLoading: false
    }
  },

  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    }
  },

  async mounted () {
    const vm = this

    vm.isLoading = true
    vm.name = this.currentName
    vm.isLoading = false
  },

  methods: {
    getDarkModeClass,

    async updateCountryCity () {
      const vm = this

      vm.isLoading = true

      const deviceId = parseDeviceId(vm.$pushNotifications.deviceId)
      const data = { db_col: vm.enterType, value: vm.name }
      await updateDeviceNotifType(vm.deviceNotifTypesId, data, deviceId)
      vm.$emit('ok', vm.name)
      vm.$refs['enter-country-city'].hide()

      vm.isLoading = false
    }
  }
}
</script>

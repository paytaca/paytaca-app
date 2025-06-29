<template>
  <q-dialog ref="enter-country-city" seamless persistent class="no-click-outside">
    <q-card
      style="min-width: 350px"
      class="br-15 pt-card text-bow"
      :class="getDarkModeClass(darkMode)"
    >
      <q-card-section>
        <div class="text-h5" style="font-size: 18px;">
          {{ $t(`${currentName ? 'Update' : 'Enter'}${enterType}`) }}
        </div>
      </q-card-section>

      <q-card-section class="q-pt-none row flex-center">
        <q-select
          dense
          use-input
          fill-input
          hide-selected
          clearable
          popup-content-style="color: black;"
          v-model="name"
          style="width: 75%"
          :options="choices"
          :dark="darkMode"
        >
        <template v-slot:option="scope">
          <q-item
            v-bind="scope.itemProps"
          >
            <q-item-section>
              <q-item-label :class="{ 'text-black': !darkMode && !scope.selected }">
                {{ scope.opt.label }}
              </q-item-label>
              <q-item-label
                v-if="scope.opt.subLabel"
                caption
                :class="{ 'text-black': !darkMode && !scope.selected }"
              >
                {{ scope.opt.subLabel }}
              </q-item-label>
            </q-item-section>
          </q-item>
        </template>
        </q-select>
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
import { updateDeviceNotifType, parseDeviceId } from 'src/utils/engagementhub-utils/engagementhub-utils'

export default {
  name: 'EnterCountryCityDialog',

  props: {
    currentName: {
      type: Object,
      default (rawProps) { return {} }
    },
    enterType: { type: String, default: 'Country' },
    deviceNotifTypesId: { type: Number, default: -1 },
    choices: {
      type: Array,
      default (rawProps) { return [] }
    }
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
      const value = vm.name?.value ? vm.name.value : null
      const data = { db_col: vm.enterType.toLowerCase(), value }
      await updateDeviceNotifType(vm.deviceNotifTypesId, data, deviceId)
      vm.$emit('ok', vm.name)
      vm.$refs['enter-country-city'].hide()

      vm.isLoading = false
    }
  }
}
</script>

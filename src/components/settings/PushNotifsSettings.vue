<template>
  <div class="col-12 q-px-lg q-mt-md">
    <p class="q-px-sm q-my-sm dim-text section-title text-h6">{{ $t('PushNotifications') }}</p>
    <q-list bordered separator class="pt-card" :class="getDarkModeClass(darkMode)">
      <q-item>
        <q-item-section>
          <q-item-label class="pt-setting-menu" :class="getDarkModeClass(darkMode)">
            {{ $t('EnablePushNotifications') }}
          </q-item-label>
        </q-item-section>
        <q-item-section avatar>
          <template v-if="isEnablePushNotifsLoading">
            <ProgressLoader :color="isNotDefaultTheme(theme) ? theme : 'pink'" />
          </template>
          <template v-else>
            <q-toggle
              v-model="enablePushNotifs"
              color="blue-9"
              keep-color
              @click="handleNotifsSubscription"
            />
          </template>
        </q-item-section>
      </q-item>

      <template v-if="enablePushNotifs && !isEnablePushNotifsLoading">
        <q-item>
          <q-item-section>
            <q-item-label class="q-pl-sm pt-setting-menu" :class="getDarkModeClass(darkMode)">
              {{ $t('EventsAndPromotions') }}
            </q-item-label>
          </q-item-section>

          <q-item-section avatar>
            <template v-if="isEnableEventsAndPromosIsLoading">
              <ProgressLoader :color="isNotDefaultTheme(theme) ? theme : 'pink'" />
            </template>
            <template v-else>
              <q-toggle
                v-model="isEnableEventsAndPromos"
                color="blue-9"
                keep-color
                @click="handleNotifTypesSubscription({
                  db_col: 'is_events_promotions_enabled',
                  value: isEnableEventsAndPromos
                })"
              />
            </template>
          </q-item-section>
        </q-item>

        <template v-if="isEnableEventsAndPromos">
          <q-item
            v-for="(item, index) in eventsAndPromosSubList"
            :key="`${item}-${index}`"
          >
            <q-item-section>
              <q-item-label class="q-pl-md pt-setting-menu" :class="getDarkModeClass(darkMode)">
                {{ item.label }}
                <q-icon name="info">
                  <q-tooltip
                    anchor="top end"
                    self="bottom end"
                    max-width="65%"
                  >
                    {{ item.subLabel }}
                  </q-tooltip>
                </q-icon>
              </q-item-label>

              <q-item-label
                v-if="item.isEnabled"
                class="q-pl-md button button-text-primary"
                :class="getDarkModeClass(darkMode)"
                style="text-decoration: underline"
                @click="openEnterCountryCityDialog(index)"
              >
                {{ item.inputLabel }}
              </q-item-label>
            </q-item-section>

            <q-item-section avatar>
              <template v-if="item.isLoading">
                <ProgressLoader :color="isNotDefaultTheme(theme) ? theme : 'pink'" />
              </template>
              <template v-else>
                <q-toggle
                  v-model="item.isEnabled"
                  color="blue-9"
                  keep-color
                  @click="() => {
                    handleNotifTypesSubscription({
                      db_col: item.dbCol,
                      value: item.isEnabled
                    })
                  }"
                />
              </template>
            </q-item-section>
          </q-item>
        </template>
      </template>
    </q-list>
  </div>
</template>

<script>
import Watchtower from 'watchtower-cash-js'

import { getDarkModeClass, isNotDefaultTheme } from 'src/utils/theme-darkmode-utils'
import { loadWallet } from 'src/wallet'
import { getWalletByNetwork } from 'src/wallet/chipnet'
import {
  getPushNotifConfigs,
  updateDeviceNotifType,
  parseDeviceId,
  deleteDeviceNotifType
} from 'src/utils/engagementhub-utils'

import ProgressLoader from 'src/components/ProgressLoader.vue'
import EnterCountryCityDialog from 'src/components/settings/EnterCountryCityDialog.vue'

export default {
  name: 'PushNotifsSettings',

  components: {
    ProgressLoader
  },

  data () {
    return {
      enablePushNotifs: true,
      isEnablePushNotifsLoading: false,
      isEnableEventsAndPromos: false,
      isEnableEventsAndPromosIsLoading: false,

      deviceNotifTypesId: -1,

      eventsAndPromosSubList: [
        {
          label: this.$t('ByCountry'),
          dbCol: 'is_by_country_enabled',
          isEnabled: false,
          isLoading: false,
          subLabel: this.$t('CountrySubLabel'),
          inputLabel: this.$t('EnterCountry'),
          value: ''
        },
        {
          label: this.$t('ByCity'),
          dbCol: 'is_by_city_enabled',
          isEnabled: false,
          isLoading: false,
          subLabel: this.$t('CitySubLabel'),
          inputLabel: this.$t('EnterCity'),
          value: ''
        }
      ]
    }
  },

  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    theme () {
      return this.$store.getters['global/theme']
    }
  },

  async mounted () {
    const vm = this
    vm.isEnablePushNotifsLoading = true

    // check if push notifs are enabled
    // if enabled, turn on enable push notifications by default
    // else turn it off

    await vm.$pushNotifications.isPushNotificationEnabled().catch(console.log)
    if (!vm.$pushNotifications.isEnabled && !vm.promptedPushNotifications) {
      vm.enablePushNotifs = false
    } else {
      const deviceId = parseDeviceId(vm.$pushNotifications.deviceId)
      await getPushNotifConfigs(deviceId)
        .then(async data => {
          vm.enablePushNotifs = data.is_enabled
          const configs = data.push_notif_configs
          if (Object.keys(configs).length > 0) {
            vm.deviceNotifTypesId = configs.id
            vm.isEnableEventsAndPromos = configs.is_events_promotions_enabled
            vm.eventsAndPromosSubList[0].isEnabled = configs.is_by_country_enabled
            vm.eventsAndPromosSubList[1].isEnabled = configs.is_by_city_enabled
            vm.eventsAndPromosSubList[0].value = configs.country
            vm.eventsAndPromosSubList[1].value = configs.city

            const countryLabel = configs.country ? this.$t('UpdateCountry') : this.$t('EnterCountry')
            const cityLabel = configs.city ? this.$t('UpdateCity') : this.$t('EnterCity')
            vm.eventsAndPromosSubList[0].inputLabel = countryLabel
            vm.eventsAndPromosSubList[1].inputLabel = cityLabel
          } else await vm.handleNotifTypesSubscription(null)
        })
    }

    this.isEnablePushNotifsLoading = false
  },

  methods: {
    getDarkModeClass,
    isNotDefaultTheme,
    async handleNotifsSubscription () {
      const vm = this
      vm.isEnablePushNotifsLoading = true
      const multiWalletIndex = vm.$store.getters['global/getWalletIndex']
      const wallet = await loadWallet('BCH', multiWalletIndex)
      const walletHashes = [
        getWalletByNetwork(wallet, 'bch').getWalletHash(),
        getWalletByNetwork(wallet, 'slp').getWalletHash(),
        wallet.sBCH.getWalletHash()
      ]

      if (vm.enablePushNotifs) {
        await vm.$pushNotifications.isPushNotificationEnabled().catch(console.log)
        if (!vm.$pushNotifications.isEnabled && !vm.promptedPushNotifications) {
          await vm.$pushNotifications.openPushNotificationsSettingsPrompt({
            message: 'Enable push notifications to receive updates from the app'
          }).catch(console.log)
        } else {
          vm.$pushNotifications.watchtower = new Watchtower(vm.$store.state.global.isChipnet)
          await vm.$pushNotifications.subscribe(walletHashes, multiWalletIndex)
          await vm.handleNotifTypesSubscription(null)
        }
      } else {
        await vm.$pushNotifications.unsubscribe(walletHashes)
        await deleteDeviceNotifType(this.deviceNotifTypesId)
        this.deviceNotifTypesId = -1
      }

      vm.isEnablePushNotifsLoading = false
    },
    async handleNotifTypesSubscription (type) {
      const vm = this

      if (type?.dbCol === 'is_events_promotions_enabled') {
        vm.isEnableEventsAndPromosIsLoading = true
      } else if (type?.dbCol === 'is_by_country_enabled') {
        vm.eventsAndPromosSubList[0].isLoading = true
      } else if (type?.dbCol === 'is_by_city_enabled') {
        vm.eventsAndPromosSubList[1].isLoading = true
      }

      const deviceId = parseDeviceId(vm.$pushNotifications.deviceId)
      await updateDeviceNotifType(vm.deviceNotifTypesId, type, deviceId)
        .then(resp => {
          vm.deviceNotifTypesId = resp
          if (type?.dbCol === 'is_events_promotions_enabled') {
            vm.isEnableEventsAndPromosIsLoading = false
          } else if (type?.dbCol === 'is_by_country_enabled') {
            vm.eventsAndPromosSubList[0].isLoading = false
          } else if (type?.dbCol === 'is_by_city_enabled') {
            vm.eventsAndPromosSubList[1].isLoading = false
          }
        })
    },
    openEnterCountryCityDialog (enterType) {
      const vm = this

      const enterTypeText = enterType === 0 ? 'Country' : 'City'
      vm.$q.dialog({
        component: EnterCountryCityDialog,
        componentProps: {
          currentName: vm.eventsAndPromosSubList[enterType].value,
          enterType: enterTypeText,
          deviceNotifTypesId: vm.deviceNotifTypesId
        }
      }).onOk(response => {
        vm.eventsAndPromosSubList[enterType].value = response
        const inputLabel = this.$t(`${response ? 'Update' : 'Enter'}${enterTypeText}`)
        vm.eventsAndPromosSubList[enterType].inputLabel = inputLabel
      })
    }
  }
}
</script>

<style lang="scss">
.lds-ellipsis {
  height: 32px !important;

  & div {
    top: 10px !important;
  }
}
</style>

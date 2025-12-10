<template>
  <div class="col-12 q-px-lg q-mt-md text-bow" :class="getDarkModeClass(darkMode)">
    <p class="q-px-sm q-my-sm section-title text-subtitle1">{{ $t('Advertisements') }}</p>
    <q-list bordered separator class="pt-card settings-list" :class="getDarkModeClass(darkMode)">
      <q-item>
        <q-item-section>
          <q-item-label class="pt-setting-menu" :class="getDarkModeClass(darkMode)">
            {{ $t('EnableAdvertisements') }}
          </q-item-label>
        </q-item-section>
        <q-item-section avatar>
          <template v-if="isEnableAdvertisementsLoading">
            <ProgressLoader />
          </template>
          <template v-else>
            <q-toggle
              v-model="enableAdvertisements"
              :color="toggleColor"
              keep-color
              @update:model-value="handleAdvertisementsSubscription"
            />
          </template>
        </q-item-section>
      </q-item>

      <template v-if="enableAdvertisements && !isEnableAdvertisementsLoading">
        <q-item>
          <q-item-section>
            <q-item-label class="q-pl-sm pt-setting-menu" :class="getDarkModeClass(darkMode)">
              {{ $t('EventsAndPromotions') }}
            </q-item-label>
          </q-item-section>

          <q-item-section avatar>
            <template v-if="isEnableEventsAndPromosIsLoading">
              <ProgressLoader />
            </template>
            <template v-else>
            <q-toggle
              v-model="isEnableEventsAndPromos"
              :color="toggleColor"
              keep-color
              @update:model-value="(value) => handleAdvertisementTypesSubscription({
                db_col: 'is_events_promotions_enabled',
                value: value
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
                <ProgressLoader />
              </template>
              <template v-else>
                <q-toggle
                  v-model="item.isEnabled"
                  :color="toggleColor"
                  keep-color
                  @update:model-value="(value) => {
                    handleAdvertisementTypesSubscription({
                      db_col: item.dbCol,
                      value: value
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
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import {
  getPushNotifConfigs,
  updateDeviceNotifType,
  parseDeviceId,
  deleteDeviceNotifType,
  getCountryCityData
} from 'src/utils/engagementhub-utils/engagementhub-utils'
import { loadWallet } from 'src/wallet'
import { getWalletByNetwork } from 'src/wallet/chipnet'
import Watchtower from 'watchtower-cash-js'

import ProgressLoader from 'src/components/ProgressLoader.vue'
import EnterCountryCityDialog from 'src/components/settings/EnterCountryCityDialog.vue'

export default {
  name: 'AdvertisementsSettings',

  components: {
    ProgressLoader
  },

  data () {
    return {
      enableAdvertisements: true,
      isEnableAdvertisementsLoading: false,
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
          value: null
        },
        {
          label: this.$t('ByCity'),
          dbCol: 'is_by_city_enabled',
          isEnabled: false,
          isLoading: false,
          subLabel: this.$t('CitySubLabel'),
          inputLabel: this.$t('EnterCity'),
          value: null
        }
      ],
      countryCityData: []
    }
  },

  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    theme () {
      return this.$store.getters['global/theme']
    },
    toggleColor () {
      const theme = this.$store.getters['global/theme']
      if (theme === 'glassmorphic-red') return 'pink-6'
      if (theme === 'glassmorphic-green') return 'green-6'
      if (theme === 'glassmorphic-gold') return 'amber-7'
      return 'blue-6'
    }
  },

  async mounted () {
    const vm = this
    vm.isEnableAdvertisementsLoading = true

    // check if advertisements are enabled
    // if enabled, turn on enable advertisements by default
    // else turn it off

    await vm.$pushNotifications.isPushNotificationEnabled().catch(console.log)
    if (!vm.$pushNotifications.isEnabled && !vm.promptedPushNotifications) {
      vm.enableAdvertisements = false
    } else {
      const deviceId = parseDeviceId(vm.$pushNotifications.deviceId)
      await getPushNotifConfigs(deviceId)
        .then(async data => {
          if (data) {
            vm.enableAdvertisements = data.is_enabled
            const configs = data.push_notif_configs
            if (Object.keys(configs).length > 0) {
              vm.deviceNotifTypesId = configs.id
              vm.isEnableEventsAndPromos = configs.is_events_promotions_enabled
              vm.eventsAndPromosSubList[0].isEnabled = configs.is_by_country_enabled
              vm.eventsAndPromosSubList[1].isEnabled = configs.is_by_city_enabled
              vm.eventsAndPromosSubList[0].value = configs.country
              vm.eventsAndPromosSubList[1].value = configs.city
            } else await vm.handleAdvertisementTypesSubscription(null)
          } else {
            vm.enableAdvertisements = false
          }
        })
        .catch(() => {
          vm.enableAdvertisements = false
        })
    }

    vm.countryCityData = await getCountryCityData()
    // set country and city value
    const currentCountry = vm.eventsAndPromosSubList[0].value
    const currentCity = vm.eventsAndPromosSubList[1].value
    let countryLabel = this.$t('EnterCountry')
    let cityLabel = this.$t('EnterCity')

    if (currentCountry) {
      const country = vm.countryCityData
        .filter(a => a.id === currentCountry)
        .map(b => {
          return {
            label: b.name,
            value: b.id,
            subLabel: ''
          }
        })
      vm.eventsAndPromosSubList[0].value = country[0]
      countryLabel = country[0].label
    }

    if (currentCity) {
      const choices = this.parseCities()
      const city = choices.filter(a => a.value === currentCity)
      vm.eventsAndPromosSubList[1].value = city[0]
      cityLabel = city[0].label
    }

    vm.eventsAndPromosSubList[0].inputLabel = countryLabel
    vm.eventsAndPromosSubList[1].inputLabel = cityLabel

    this.isEnableAdvertisementsLoading = false
  },

  methods: {
    getDarkModeClass,
    async handleAdvertisementsSubscription (newValue) {
      const vm = this
      // Use the new value from the event, or fall back to the current model value
      const shouldEnable = newValue !== undefined ? newValue : vm.enableAdvertisements
      const previousValue = vm.enableAdvertisements
      vm.isEnableAdvertisementsLoading = true
      
      try {
        const multiWalletIndex = vm.$store.getters['global/getWalletIndex']
        const wallet = await loadWallet('BCH', multiWalletIndex)
        const walletHashes = [
          getWalletByNetwork(wallet, 'bch').getWalletHash(),
          getWalletByNetwork(wallet, 'slp').getWalletHash(),
          wallet.sBCH.getWalletHash()
        ]

        if (shouldEnable) {
          await vm.$pushNotifications.isPushNotificationEnabled().catch(console.log)
          if (!vm.$pushNotifications.isEnabled && !vm.promptedPushNotifications) {
            await vm.$pushNotifications.openPushNotificationsSettingsPrompt({
              message: 'Enable push notifications to receive updates from the app'
            }).catch(console.log)
            // If user cancels permission, revert the toggle
            if (!vm.$pushNotifications.isEnabled) {
              vm.enableAdvertisements = previousValue
              vm.isEnableAdvertisementsLoading = false
              return
            }
          }
          vm.$pushNotifications.watchtower = new Watchtower(vm.$store.state.global.isChipnet)
          await vm.$pushNotifications.subscribe(walletHashes, multiWalletIndex)
          await vm.handleAdvertisementTypesSubscription(null)
        } else {
          await vm.$pushNotifications.unsubscribe(walletHashes)
          await deleteDeviceNotifType(this.deviceNotifTypesId)
          this.deviceNotifTypesId = -1
          // Reset sub-options when disabling
          vm.isEnableEventsAndPromos = false
          vm.eventsAndPromosSubList[0].isEnabled = false
          vm.eventsAndPromosSubList[1].isEnabled = false
        }
      } catch (error) {
        console.error('Error updating advertisement settings:', error)
        // Revert toggle on error
        vm.enableAdvertisements = previousValue
      } finally {
        vm.isEnableAdvertisementsLoading = false
      }
    },
    async handleAdvertisementTypesSubscription (type) {
      const vm = this
      
      // Store previous values for rollback on error
      let previousValue = null
      let previousItemIndex = null

      if (type?.dbCol === 'is_events_promotions_enabled') {
        vm.isEnableEventsAndPromosIsLoading = true
        previousValue = vm.isEnableEventsAndPromos
      } else if (type?.dbCol === 'is_by_country_enabled') {
        vm.eventsAndPromosSubList[0].isLoading = true
        previousValue = vm.eventsAndPromosSubList[0].isEnabled
        previousItemIndex = 0
      } else if (type?.dbCol === 'is_by_city_enabled') {
        vm.eventsAndPromosSubList[1].isLoading = true
        previousValue = vm.eventsAndPromosSubList[1].isEnabled
        previousItemIndex = 1
      }

      try {
        const deviceId = parseDeviceId(vm.$pushNotifications.deviceId)
        const resp = await updateDeviceNotifType(vm.deviceNotifTypesId, type, deviceId)
        vm.deviceNotifTypesId = resp
      } catch (error) {
        console.error('Error updating advertisement type settings:', error)
        // Revert toggle on error
        if (type?.dbCol === 'is_events_promotions_enabled') {
          vm.isEnableEventsAndPromos = previousValue
        } else if (previousItemIndex !== null) {
          vm.eventsAndPromosSubList[previousItemIndex].isEnabled = previousValue
        }
      } finally {
        if (type?.dbCol === 'is_events_promotions_enabled') {
          vm.isEnableEventsAndPromosIsLoading = false
        } else if (type?.dbCol === 'is_by_country_enabled') {
          vm.eventsAndPromosSubList[0].isLoading = false
        } else if (type?.dbCol === 'is_by_city_enabled') {
          vm.eventsAndPromosSubList[1].isLoading = false
        }
      }
    },
    openEnterCountryCityDialog (enterType) {
      const vm = this
      const enterTypeText = enterType === 0 ? 'Country' : 'City'

      let choices = []
      if (enterType === 0) {
        choices = vm.countryCityData.map(a => {
          return {
            label: a.name,
            value: a.id,
            subLabel: ''
          }
        })
      } else {
        const countryId = vm.eventsAndPromosSubList[0].value?.value
        if (countryId) {
          const country = vm.countryCityData.filter(a => a.id === countryId)
          choices = country[0].cities.map(b => {
            return {
              label: b.name,
              value: b.id,
              subLabel: country.name
            }
          })
        } else {
          choices = this.parseCities()
          choices = choices.sort((a, b) => a.label.localeCompare(b.label))
        }
      }

      vm.$q.dialog({
        component: EnterCountryCityDialog,
        componentProps: {
          currentName: vm.eventsAndPromosSubList[enterType].value,
          enterType: enterTypeText,
          deviceNotifTypesId: vm.deviceNotifTypesId,
          choices
        }
      }).onOk(response => {
        vm.eventsAndPromosSubList[enterType].value = response
        const inputLabel = response ? response.label : this.$t(`Enter${enterTypeText}`)
        vm.eventsAndPromosSubList[enterType].inputLabel = inputLabel

        if (enterType === 0) {
          vm.eventsAndPromosSubList[1].value = null
          vm.eventsAndPromosSubList[1].inputLabel = this.$t('EnterCity')
        }
      })
    },

    parseCities () {
      const choices = []
      this.countryCityData.forEach((country) => {
        country.cities.forEach((city) => {
          choices.push({
            label: city.name,
            value: city.id,
            subLabel: country.name
          })
        })
      })
      return choices
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

<style lang="scss" scoped>
.section-title {
  font-weight: 600;
  font-size: 16px;
  letter-spacing: 0.5px;
  opacity: 0.85;
  
  &.dark {
    color: rgba(255, 255, 255, 0.8);
  }
  &.light {
    color: rgba(0, 0, 0, 0.6);
  }
}

.pt-setting-caption {
  font-weight: 400;
  font-size: 13px;
  line-height: 1.4;
  opacity: 0.7;
  margin-top: 4px;
  
  &.dark {
    color: rgba(255, 255, 255, 0.65);
  }
  &.light {
    color: rgba(0, 0, 0, 0.6);
  }
}

.pt-setting-menu {
  font-weight: 400;
  font-size: 15px;
  &.dark {
    color: #e0e2e5;
  }
  &.light {
    color: rgba(0, 0, 0, 0.87);
  }
}

.pt-setting-avatar-dark {
  color: #A6ACAF;
}

.pt-label {
  font-size: 14px;
  &.dark {
    color: #e0e2e5;
  }
  &.light {
    color: rgba(0, 0, 0, 0.87);
  }
}

.pt-card {
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.settings-list {
  .q-item {
    padding: 16px 20px;
    min-height: 64px;
    
    &:not(:last-child) {
      border-bottom: 1px solid rgba(0, 0, 0, 0.06);
    }

    &.dark:not(:last-child) {
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }
  }

  :deep(.q-item__label--caption) {
    opacity: 0.7;
    margin-top: 4px;
    line-height: 1.3;
    font-size: 13px;
  }
}

#app-container {
  &.dark {
    .settings-list .q-item {
      &:not(:last-child) {
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      }
    }
  }
  
  &.light {
    .settings-list .q-item {
      &:not(:last-child) {
        border-bottom: 1px solid rgba(0, 0, 0, 0.06);
      }
    }
  }
}
</style>
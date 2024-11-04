<template>
  <div class="col-12 q-px-lg q-mt-md">
    <p class="q-px-sm q-my-sm dim-text section-title text-h6">Push Notifications</p>
    <q-list bordered separator class="pt-card" :class="getDarkModeClass(darkMode)">
      <q-item>
        <q-item-section>
          <q-item-label class="pt-setting-menu" :class="getDarkModeClass(darkMode)">
            Enable Push Notifications
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
              Events and Promotions
            </q-item-label>
          </q-item-section>

          <q-item-section avatar>
            <q-toggle
              v-model="isEnableEventsAndPromos"
              color="blue-9"
              keep-color
            />
              <!-- @click="handleNotifTypesSubscription(item)" -->
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
            </q-item-section>

            <q-item-section avatar>
              <q-toggle
                v-model="item.isEnabled"
                color="blue-9"
                keep-color
              />
                <!-- @click="handleNotifTypesSubscription(item)" -->
            </q-item-section>
          </q-item>
        </template>
      </template>
    </q-list>
  </div>
</template>

<script>
import Watchtower from 'watchtower-cash-js'

import { BigNumber } from 'ethers'
import { getDarkModeClass, isNotDefaultTheme } from 'src/utils/theme-darkmode-utils'
import { loadWallet } from 'src/wallet'
import { getWalletByNetwork } from 'src/wallet/chipnet'
import { getPushNotifConfigs, updateDeviceNotifType } from 'src/utils/engagementhub-utils'

import ProgressLoader from 'src/components/ProgressLoader.vue'

export default {
  name: 'PushNotifsSettings',

  components: {
    ProgressLoader
  },

  data () {
    return {
      enablePushNotifs: false,
      isEnablePushNotifsLoading: false,
      isEnableEventsAndPromos: false,

      deviceNotifTypesId: -1,

      eventsAndPromosSubList: [
        {
          label: 'By Country',
          subLabel:
              'Receive push notifications in your country only. If disabled, you will receive notifications from around the world.',
          isEnabled: false
        },
        {
          label: 'By City',
          subLabel: 'Receive push notifications in your city only. If disabled, you will receive notifications from cities all around the country - if By Country is enabled, else receive notifications from around the world.',
          isEnabled: false
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

    // adjust for ios
    const deviceId = BigNumber.from('0x' + vm.$pushNotifications.deviceId).toString()
    const data = await getPushNotifConfigs(deviceId)

    console.log(data)
    vm.enablePushNotifs = data.is_enabled
    // const configs = data.push_notif_configs
    // if (Object.keys(configs).length > 0) {
    //   vm.deviceNotifTypesId = configs.id
    //   vm.notifsList.forEach(type => {
    //     type.isEnabled = configs[type.db_col]
    //   })
    // }

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
          // await vm.handleNotifTypesSubscription(null)
        }
      } else {
        await vm.$pushNotifications.unsubscribe(walletHashes)
        this.deviceNotifTypesId = -1
      }

      vm.isEnablePushNotifsLoading = false
    },
    async handleNotifTypesSubscription (type) {
      // adjust for ios
      const deviceId = BigNumber.from('0x' + this.$pushNotifications.deviceId).toString()
      await updateDeviceNotifType(this.deviceNotifTypesId, type, deviceId)
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

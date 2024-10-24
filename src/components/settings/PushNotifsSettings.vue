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
        <q-item
          v-for="(item, index) in notifsList"
          :key="`${item}-${index}`"
        >
          <q-item-section>
            <q-item-label class="q-pl-md pt-setting-menu" :class="getDarkModeClass(darkMode)">
              {{ item.label }}
            </q-item-label>
          </q-item-section>

          <q-item-section avatar>
            <q-toggle
              v-model="item.isEnabled"
              color="blue-9"
              keep-color
            />
          </q-item-section>
        </q-item>
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
import { getPushNotifConfigs } from 'src/utils/engagementhub-utils'

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

      notifsList: [
        // {
        //   label: 'Promotions',
        //   isEnabled: false
        // },
        // {
        //   label: 'Events',
        //   isEnabled: false
        // },
        {
          label: this.$t('Transactions'),
          db_col: 'is_tr_enabled',
          isEnabled: false
        },
        {
          label: this.$t('Cashback'),
          db_col: 'is_cb_enabled',
          isEnabled: false
        },
        {
          label: this.$t('Marketplace'),
          db_col: 'is_mp_enabled',
          isEnabled: false
        },
        {
          label: 'AnyHedge',
          db_col: 'is_ah_enabled',
          isEnabled: false
        },
        {
          label: 'P2P Exchange',
          db_col: 'is_rp_enabled',
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
    this.isEnablePushNotifsLoading = true

    const deviceId = BigNumber.from('0x' + this.$pushNotifications.deviceId).toString()
    const data = await getPushNotifConfigs(deviceId)
    console.log(data)
    this.enablePushNotifs = data.is_enabled

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
        }
      } else {
        await vm.$pushNotifications.unsubscribe(walletHashes)
      }

      vm.isEnablePushNotifsLoading = false
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

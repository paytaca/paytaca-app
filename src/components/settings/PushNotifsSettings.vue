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
          <q-toggle
            v-model="enablePushNotifs"
            color="blue-9"
            keep-color
            @click="handleNotifsSubscription"
          />
        </q-item-section>
      </q-item>

      <template v-if="enablePushNotifs">
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

import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { loadWallet } from 'src/wallet'
import { getWalletByNetwork } from 'src/wallet/chipnet'

export default {
  name: 'PushNotifsSettings',

  data () {
    return {
      enablePushNotifs: false,
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
          isEnabled: false
        },
        {
          label: this.$t('Cashback'),
          isEnabled: false
        },
        {
          label: this.$t('Marketplace'),
          isEnabled: false
        },
        {
          label: 'AnyHedge',
          isEnabled: false
        },
        {
          label: 'P2P Exchange',
          isEnabled: false
        }
      ]
    }
  },

  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    }
  },

  methods: {
    getDarkModeClass,
    async handleNotifsSubscription () {
      const vm = this
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
    }
  }
}
</script>

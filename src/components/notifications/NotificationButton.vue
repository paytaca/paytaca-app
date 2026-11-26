<template>
  <div class="col-2 flex justify-end" v-if="!isChipnet">
    <q-btn
      flat
      round
      icon="notifications"
      class="text-bow"
      :class="getDarkModeClass(darkMode)"
      data-tour="notifications"
      @click="openNotificationsDialog"
    >
      <q-badge color="red" floating v-if="notifsCount > 0">{{ notifsCount }}</q-badge>
    </q-btn>
  </div>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { getNotificationWsTicket, getWalletUnreadNotifs } from 'src/utils/engagementhub-utils/engagementhub-utils'
import { isWalletRequestSigningEnabled } from 'src/utils/request-signing'
import { createNotificationSocket } from 'src/utils/notification-ws'

import Notifications from 'src/components/notifications/index.vue'

export default {
  name: 'NotificationButton',

  emits: [
    'find-and-open-transaction'
  ],

  data () {
    return {
      notifsCount: 0
    }
  },

  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    isMobile () {
      return this.$q.platform.is.mobile || this.$q.platform.is.android || this.$q.platform.is.ios
    },
    isChipnet () {
      return this.$store.getters['global/isChipnet']
    },
    currentWalletHash () {
      return this.$store.getters['global/getWallet']('bch')?.walletHash
    }
  },

  async mounted () {
    const vm = this
    const walletHash = vm.currentWalletHash

    vm.notifsCount = await getWalletUnreadNotifs(walletHash)
    if (vm._notificationSocketStopped) return

    vm._notificationSocket = createNotificationSocket({
      walletHash,
      baseUrl: process.env.ENGAGEMENT_HUB_WS_URL,
      fetchTicket: getNotificationWsTicket,
      isSigningEnabled: isWalletRequestSigningEnabled,
      createSocket: (url) => new WebSocket(url),
      onUnreadCount: (count) => { vm.notifsCount = count }
    })
    await vm._notificationSocket.connect()
  },

  beforeUnmount () {
    this._notificationSocketStopped = true
    this._notificationSocket?.stop()
    this._notificationSocket = null
  },

  methods: {
    getDarkModeClass,
    async openNotificationsDialog () {
      const vm = this

      vm.$q.dialog({
        component: Notifications,
        componentProps: { onOpenTransaction: this.findAndOpenTransaction }
      }).onDismiss(async () => {
        vm.notifsCount = await getWalletUnreadNotifs(vm.currentWalletHash)
      })
    },
    findAndOpenTransaction (data) {
      this.$emit('find-and-open-transaction', data)
    }
  }
}
</script>

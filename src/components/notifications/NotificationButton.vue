<template>
  <div class="col-2 flex justify-end" v-if="isMobile && !isChipnet">
    <q-btn
      flat
      round
      icon="notifications"
      class="text-bow"
      :class="getDarkModeClass(darkMode)"
      @click="openNotificationsDialog"
    >
      <q-badge color="red" floating v-if="notifsCount > 0">{{ notifsCount }}</q-badge>
    </q-btn>
  </div>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { getWalletUnreadNotifs } from 'src/utils/engagementhub-utils/engagementhub-utils'

import Notifications from 'src/components/notifications/index.vue'

export default {
  name: 'NotificationButton',

  emits: [
    'hide-multi-wallet-dialog',
    'find-and-open-transaction'
  ],

  data () {
    return {
      notifsCount: 0,
      notifSocket: null
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

    if (this.isMobile) {
      vm.notifsCount = await getWalletUnreadNotifs(vm.currentWalletHash)
      vm.notifSocket = new WebSocket(
        `${process.env.ENGAGEMENT_HUB_WS_URL}notifications/${vm.currentWalletHash}/`
      )
      vm.addListenersToSocket()
    }
  },

  methods: {
    getDarkModeClass,
    async openNotificationsDialog () {
      const vm = this

      vm.$emit('hide-multi-wallet-dialog')
      vm.$q.dialog({
        component: Notifications,
        componentProps: { onOpenTransaction: this.findAndOpenTransaction }
      }).onDismiss(async () => {
        if (this.isMobile) {
          vm.notifsCount = await getWalletUnreadNotifs(vm.currentWalletHash)
        }
      })
    },
    addListenersToSocket () {
      const vm = this

      vm.notifSocket.addEventListener('message', (event) => {
        const data = JSON.parse(event.data)
        vm.notifsCount = data.unread_notifs_count
      })

      vm.notifSocket.addEventListener('open', (event) => {
        console.log('Notification websocket opened.')
      })

      vm.notifSocket.addEventListener('close', (event) => {
        console.log('Notification websocket closed. Reopening websocket...')
        vm.notifSocket = new WebSocket(
          `${process.env.ENGAGEMENT_HUB_WS_URL}notifications/${vm.currentWalletHash}/`
        )
        vm.addListenersToSocket()
      })

      vm.notifSocket.addEventListener('error', (event) => {
        console.log('Notification websocket encountered an error. ', event)
      })
    },
    findAndOpenTransaction (data) {
      this.$emit('find-and-open-transaction', data)
    }
  }
}
</script>

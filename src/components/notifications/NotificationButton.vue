<template>
  <div class="col-2 flex justify-end" v-if="!isMobile">
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

import Notifications from 'src/components/notifications/index.vue'

export default {
  name: 'NotificationButton',

  emits: [
    'hide-multi-wallet-dialog'
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
    currentWalletHash () {
      return this.$store.getters['global/getWallet']('bch')?.walletHash
    }
  },

  async mounted () {
    const vm = this

    vm.notifSocket = new WebSocket(
      `${process.env.ENGAGEMENT_HUB_WS_URL}notifications/${vm.currentWalletHash}/`
    )

    vm.notifSocket.addEventListener('message', (event) => {
      const data = JSON.parse(event.data)
      vm.notifsCount = data.unread_notifs_count
    })

    vm.notifSocket.addEventListener('open', (event) => {
      console.log('Notification websocket opened.')
    })

    vm.notifSocket.addEventListener('close', (event) => {
      console.log('Notification websocket closed.')
      vm.notifSocket.close()
      console.log('Creating new websocket.')
      vm.notifSocket = new WebSocket(
        `${process.env.ENGAGEMENT_HUB_WS_URL}notifications/${vm.currentWalletHash}/`
      )
    })

    vm.notifSocket.addEventListener('error', (event) => {
      console.log('Notification websocket encountered an error. ', event)
    })
  },

  methods: {
    getDarkModeClass,
    openNotificationsDialog () {
      this.$emit('hide-multi-wallet-dialog')
      this.$q.dialog({
        component: Notifications
      })
    },
    updateNotifCount (count) {
      console.log('count', count)
      this.notifsCount = count
    }
  }
}
</script>

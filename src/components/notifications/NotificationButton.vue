<template>
  <div class="col-2 flex justify-end" v-if="isMobile">
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
      notifSocket: null,
      reconnectAttempts: 0,
      maxReconnectAttempts: 5
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
      const wallet = this.$store.getters['global/getWallet']('bch')
      return wallet?.walletHash || ''
    }
  },

  watch: {
    currentWalletHash: {
      handler(newWalletHash) {
        if (newWalletHash && this.isMobile && !this.notifSocket) {
          this.initializeNotifications()
        }
      },
      immediate: true
    }
  },

  async mounted () {
    if (this.currentWalletHash && this.isMobile) {
      this.initializeNotifications()
    }
  },

  beforeUnmount() {
    if (this.notifSocket) {
      this.notifSocket.close()
      this.notifSocket = null
    }
  },

  methods: {
    getDarkModeClass,
    
    async initializeNotifications() {
      if (!this.currentWalletHash) {
        console.log('Wallet hash not available, skipping notification initialization')
        return
      }

      try {
        this.notifsCount = await getWalletUnreadNotifs(this.currentWalletHash)
        this.connectWebSocket()
      } catch (error) {
        console.error('Failed to initialize notifications:', error)
      }
    },

    connectWebSocket() {
      if (!this.currentWalletHash) {
        console.log('Cannot connect WebSocket: wallet hash not available')
        return
      }

      if (this.notifSocket) {
        this.notifSocket.close()
        this.notifSocket = null
      }
      
      try {
        this.notifSocket = new WebSocket(
          `${process.env.ENGAGEMENT_HUB_WS_URL}notifications/${this.currentWalletHash}/`
        )
        this.addListenersToSocket()
      } catch (error) {
        console.error('Failed to create WebSocket:', error)
      }
    },

    addListenersToSocket () {
      const vm = this

      vm.notifSocket.addEventListener('message', (event) => {
        try {
          const data = JSON.parse(event.data)
          vm.notifsCount = data.unread_notifs_count
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error)
        }
      })

      vm.notifSocket.addEventListener('open', (event) => {
        console.log('Notification websocket opened.')
        vm.reconnectAttempts = 0 // Reset reconnect attempts on successful connection
      })

      vm.notifSocket.addEventListener('close', (event) => {
        console.log('Notification websocket closed.')
        vm.notifSocket = null
        
        // Only attempt to reconnect if we haven't exceeded max attempts and wallet hash is available
        if (vm.reconnectAttempts < vm.maxReconnectAttempts && vm.currentWalletHash) {
          vm.reconnectAttempts++
          const delay = Math.min(1000 * Math.pow(2, vm.reconnectAttempts), 30000) // Exponential backoff, max 30s
          
          console.log(`Reconnecting in ${delay}ms (attempt ${vm.reconnectAttempts}/${vm.maxReconnectAttempts})`)
          setTimeout(() => {
            if (vm.currentWalletHash) {
              vm.connectWebSocket()
            }
          }, delay)
        } else if (vm.reconnectAttempts >= vm.maxReconnectAttempts) {
          console.log('Max reconnection attempts reached, stopping reconnection attempts')
        } else {
          console.log('Cannot reconnect: wallet hash not available')
        }
      })

      vm.notifSocket.addEventListener('error', (event) => {
        console.log('Notification websocket encountered an error:', event)
      })
    },

    async openNotificationsDialog () {
      const vm = this

      vm.$emit('hide-multi-wallet-dialog')
      vm.$q.dialog({
        component: Notifications,
        componentProps: { onOpenTransaction: this.findAndOpenTransaction }
      }).onDismiss(async () => {
        if (this.isMobile && this.currentWalletHash) {
          vm.notifsCount = await getWalletUnreadNotifs(vm.currentWalletHash)
        }
      })
    },

    findAndOpenTransaction (data) {
      this.$emit('find-and-open-transaction', data)
    }
  }
}
</script>

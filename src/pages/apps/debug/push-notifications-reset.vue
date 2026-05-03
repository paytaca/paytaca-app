<template>
  <div id="app-container" class="debug-page sticky-header-container" :class="getDarkModeClass(darkMode)">
    <header-nav
      :title="$t('PushNotificationsReset', {}, 'Push Notifications Reset')"
      backnavpath="/apps/debug"
      class="header-nav q-px-sm apps-header"
    />

    <div class="q-pa-md q-mt-sm">
      <!-- Push Notifications Reset -->
      <div class="q-mb-md">
        <q-card class="debug-card" :class="getDarkModeClass(darkMode)">
          <q-card-section>
            <div class="text-caption q-mb-md" :class="darkMode ? 'text-grey-6' : 'text-grey-7'">
              {{ $t('ForceReRegisterPushNotifTip', {}, 'Force re-registration of push notification token. Useful when device stops receiving push notifications.') }}
            </div>
            <div class="q-gutter-sm">
              <q-btn
                color="negative"
                icon="refresh"
                :label="$t('ForceReRegisterPush', {}, 'Force Re-register Push')"
                @click="forceReRegisterPush"
                :loading="reRegisteringPush"
                class="full-width"
              />
              <q-btn
                color="primary"
                icon="send"
                :label="$t('TestPushNotification', {}, 'Test Push Notification')"
                @click="testPushNotification"
                :loading="testingPush"
                class="full-width"
                outline
              />
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </div>
</template>

<script>
import headerNav from 'src/components/header-nav'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

export default {
  name: 'PushNotificationsReset',
  components: {
    headerNav,
  },
  data () {
    return {
      reRegisteringPush: false,
      testingPush: false
    }
  },
  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    toggleColor () {
      const theme = this.$store.getters['global/theme']
      if (theme === 'glassmorphic-red') return 'pink-6'
      if (theme === 'glassmorphic-green') return 'green-6'
      if (theme === 'glassmorphic-gold') return 'amber-7'
      return 'blue-6'
    }
  },
  methods: {
    getDarkModeClass,
    async forceReRegisterPush () {
      this.reRegisteringPush = true
      try {
        const pushManager = this.$pushNotifications
        if (!pushManager) {
          throw new Error('Push notifications manager not available')
        }

        // 1. Unsubscribe old device token from Watchtower
        this.$q.notify({
          type: 'info',
          message: this.$t('UnsubscribingOldToken', {}, 'Unsubscribing old device token...'),
          timeout: 2000
        })

        const walletIndex = this.$store.getters['global/getWalletIndex']
        const wallet = this.$store.getters['global/getWallet']('bch')
        const walletHash = wallet?.walletHash

        if (walletHash) {
          try {
            await pushManager.unsubscribe([walletHash])
          } catch (err) {
            console.log('Unsubscribe (expected if token was already invalid):', err?.message)
          }
        }

        // 2. Clear cached token data to force fresh registration
        pushManager.registrationToken = null
        pushManager.subscriptionInfo = null

        // 3. Fetch new registration token from APNS/FCM
        this.$q.notify({
          type: 'info',
          message: this.$t('FetchingNewToken', {}, 'Fetching new push token...'),
          timeout: 2000
        })

        const newToken = await pushManager.fetchRegistrationToken()
        const tokenValue = newToken?.value || newToken
        console.log('New push token:', tokenValue)
        this.$q.notify({
          type: 'info',
          message: 'New token: ' + (tokenValue ? String(tokenValue).substring(0, 20) + '...' : 'null'),
          timeout: 3000
        })

        // 4. Re-subscribe with new token
        this.$q.notify({
          type: 'info',
          message: this.$t('RegisteringNewToken', {}, 'Registering new token with server...'),
          timeout: 2000
        })

        const subResponse = await pushManager.subscribe([walletHash], walletIndex)
        console.log('Subscribe response:', subResponse)
        this.$q.notify({
          type: 'info',
          message: 'Subscribe response: ' + JSON.stringify(subResponse?.data || subResponse).substring(0, 100),
          timeout: 3000
        })

        // 5. Re-register Nostr push notifications too
        this.$q.notify({
          type: 'info',
          message: this.$t('RegisteringNostrPush', {}, 'Re-registering Nostr push notifications...'),
          timeout: 2000
        })

        const nostrResponse = await this.$store.dispatch('nostrChat/registerForPushNotifications')
        console.log('Nostr register response:', nostrResponse)

        this.$q.notify({
          type: 'positive',
          message: this.$t('PushReRegisterSuccess', {}, 'Push notifications re-registered successfully!'),
          timeout: 3000
        })
      } catch (error) {
        console.error('Failed to re-register push notifications:', error)
        this.$q.notify({
          type: 'negative',
          message: this.$t('PushReRegisterFailed', {}, 'Failed to re-register push notifications') + ': ' + (error?.message || error),
          timeout: 5000
        })
      } finally {
        this.reRegisteringPush = false
      }
    },
    async testPushNotification () {
      this.testingPush = true
      try {
        const walletHash = this.$store.getters['global/getWallet']('bch')?.walletHash
        if (!walletHash) {
          throw new Error('No wallet hash available')
        }

        this.$q.notify({
          type: 'info',
          message: 'Sending test push notification...',
          timeout: 2000
        })

        // Send test push notification
        const watchtower = new (await import('watchtower-cash-js')).default(this.$store.getters['global/isChipnet'])
        const response = await watchtower.BCH._api.post('/push-notifications/test-send/', {
          wallet_hash: walletHash,
          message: 'This is a test push notification',
          title: 'Test'
        })

        console.log('Test push response:', response)
        const result = response?.data

        if (result?.success) {
          this.$q.notify({
            type: 'positive',
            message: `Test push sent! GCM: ${result.gcm_response || 'none'}, APNS: ${result.apns_response || 'none'}`,
            timeout: 5000
          })
        } else {
          this.$q.notify({
            type: 'warning',
            message: 'Test push failed: ' + (result?.error || 'Unknown error'),
            timeout: 5000
          })
        }
      } catch (error) {
        console.error('Test push failed:', error)
        this.$q.notify({
          type: 'negative',
          message: 'Test push failed: ' + (error?.response?.data?.error || error?.message || error),
          timeout: 5000
        })
      } finally {
        this.testingPush = false
      }
    },
  }
}
</script>

<style scoped lang="scss">
.debug-page {
  min-height: 100vh;
  background-color: #ECF3F3;
}

body.theme-glassmorphic-blue .debug-page.dark {
  background-color: #273746;
}

body.theme-glassmorphic-red .debug-page.dark {
  background-color: #462733;
}

body.theme-glassmorphic-green .debug-page.dark {
  background-color: #263d32;
}

body.theme-glassmorphic-gold .debug-page.dark {
  background-color: #3d3224;
}

body.theme-payhero .debug-page.dark {
  background-color: #012121;
}

.debug-page.dark {
  background-color: #273746;
}

.debug-card {
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.debug-card.dark {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.debug-card.light {
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.1);
}
</style>

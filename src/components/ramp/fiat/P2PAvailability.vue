<template>
  <div class="full-width">
    <q-dialog :model-value="!!error" persistent>
      <q-card class="pt-card text-bow text-center q-pa-md" :class="$store.getters['darkmode/getStatus'] ? 'dark' : 'light'" :dark="$store.getters['darkmode/getStatus']" style="width: 360px; max-width: 90vw;">
        <q-card-section>
          <q-icon name="engineering" size="56px" color="primary" />
          <div class="text-body1 q-mt-md" role="alert">{{ message }}</div>
        </q-card-section>
        <q-card-actions align="center">
          <q-btn flat :label="$t('Retry')" :loading="checking" @click="retry(true)" />
          <q-btn unelevated color="primary" :label="$t('BackToWallet', {}, 'Back to wallet')" to="/apps" />
        </q-card-actions>
      </q-card>
    </q-dialog>
    <div v-if="!confirmed && !error" class="flex flex-center" style="min-height: 100dvh;">
      <q-spinner size="md" color="primary" />
    </div>
    <template v-else-if="confirmed && !error">
      <q-banner v-if="maintenanceActive" dense class="bg-amber-2 text-brown-10 p2p-maintenance-banner" role="status">
        <template v-slot:avatar>
          <q-icon name="engineering" />
        </template>
        <div class="text-weight-bold">{{ $t('P2PMaintenanceMode', {}, 'P2P maintenance mode') }}</div>
        <div>{{ $t('P2PMaintenanceTestAccess', {}, 'Test access only. Buyer, seller and arbiter must be approved.') }}</div>
      </q-banner>
      <slot :key="screenKey" />
    </template>
  </div>
</template>
<script>
import { backend } from 'src/exchange/backend'
import { availabilityError, fetchP2PAvailability, p2pAvailabilityMessage } from 'src/exchange/availability'
import { bus } from 'src/wallet/event-bus'

export default {
  emits: ['available', 'authenticate'],
  props: {
    authenticationError: { type: Object, default: null },
    ready: { type: Boolean, default: false },
    userType: { type: [String, Boolean], default: false }
  },
  data () {
    return { confirmed: false, requestEpoch: 0, checking: true, error: this.authenticationError || null, screenKey: 0, retryTimer: null, retryCount: 0, requestPending: false, disposed: false }
  },
  computed: {
    maintenanceActive () {
      return this.$store.getters['ramp/featureToggles']?.P2P_MAINTENANCE_ACTIVE === true
    },
    message () {
      return p2pAvailabilityMessage(this.$t.bind(this), this.error)
    }
  },
  watch: {
    authenticationError: { flush: 'sync', handler () { this.reset(); this.retry() } },
    ready: { flush: 'sync', handler () { this.reset(); this.retry() } },
    userType: { flush: 'sync', handler () { this.reset(); this.retry() } }
  },
  created () {
    this.$store.commit('ramp/updateFeatureToggles', null)
    bus.on('p2p-unavailable', this.onUnavailable)
    bus.on('p2p-auth-cleared', this.onAuthCleared)
    bus.on('relogged', this.onRelogged)
    document.addEventListener('visibilitychange', this.onVisibilityChange)
    this.retry()
  },
  beforeUnmount () {
    this.disposed = true
    clearTimeout(this.retryTimer)
    bus.off('p2p-unavailable', this.onUnavailable)
    bus.off('p2p-auth-cleared', this.onAuthCleared)
    bus.off('relogged', this.onRelogged)
    document.removeEventListener('visibilitychange', this.onVisibilityChange)
  },
  methods: {
    reset () {
      this.requestEpoch++
      clearTimeout(this.retryTimer)
      this.retryTimer = null
      this.requestPending = false
      this.confirmed = false
      this.checking = false
      this.error = this.authenticationError || null
      this.$store.commit('ramp/updateFeatureToggles', null)
    },
    onAuthCleared (scope) {
      if (scope?.walletHash !== this.$store.getters['global/getWallet']('bch')?.walletHash ||
          (scope.userType && scope.userType !== this.userType)) return
      this.reset()
      this.error = availabilityError()
    },
    onRelogged () {
      this.reset()
      this.retry()
    },
    onUnavailable (error) {
      if (this.disposed) return
      if (error?.response?.data?.code === 'p2p_feature_disabled') {
        const feature = error.response.data.feature
        const controls = { ...this.$store.getters['ramp/featureToggles'], [feature]: false }
        this.$store.commit('ramp/updateFeatureToggles', controls)
        this.$q.notify({ type: 'error', message: p2pAvailabilityMessage(this.$t.bind(this), error), timeout: 5000 })
      } else {
        this.reset()
        this.error = error
        this.scheduleRetry()
      }
    },
    onVisibilityChange () {
      if (this.disposed) return
      clearTimeout(this.retryTimer)
      this.retryTimer = null
      if (document.hidden) this.reset()
      else this.retry()
    },
    scheduleRetry () {
      clearTimeout(this.retryTimer)
      this.retryTimer = null
      if (!this.authenticationError && (this.ready || this.error) && !this.disposed && !this.requestPending && !document.hidden) {
        const delay = this.error ? [5000, 30000, 120000][Math.min(Math.max(this.retryCount - 1, 0), 2)] : 30000
        this.retryTimer = setTimeout(() => this.retry(), delay)
      }
    },
    async retry (manual = false) {
      if (this.requestPending || this.disposed || document.hidden) return
      if (this.authenticationError) {
        if (manual) this.$emit('authenticate')
        return
      }
      if (!this.ready) {
        if (this.error) this.$emit('authenticate')
        return
      }
      const epoch = this.requestEpoch
      const isCurrent = () => !this.disposed && epoch === this.requestEpoch
      clearTimeout(this.retryTimer)
      this.retryTimer = null
      this.requestPending = true
      this.checking = true
      try {
        const controls = await fetchP2PAvailability(backend, undefined, { skipAbortManager: true, userType: this.userType })
        if (!isCurrent()) return
        this.$store.commit('ramp/updateFeatureToggles', controls)
        const recovering = !this.confirmed
        this.confirmed = true
        this.error = null
        this.retryCount = 0
        // Recovery remounts deep pages and discards unfinished form state; no financial action is replayed.
        if (recovering) this.screenKey++
        this.$emit('available')
      } catch (error) {
        if (isCurrent()) {
          this.confirmed = false
          this.$store.commit('ramp/updateFeatureToggles', null)
          this.error = error
          this.retryCount++
        }
      } finally {
        if (isCurrent()) {
          this.requestPending = false
          this.checking = false
          this.scheduleRetry()
        }
      }
    }
  }
}
</script>

<style scoped>
.p2p-maintenance-banner {
  position: sticky;
  top: 0;
  z-index: 1000;
}
</style>

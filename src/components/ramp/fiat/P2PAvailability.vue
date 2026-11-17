<template>
  <div class="full-width">
    <q-dialog :model-value="!!error" persistent>
      <q-card class="pt-card text-center q-pa-md" :dark="$store.getters['darkmode/getStatus']" style="width: 360px; max-width: 90vw;">
        <q-card-section>
          <q-icon name="engineering" size="56px" color="primary" />
          <div class="text-body1 q-mt-md" role="alert">{{ message }}</div>
        </q-card-section>
        <q-card-actions align="center">
          <q-btn flat :label="$t('Retry')" :loading="checking" @click="retry" />
          <q-btn unelevated color="primary" :label="$t('BackToWallet', {}, 'Back to wallet')" to="/apps" />
        </q-card-actions>
      </q-card>
    </q-dialog>
    <div v-if="checking && !error" class="flex flex-center" style="min-height: 100dvh;">
      <q-spinner size="md" color="primary" />
    </div>
    <slot v-else-if="!error" :key="screenKey" />
  </div>
</template>
<script>
import { backend } from 'src/exchange/backend'
import { fetchP2PAvailability, p2pAvailabilityMessage } from 'src/exchange/availability'
import { bus } from 'src/wallet/event-bus'

export default {
  data () {
    return { checking: true, error: null, screenKey: 0 }
  },
  computed: {
    message () {
      return p2pAvailabilityMessage(this.$t.bind(this), this.error)
    }
  },
  created () {
    bus.on('p2p-unavailable', this.onUnavailable)
    this.retry()
  },
  beforeUnmount () {
    bus.off('p2p-unavailable', this.onUnavailable)
  },
  methods: {
    onUnavailable (error) {
      if (error?.response?.data?.code === 'p2p_feature_disabled') {
        const feature = error.response.data.feature
        const controls = { ...this.$store.getters['ramp/featureToggles'], [feature]: false }
        this.$store.commit('ramp/updateFeatureToggles', controls)
        this.$q.notify({ type: 'error', message: p2pAvailabilityMessage(this.$t.bind(this), error), timeout: 5000 })
      } else {
        this.error = error
      }
    },
    async retry () {
      this.checking = true
      try {
        const controls = await fetchP2PAvailability(backend)
        this.$store.commit('ramp/updateFeatureToggles', controls)
        this.error = null
        this.screenKey++
      } catch (error) {
        this.error = error
      } finally {
        this.checking = false
      }
    }
  }
}
</script>

<template>
    <q-dialog :model-value="show" @before-hide="closeProof" full-width>
      <q-card class="cashin-card br-15 pt-card-2 text-bow" :class="getDarkModeClass(darkMode)">
        <q-icon name="close" size="sm" color="red" class="q-pt-sm q-pl-sm" v-close-popup/>
        <div class="q-pb-md q-pt-sm q-px-sm">
          <div v-if="loading" class="flex flex-center q-pa-lg" role="status">
            <q-spinner size="lg" />
            <span class="q-ml-sm">{{ $t('Loading', {}, 'Loading') }}</span>
          </div>
          <div v-else-if="failed" class="text-center q-pa-lg" role="alert">
            {{ $t('CannotLoadImage', {}, 'Cannot load image') }}
          </div>
          <q-img v-else-if="imageUrl" :key="imageUrl" :src="imageUrl">
            <template v-slot:error>
              <div class="absolute-full flex flex-center text-white">
                {{ $t('CannotLoadImage', {}, 'Cannot load image') }}
              </div>
            </template>
          </q-img>
        </div>
      </q-card>
    </q-dialog>
</template>
<script>
import axios from 'axios'
import { downloadPaymentProof } from 'src/exchange/backend'
import { bus } from 'src/wallet/event-bus'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      imageUrl: null,
      loading: false,
      failed: false,
      generation: 0,
      cancelDownload: null,
      disposed: false
    }
  },
  emits: ['back'],
  props: {
    show: {
      type: Boolean,
      default: true
    },
    url: String,
    accountType: {
      type: String,
      required: true,
      validator: value => ['peer', 'arbiter'].includes(value)
    }
  },
  computed: {
    viewerIdentity () {
      const getters = this.$store.getters
      const user = getters['ramp/getUser']
      return JSON.stringify([
        getters['global/getWallet']('bch')?.walletHash,
        getters['global/getWalletIndex'], getters['global/isChipnet'],
        this.accountType, user?.id, user?.user_type, user?.is_arbiter
      ])
    },
    proofSource () {
      return JSON.stringify([this.show, this.url])
    }
  },
  watch: {
    viewerIdentity: {
      flush: 'sync',
      handler () { this.closeProof() }
    },
    proofSource: {
      immediate: true,
      flush: 'sync',
      handler () { this.loadProof() }
    }
  },
  created () {
    bus.on('session-expired', this.closeProof)
    bus.on('p2p-auth-cleared', this.onAuthCleared)
  },
  beforeUnmount () {
    this.disposed = true
    this.clearProof()
    bus.off('session-expired', this.closeProof)
    bus.off('p2p-auth-cleared', this.onAuthCleared)
  },
  methods: {
    getDarkModeClass,
    clearProof () {
      this.generation++
      this.cancelDownload?.cancel()
      this.cancelDownload = null
      if (this.imageUrl) URL.revokeObjectURL(this.imageUrl)
      this.imageUrl = null
      this.loading = false
      this.failed = false
    },
    closeProof () {
      this.clearProof()
      if (this.show) this.$emit('back')
    },
    onAuthCleared ({ walletHash, userType } = {}) {
      if (walletHash === this.$store.getters['global/getWallet']('bch')?.walletHash &&
          (!userType || userType === this.accountType)) this.closeProof()
    },
    async loadProof () {
      this.clearProof()
      if (!this.show || this.disposed) return
      const generation = this.generation
      const identity = this.viewerIdentity
      const url = this.url
      const isCurrent = () => !this.disposed && this.show && this.generation === generation &&
        this.viewerIdentity === identity && this.url === url
      this.loading = true
      this.cancelDownload = axios.CancelToken.source()
      try {
        const response = await downloadPaymentProof(url, this.accountType, {
          cancelToken: this.cancelDownload.token,
          isCurrent
        })
        if (!isCurrent()) return
        if (response.status !== 200 || response.cached === true || !(response.data instanceof Blob) || !response.data.size ||
            !/^image\/(png|jpeg|gif|webp|bmp|x-icon|vnd\.microsoft\.icon)$/.test(response.data.type)) {
          throw new Error('Invalid payment proof image')
        }
        this.imageUrl = URL.createObjectURL(response.data)
      } catch {
        if (isCurrent()) this.failed = true
      } finally {
        if (isCurrent()) {
          this.loading = false
          this.cancelDownload = null
        }
      }
    }
  }
}
</script>

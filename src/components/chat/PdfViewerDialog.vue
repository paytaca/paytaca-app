<template>
  <q-dialog v-model="isVisible" maximized transition-show="fade" transition-hide="fade">
    <div class="pdf-viewer" :class="getDarkModeClass(darkMode)">
      <div class="pdf-viewer-header">
        <q-btn flat round icon="close" size="lg" color="white" @click="close" />
        <div class="pdf-viewer-filename">{{ fileName }}</div>
        <q-btn flat round icon="download" size="lg" color="white" :loading="isDownloading" @click="download" />
      </div>
      <div class="pdf-viewer-body">
        <iframe v-if="pdfUrl" :src="pdfUrl" class="pdf-iframe" />
        <div v-else class="pdf-loading">
          <q-spinner color="white" size="48px" />
          <div class="loading-text">{{ $t('LoadingPdf', {}, 'Loading PDF...') }}</div>
        </div>
      </div>
    </div>
  </q-dialog>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

export default {
  name: 'PdfViewerDialog',
  props: {
    modelValue: { type: Boolean, default: false },
    pdfUrl: { type: String, default: '' },
    fileName: { type: String, default: '' },
  },
  emits: ['update:modelValue'],
  data () {
    return {
      isDownloading: false,
    }
  },
  computed: {
    isVisible: {
      get () { return this.modelValue },
      set (v) { this.$emit('update:modelValue', v) },
    },
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
  },
  methods: {
    getDarkModeClass,
    close () {
      this.isVisible = false
    },
    download () {
      if (!this.pdfUrl) return
      this.isDownloading = true
      try {
        const link = document.createElement('a')
        link.href = this.pdfUrl
        link.download = this.fileName || 'document.pdf'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      } catch (err) {
        console.error('PDF download error:', err)
        this.$q.notify({
          type: 'negative',
          message: this.$t('DownloadFailed', {}, 'Download failed') + ': ' + err.message,
          timeout: 5000,
        })
      } finally {
        this.isDownloading = false
      }
    },
  },
}
</script>

<style scoped>
.pdf-viewer {
  display: flex;
  flex-direction: column;
  height: 100dvh;
  width: 100dvw;
  background: #000000;
}

.pdf-viewer-header {
  display: flex;
  align-items: center;
  padding:
    calc(env(safe-area-inset-top, 0px) + 8px)
    calc(env(safe-area-inset-right, 0px) + 12px)
    8px
    calc(env(safe-area-inset-left, 0px) + 12px);
  gap: 8px;
  color: #ffffff;
  flex-shrink: 0;
  z-index: 10;
}

.pdf-viewer-header .q-btn {
  color: #ffffff;
}

.pdf-viewer-filename {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  color: #ffffff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pdf-viewer-body {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  min-height: 0;
  padding-bottom: env(safe-area-inset-bottom, 0px);
  background: #525659;
}

.pdf-iframe {
  width: 100%;
  height: 100%;
  border: none;
}

.pdf-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.loading-text {
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
  font-weight: 500;
}
</style>

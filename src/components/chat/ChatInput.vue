<template>
  <div class="chat-input-wrapper" :class="getDarkModeClass(darkMode)">
    <!-- Upload progress (shown instead of composer while uploading) -->
    <div v-if="isUploading && selectedFile" class="file-preview">
      <div class="file-preview-content">
        <img v-if="imageThumbnail" :src="imageThumbnail" class="file-thumbnail" />
        <q-icon v-else :name="getFileIcon(selectedFile)" size="32px" color="primary" />
        <div class="file-info">
          <div class="file-name">{{ selectedFile.name }}</div>
          <div class="file-size">{{ formatFileSize(selectedFile.size) }}</div>
        </div>
        <q-btn
          round
          flat
          dense
          icon="cancel"
          size="sm"
          color="negative"
          @click="cancelUpload"
        >
          <q-tooltip>Cancel upload</q-tooltip>
        </q-btn>
      </div>
      <q-linear-progress :value="uploadProgress" color="primary" class="q-mt-sm" />
    </div>

    <!-- Composer (hidden while uploading) -->
    <template v-else>
    <div class="chat-input-container">
      <!-- File attachment button -->
      <q-btn
        round
        unelevated
        color="grey-7"
        icon="attach_file"
        size="sm"
        class="attach-btn"
        @click="onAttachClick"
      >
        <q-tooltip>Attach file</q-tooltip>
      </q-btn>
      
      <!-- Quasar q-file component for iOS compatibility -->
      <q-file
        ref="qFile"
        style="display: none;"
        v-model="selectedFile"
        accept="image/*,video/*,audio/*,application/pdf"
        :max-file-size="MAX_FILE_SIZE"
        @update:model-value="onFileSelected"
      />
      
      <q-input
        v-model="text"
        dense
        borderless
        class="col chat-text-field"
        :placeholder="$t('TypeAMessage', {}, 'Type a message...')"
        :maxlength="MAX_CHARS"
        @keydown.enter.prevent="send"
        @focus="onFocus"
        @blur="onBlur"
      />
      <q-btn
        round
        unelevated
        color="primary"
        icon="send"
        size="sm"
        class="send-btn"
        :disable="!text.trim() || remainingChars <= 0 || isSending"
        @touchend.prevent="onSendTouch"
        @click="onSendClick"
      />
    </div>
    
    <div v-if="focused" class="char-counter" :class="{ 'counter-warning': remainingChars <= 50, 'counter-danger': remainingChars <= 10 }">
      {{ remainingChars }}
    </div>
    </template>
  </div>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

const SEND_COMMAND_PATTERN = /^\/send\s+([\d.]+)\s+([A-Za-z0-9]+)\s*$/i
const MAX_CHARS = 1000
const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

export default {
  name: 'ChatInput',
  emits: ['send', 'command', 'focus', 'blur'],
  props: {
    roomId: { type: String, default: '' },
  },
  data () {
    return {
      text: '',
      focused: false,
      selectedFile: null,
      uploadProgress: 0,
      isUploading: false,
      isSending: false,
      imageThumbnail: null,
      uploadAbortController: null,
      MAX_CHARS,
      MAX_FILE_SIZE,
    }
  },
  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    remainingChars () {
      return MAX_CHARS - this.text.length
    },
  },
  methods: {
    getDarkModeClass,
    onFocus () {
      this.focused = true
      this.$emit('focus')
    },
    onBlur () {
      this.focused = false
      this.$emit('blur')
    },
    setText (val) {
      this.text = val
    },
    onAttachClick () {
      // Use Quasar's q-file pickFiles() method which works on iOS
      this.$nextTick(() => {
        if (this.$refs.qFile) {
          this.$refs.qFile.pickFiles()
        }
      })
    },
    onFileSelected (file) {
      if (!file) return
      
      const selectedFile = Array.isArray(file) ? file[0] : file
      if (!selectedFile) return
      
      if (selectedFile.size > MAX_FILE_SIZE) {
        this.$q.notify({
          type: 'error',
          message: this.$t('FileTooLarge', {}, 'File is too large. Maximum size is 50MB.'),
          timeout: 5000,
        })
        this.clearFileSelection()
        return
      }
      
      this.selectedFile = selectedFile
      
      if (selectedFile.type?.startsWith('image/')) {
        this.generateThumbnail(selectedFile)
      }
      
      this.$nextTick(() => {
        this.sendFile()
      })
    },
    generateThumbnail (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          const size = 48
          canvas.width = size
          canvas.height = size
          const ctx = canvas.getContext('2d')
          const scale = Math.max(size / img.width, size / img.height)
          const x = (size - img.width * scale) / 2
          const y = (size - img.height * scale) / 2
          ctx.drawImage(img, x, y, img.width * scale, img.height * scale)
          this.imageThumbnail = canvas.toDataURL('image/jpeg', 0.7)
        }
        img.src = e.target.result
      }
      reader.readAsDataURL(file)
    },
    clearFileSelection () {
      this.selectedFile = null
      this.uploadProgress = 0
      this.imageThumbnail = null
    },
    getFileIcon (file) {
      if (file.type.startsWith('image/')) return 'image'
      if (file.type.startsWith('video/')) return 'videocam'
      if (file.type.startsWith('audio/')) return 'audiotrack'
      return 'description'
    },
    formatFileSize (bytes) {
      if (bytes < 1024) return bytes + ' B'
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
      return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
    },
    async sendFile () {
      if (!this.selectedFile || !this.roomId || this.isUploading) return
      
      this.isUploading = true
      this.uploadProgress = 0
      this.uploadAbortController = new AbortController()
      
      try {
        const { giftWraps, message } = await this.$store.dispatch('nostrChat/sendFileMessage', {
          roomId: this.roomId,
          file: this.selectedFile,
          onProgress: (p) => { this.uploadProgress = p },
          signal: this.uploadAbortController.signal,
        })
        
        this.$store.commit('nostrChat/ADD_MESSAGE', { roomId: this.roomId, message })
        await this.$store.dispatch('nostrChat/publishGiftWraps', { giftWraps })
      } catch (error) {
        if (error.name === 'AbortError') return
        console.error('File upload error:', error)
        this.$q.notify({
          type: 'error',
          message: this.$t('FileUploadFailed', {}, 'Failed to upload file. Please try again.'),
          timeout: 5000,
        })
      } finally {
        this.isUploading = false
        this.uploadAbortController = null
        this.clearFileSelection()
      }
    },
    cancelUpload () {
      if (this.uploadAbortController) {
        this.uploadAbortController.abort()
      }
      this.isUploading = false
      this.uploadAbortController = null
      this.clearFileSelection()
    },
    onSendTouch () {
      this._touchSent = true
      this.send()
      setTimeout(() => { this._touchSent = false }, 400)
    },
    onSendClick () {
      if (this._touchSent) return
      this.send()
    },
    send () {
      const trimmed = this.text.trim()
      if (!trimmed || this.isSending) return

      this.text = ''
      this.isSending = true

      if (trimmed.startsWith('/send')) {
        const commandMatch = trimmed.match(SEND_COMMAND_PATTERN)
        if (commandMatch) {
          const amount = parseFloat(commandMatch[1])
          if (!isNaN(amount) && amount > 0) {
            this.$emit('command', {
              type: 'send',
              amount,
              currency: (commandMatch[2] || 'BCH').toUpperCase(),
              originalText: trimmed,
            })
            this.dismissKeyboard()
            this.$nextTick(() => { this.isSending = false })
            return
          }
        }
        this.isSending = false
        this.$q.notify({
          type: 'warning',
          message: this.$t('InvalidSendCommand', {}, 'Invalid /send command. Usage: /send <amount> <currency>'),
          timeout: 5000,
          closeBtn: true,
        })
        return
      }

      this.$emit('send', trimmed)
      this.dismissKeyboard()
      this.$nextTick(() => { this.isSending = false })
    },
    dismissKeyboard () {
      const input = this.$el?.querySelector('.q-field__native')
      if (input) input.blur()
    },
  },
}
</script>

<style scoped>
.chat-input-wrapper {
  background: transparent;
  padding: 8px 16px;
  flex-shrink: 0;
}

.chat-input-container {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #ffffff;
  border-radius: 28px;
  padding: 10px 14px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.06);
  border: 1px solid rgba(0, 0, 0, 0.04);
  transition: box-shadow 0.2s ease, transform 0.2s ease;
  position: relative;
}

.chat-input-container:focus-within {
  box-shadow: 0 4px 24px rgba(59, 130, 246, 0.15), 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.chat-text-field :deep(.q-field__control) {
  background: transparent !important;
}

.chat-text-field :deep(.q-field__native) {
  font-size: 15px;
  color: #1f2937;
}

.chat-text-field :deep(.q-field__native::placeholder) {
  color: #9ca3af;
}

.send-btn {
  transition: transform 0.15s ease, opacity 0.15s ease;
}

.send-btn:not(:disabled):active {
  transform: scale(0.92);
}

.attach-btn {
  transition: transform 0.15s ease;
}

.attach-btn:active {
  transform: scale(0.9);
}

.char-counter {
  text-align: right;
  font-size: 11px;
  color: #9ca3af;
  margin-top: 4px;
  transition: color 0.2s ease;
}

.char-counter.counter-warning {
  color: #f59e0b;
}

.char-counter.counter-danger {
  color: #ef4444;
}

/* File preview */
.file-preview {
  margin-top: 8px;
  padding: 12px;
  background: #f3f4f6;
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.06);
}

.file-preview-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.file-thumbnail {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  object-fit: cover;
  flex-shrink: 0;
}

.file-info {
  flex: 1;
  min-width: 0;
}

.file-name {
  font-size: 13px;
  font-weight: 500;
  color: #1f2937;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-size {
  font-size: 11px;
  color: #6b7280;
  margin-top: 2px;
}

/* Dark mode */
.dark.chat-input-wrapper {
  background: transparent;
  padding: 8px 16px;
}

.dark .chat-input-container {
  background: #1e293b;
  border-color: rgba(255, 255, 255, 0.06);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3), 0 1px 3px rgba(0, 0, 0, 0.2);
}

.dark .chat-input-container:focus-within {
  box-shadow: 0 4px 24px rgba(59, 130, 246, 0.2), 0 0 0 2px rgba(59, 130, 246, 0.25);
}

.dark .chat-text-field :deep(.q-field__native) {
  color: #e2e8f0;
}

.dark .chat-text-field :deep(.q-field__native::placeholder) {
  color: #64748b;
}

.dark .file-preview {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.08);
}

.dark .file-name {
  color: #e2e8f0;
}

.dark .file-size {
  color: #94a3b8;
}
</style>

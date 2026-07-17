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
          <q-tooltip>{{ $t('CancelUpload') }}</q-tooltip>
        </q-btn>
      </div>
      <q-linear-progress :value="uploadProgress" color="primary" class="q-mt-sm" />
    </div>

    <!-- Composer (hidden while uploading) -->
    <template v-else>
    <div class="chat-input-container">
      <!-- Actions button -->
      <q-btn
        round
        unelevated
        color="grey-7"
        icon="add"
        size="sm"
        class="attach-btn"
        :disable="disabled"
      >
        <q-menu
          class="chat-actions-menu"
          anchor="top left"
          self="bottom left"
          transition-show="scale"
          transition-hide="scale"
          :dark="darkMode"
        >
          <q-list dense class="chat-actions-list">
            <q-item clickable v-close-popup @click="onAttachClick" class="chat-action-item">
              <q-item-section avatar>
                <div class="action-icon-wrapper action-icon-file">
                  <q-icon name="attach_file" size="18px" color="white" />
                </div>
              </q-item-section>
              <q-item-section>
                <div class="action-label">{{ $t('File', {}, 'File') }}</div>
                <div class="action-hint">{{ $t('AttachFileHint') }}</div>
              </q-item-section>
            </q-item>
            <q-item clickable v-close-popup @click="onTipClick" class="chat-action-item">
              <q-item-section avatar>
                <div class="action-icon-wrapper action-icon-tip">
                  <q-icon name="volunteer_activism" size="18px" color="white" />
                </div>
              </q-item-section>
              <q-item-section>
                <div class="action-label">{{ $t('Tip', {}, 'Tip') }}</div>
                <div class="action-hint">{{ $t('SendTipHint') }}</div>
              </q-item-section>
            </q-item>
          </q-list>
        </q-menu>
      </q-btn>
      
      <!-- Quasar q-file component for iOS compatibility -->
      <q-file
        ref="qFile"
        style="display: none;"
        accept="image/*,video/*,audio/*,application/pdf"
        @update:model-value="onFileSelected"
      />
      
      <div class="input-wrapper col">
        <q-input
          ref="inputField"
          v-model="text"
          type="textarea"
          autogrow
          dense
          borderless
          :dark="darkMode"
          class="chat-text-field"
          :placeholder="blocked ? (blockedPlaceholder || $t('ContactBlockedInputDisabled', {}, 'Contact blocked')) : (disabled ? $t('ConversationArchivedInputDisabled', {}, 'Conversation archived') : $t('TypeAMessage', {}, 'Type a message...'))"
          :maxlength="MAX_CHARS"
          :disable="disabled"
          @keydown.enter="onEnterKey"
          @focus="onFocus"
          @blur="onBlur"
        />
      </div>
      <q-btn
        round
        unelevated
        color="primary"
        icon="send"
        size="sm"
        class="send-btn"
        :disable="disabled || !text.trim() || remainingChars <= 0 || isSending"
        @touchend.prevent="onSendTouch"
        @click="onSendClick"
      />
    </div>
    
    <div v-if="focused" class="char-counter" :class="{ 'counter-warning': remainingChars <= 50, 'counter-danger': remainingChars <= 10 }">
      {{ remainingChars }}
    </div>
    </template>

    <!-- Image resize dialog -->
    <q-dialog v-model="showResizeDialog" persistent>
      <q-card style="min-width: 320px">
        <q-card-section class="q-pb-none">
          <div class="text-h6">{{ $t('ResizeImage') }}</div>
          <div class="text-caption text-grey">{{ $t('OriginalSize', { size: formatFileSize(imageOriginalSize) }) }}</div>
        </q-card-section>
        <q-card-section>
          <q-option-group
            v-model="resizeOption"
            :options="resizeOptions"
            type="radio"
            color="primary"
          />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat :label="$t('Skip')" color="grey" v-close-popup @click="sendResizedFile(null)" />
          <q-btn unelevated :label="$t('ResizeAndSend')" color="primary" v-close-popup @click="sendResizedFile(resizeOption)" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { resizeImage } from 'src/wallet/nostr-media'
import { cacheVideoBlob } from 'src/utils/video-blob-cache'

const SEND_COMMAND_PATTERN = /^\/(send|tip)\s+([\d.]+)\s*([A-Za-z0-9]+)?\s*$/i
const SEND_BARE_PATTERN = /^\/(send|tip)\s*$/i
const MAX_CHARS = 3000
const FILE_SIZE_LIMITS = {
  'image/': 10 * 1024 * 1024,
  'video/': 50 * 1024 * 1024,
  'audio/': 25 * 1024 * 1024,
  'application/': 25 * 1024 * 1024,
}
const MAX_FILE_SIZE = Math.max(...Object.values(FILE_SIZE_LIMITS))

function getFileSizeLimit (fileType) {
  if (!fileType) return FILE_SIZE_LIMITS['application/']
  const prefix = Object.keys(FILE_SIZE_LIMITS).find(p => fileType.startsWith(p))
  return FILE_SIZE_LIMITS[prefix] || FILE_SIZE_LIMITS['application/']
}

const RESIZE_THRESHOLD = 1 * 1024 * 1024 // 1MB

const RESIZE_OPTIONS = [
  { labelKey: 'ResizeSmall', value: 'small', description: '800px max, 70% quality' },
  { labelKey: 'ResizeMedium', value: 'medium', description: '1600px max, up to 90% quality' },
  { labelKey: 'ResizeLarge', value: 'large', description: '2048px max, up to 85% quality' },
]

export default {
  name: 'ChatInput',
  emits: ['send', 'command', 'focus', 'blur', 'tip'],
  props: {
    roomId: { type: String, default: '' },
    disabled: { type: Boolean, default: false },
    blocked: { type: Boolean, default: false },
    blockedPlaceholder: { type: String, default: '' },
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
      showResizeDialog: false,
      resizeOption: 'medium',
      imageOriginalSize: 0,
      MAX_CHARS,
      MAX_FILE_SIZE,
    }
  },
  computed: {
    resizeOptions () {
      return RESIZE_OPTIONS.map(opt => ({
        ...opt,
        label: this.$t(opt.labelKey),
      }))
    },
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    remainingChars () {
      return MAX_CHARS - this.text.length
    },
  },
  watch: {
    text (newVal) {
      if (!this.roomId || this.disabled || this.blocked) return
      const myPubKey = this.$store.getters['nostrChat/myPubKey']
      const room = this.$store.getters['nostrChat/getRoom'](this.roomId)
      if (!myPubKey || !room?.members) return
      const recipients = room.members.filter(m => m !== myPubKey)
      if (!recipients.length) return
      if (!newVal) {
        this.$store.dispatch('nostrChat/sendStopTyping', { roomId: this.roomId, recipients })
        return
      }
      this.$store.dispatch('nostrChat/sendTyping', { roomId: this.roomId, recipients })
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
    onEnterKey (event) {
      if (!event.shiftKey) {
        event.preventDefault()
        this.send()
      }
    },
    onAttachClick () {
      // Use Quasar's q-file pickFiles() method which works on iOS
      this.$nextTick(() => {
        if (this.$refs.qFile) {
          this.$refs.qFile.pickFiles()
        }
      })
    },
    onTipClick () {
      this.$emit('tip')
    },
    onFileSelected (file) {
      if (!file) return
      
      const selectedFile = Array.isArray(file) ? file[0] : file
      if (!selectedFile) return
      
      const sizeLimit = getFileSizeLimit(selectedFile.type)
      if (selectedFile.size > sizeLimit) {
        const sizeMB = Math.round(sizeLimit / (1024 * 1024))
        this.$q.notify({
          type: 'error',
          message: this.$t('FileTooLarge', {}, `File is too large. Maximum size is ${sizeMB}MB.`),
          timeout: 5000,
        })
        this.clearFileSelection()
        return
      }
      
      this.selectedFile = selectedFile
      
      if (selectedFile.type?.startsWith('image/')) {
        this.generateThumbnail(selectedFile)
        if (selectedFile.size >= RESIZE_THRESHOLD) {
          this.imageOriginalSize = selectedFile.size
          this.resizeOption = 'medium'
          this.showResizeDialog = true
          return
        }
      }
      
      this.$nextTick(() => {
        this.sendFile()
      })
    },
    async sendResizedFile (option) {
      if (!option) {
        this.$nextTick(() => this.sendFile())
        return
      }
      const configs = {
        small: { maxDimension: 800, quality: 0.7 },
        medium: { maxDimension: 1600, quality: 0.9, maxSizeBytes: 1 * 1024 * 1024 },
        large: { maxDimension: 2048, quality: 0.85, maxSizeBytes: 2.5 * 1024 * 1024 },
      }
      const cfg = configs[option]
      if (!cfg) return
      try {
        this.selectedFile = await resizeImage(this.selectedFile, cfg)
      } catch (err) {
        console.error('[ChatInput] Image resize failed:', err)
      }
      this.$nextTick(() => this.sendFile())
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

        if (this.selectedFile.type?.startsWith('video/')) {
          const localUrl = URL.createObjectURL(this.selectedFile)
          cacheVideoBlob(message.id, localUrl)
        }
        this.$store.commit('nostrChat/ADD_MESSAGE', { roomId: this.roomId, message })
        this.$store.commit('nostrChat/TOUCH_ROOM_LAST_MESSAGE_AT', this.roomId)
        this.$store.dispatch('nostrChat/touchRoom', { roomId: this.roomId, timestamp: new Date().toISOString() })
        await this.$store.dispatch('nostrChat/publishGiftWraps', { giftWraps })
        const myPubKey = this.$store.getters['nostrChat/myPubKey']
        const room = this.$store.getters['nostrChat/getRoom'](this.roomId)
        if (this.$store.getters['nostrChat/getShowActiveStatus'] && myPubKey && room?.members) {
          this.$store.dispatch('nostrChat/touchActive', {
            pubkey: myPubKey,
            recipients: room.members.filter(m => m !== myPubKey),
          })
        }
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

      if (trimmed.match(/^\/(send|tip)\b/i)) {
        const commandMatch = trimmed.match(SEND_COMMAND_PATTERN)
        if (commandMatch) {
          const amount = parseFloat(commandMatch[2])
          if (!isNaN(amount) && amount > 0) {
            this.$emit('command', {
              type: 'send',
              amount,
              currency: (commandMatch[3] || 'BCH').toUpperCase(),
              originalText: trimmed,
            })
            this.dismissKeyboard()
            this.$nextTick(() => { this.isSending = false })
            return
          }
        }
        // Bare /send or /tip — open send dialog without pre-filled amount
        if (trimmed.match(SEND_BARE_PATTERN)) {
          this.$emit('command', {
            type: 'send',
            amount: 0,
            currency: 'BCH',
            originalText: trimmed,
          })
          this.dismissKeyboard()
          this.$nextTick(() => { this.isSending = false })
          return
        }
        this.isSending = false
        this.$q.notify({
          type: 'warning',
          message: this.$t('InvalidSendCommand', {}, 'Usage: /send or /send <amount> <currency>'),
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
  overflow: visible;
}

.chat-input-container:focus-within {
  box-shadow: 0 4px 24px rgba(59, 130, 246, 0.15), 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  min-width: 0;
}

.chat-text-field {
  width: 100%;
}

.chat-text-field :deep(.q-field__control) {
  background: transparent !important;
}

.chat-text-field :deep(.q-field__native) {
  font-size: 15px;
  color: #1f2937 !important;
  caret-color: #1f2937 !important;
  user-select: text !important;
  -webkit-user-select: text !important;
  resize: none;
  overflow: hidden;
}

.chat-text-field :deep(.q-field__native textarea) {
  resize: none;
  line-height: 1.4;
}

.chat-text-field :deep(.q-field__native::placeholder) {
  color: #9ca3af;
  transition: opacity 0.15s ease;
}

.chat-text-field :deep(.q-field__native:focus::placeholder) {
  opacity: 0;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
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
  color: #e2e8f0 !important;
  caret-color: #e2e8f0 !important;
  user-select: text !important;
  -webkit-user-select: text !important;
}

.dark .fake-caret {
  background-color: #e2e8f0;
}

.dark .chat-text-field :deep(.q-field__native::placeholder) {
  color: #64748b;
}

.dark .chat-text-field :deep(.q-field__native:focus::placeholder) {
  opacity: 0;
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

<!-- Non-scoped styles for teleported q-menu -->
<style>
.chat-actions-menu {
  background: #ffffff !important;
  border: none !important;
  border-radius: 16px !important;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08) !important;
  padding: 6px !important;
  min-width: 220px !important;
  overflow: hidden;
}
.chat-actions-list {
  padding: 0 !important;
}
.chat-action-item {
  border-radius: 12px !important;
  padding: 10px 12px !important;
  transition: background 0.15s ease !important;
}
.chat-action-item:hover {
  background: #f1f5f9 !important;
}
.action-icon-wrapper {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.action-icon-file {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
}
.action-icon-tip {
  background: linear-gradient(135deg, #10b981, #059669);
}
.action-label {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
  line-height: 1.2;
}
.action-hint {
  font-size: 11px;
  color: #94a3b8;
  line-height: 1.2;
  margin-top: 2px;
}

/* Dark mode menu */
body.dark .chat-actions-menu {
  background: #1e293b !important;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 2px 8px rgba(0, 0, 0, 0.3) !important;
}
body.dark .chat-action-item:hover {
  background: #334155 !important;
}
body.dark .action-label {
  color: #e2e8f0;
}
body.dark .action-hint {
  color: #64748b;
}
</style>

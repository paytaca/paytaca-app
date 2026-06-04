<template>
  <div
    class="message-row"
    :class="[isMine ? 'mine' : 'theirs', { 'is-replying': isReplying }]"
    @contextmenu.prevent="onContextMenu"
  >
    <div
      class="message-bubble"
      :class="{ 'new-message': isNew, 'is-deleted': message.deleted, 'is-image-bubble': isImageFile }"
      :style="isMine && !isImageFile ? { background: `linear-gradient(135deg, ${themeColor}, ${themeColor}dd)` } : {}"
      @pointerdown="onPointerDown"
      @pointerup="onPointerUp"
      @pointermove="onPointerMove"
      @pointercancel="onPointerCancel"
    >
      <div
        v-if="showSenderName && !isMine"
        class="sender-name"
        :style="{ color: themeColor }"
      >
        {{ senderName }}
      </div>

      <!-- Reply preview -->
      <div v-if="replyToMessage" class="reply-preview" @click="$emit('scroll-to-message', replyToMessage.id)">
        <div class="reply-preview-indicator" :style="{ background: themeColor }"></div>
        <img
          v-if="replyToMessage.isFile && replyToMessage.fileType?.startsWith('image/') && replyImageThumbnail"
          :src="replyImageThumbnail"
          class="reply-preview-thumb"
          :style="replyToImageThumbStyle"
        />
        <q-icon
          v-else-if="replyToMessage.isFile"
          :name="replyToFileIcon"
          size="18px"
          class="reply-preview-file-icon"
          :style="{ color: themeColor }"
        />
        <div class="reply-preview-body">
          <div class="reply-preview-sender">{{ replySenderName }}</div>
          <div v-if="!replyToMessage.isFile" class="reply-preview-text">{{ replySnippet }}</div>
        </div>
      </div>

      <!-- Plain text content -->
      <div v-if="message.deleted" class="deleted-message">
        <q-icon name="delete_outline" size="14px" class="deleted-icon" />
        <span>{{ $t('MessageDeleted', {}, 'Message deleted') }}</span>
      </div>
      
      <!-- Image message (no bubble styling, just the image) -->
      <div v-else-if="isImageFile" class="image-message" @click="onImageClick" @touchstart="onImageTouchStart" @touchmove="onImageTouchMove" @touchend="onImageTouchEnd">
        <div class="image-frame" :style="imageFrameStyle">
          <q-skeleton v-if="!imageThumbnailUrl" type="rect" animation="wave" class="image-fill" />
          <img v-else :src="imageThumbnailUrl" class="image-fill" draggable="false" @contextmenu.prevent />
        </div>
      </div>

      <!-- Non-image file card -->
      <div v-else-if="message.isFile || parsed.markup?.type === 'file'" class="file-card" @click="downloadFile">
        <div class="file-card-header">
          <q-icon :name="fileIcon" size="28px" class="file-icon" :style="{ color: themeColor }" />
          <div class="file-info">
            <div class="file-name">{{ message.fileName || getFileName(message.content) }}</div>
            <div class="file-meta">{{ formatFileSize(message.fileSize || message.encryptedSize) }} • {{ message.fileType || 'File' }}</div>
          </div>
        </div>
        <div class="file-card-actions">
          <q-btn
            flat
            dense
            round
            icon="download"
            size="sm"
            :loading="isDownloading"
            @click.stop="downloadFile"
          >
            <q-tooltip>Download</q-tooltip>
          </q-btn>
        </div>
      </div>
      
      <template v-else>
        <div class="message-text">{{ displayText }}</div>

        <!-- Rich markup card: payment -->
        <div
          v-if="markup?.type === 'payment'"
          class="payment-card q-mt-sm"
          @click="openTransactionDetail"
        >
          <div class="payment-amount-row">
            <q-icon name="img:bitcoin-cash-circle.svg" size="22px" />
            <span class="payment-amount">{{ markup.amount }} BCH</span>
          </div>
          <div v-if="markup.txid" class="payment-txid">
            <span class="txid-label">TXID</span>
            <span class="txid-value">{{ formatTxid(markup.txid) }}</span>
            <q-icon name="chevron_right" size="16px" class="payment-chevron" />
          </div>
        </div>
      </template>

      <div class="message-meta">
        <span v-if="message.edited" class="edited-label">{{ $t('Edited', {}, 'edited') }}</span>
        <span class="message-time">{{ formatTime(message.created_at) }}</span>
        <span
          v-if="isMine"
          class="read-receipt-wrapper"
          :class="{ 'has-readers': readByNames.length > 0 }"
        >
          <q-icon
            :name="isRead ? 'done_all' : 'done'"
            size="14px"
            class="read-receipt"
            :class="isRead ? 'read' : ''"
          />
          <q-menu
            v-if="readByNames.length > 0"
            anchor="top middle"
            self="bottom middle"
            :offset="[0, 6]"
            class="seen-by-menu"
          >
            <div class="seen-by-menu-inner">
              <div class="read-by-label">{{ $t('SeenBy', {}, 'Seen by') }}</div>
              <div
                v-for="name in readByNames"
                :key="name"
                class="read-by-name"
              >{{ name }}</div>
            </div>
          </q-menu>
        </span>
      </div>
      <div v-if="groupedReactions.length" class="message-reactions">
        <span
          v-for="group in groupedReactions"
          :key="group.emoji"
          class="reaction-badge"
          :class="{ 'reaction-removable': group.isRemovable }"
          @click.stop="expandedReaction = (expandedReaction === group.emoji ? null : group.emoji)"
        >
          {{ group.emoji }} {{ group.count }}
        </span>
      </div>
      <div v-if="expandedReaction" class="reaction-detail" @click.stop>
        <div class="reaction-detail-header">
          <span class="reaction-detail-emoji">{{ expandedReaction }}</span>
          <span class="reaction-detail-count">{{ expandedGroup.count }}</span>
        </div>
        <div class="reaction-detail-list">
          <div
            v-for="reactor in expandedGroup.reactors"
            :key="reactor.pubKey"
            class="reaction-detail-item"
            :class="{ 'is-mine': reactor.pubKey === myPubKey && canRemoveReaction(reactor) }"
            @click="onReactionClick(reactor)"
          >
            <span class="reaction-detail-name">{{ reactorName(reactor.pubKey) }}</span>
            <q-icon v-if="reactor.pubKey === myPubKey && canRemoveReaction(reactor)" name="close" size="14px" class="reaction-remove-icon" />
          </div>
        </div>
      </div>
    </div>

    <!-- Fullscreen image viewer dialog -->
    <q-dialog v-model="showImageDialog" maximized transition-show="fade" transition-hide="fade">
      <div class="image-viewer" :class="getDarkModeClass(darkMode)">
        <div class="image-viewer-header">
          <q-btn flat round icon="close" size="lg" color="white" @click="showImageDialog = false" />
          <div class="image-viewer-filename">{{ message.fileName || getFileName(message.content) }}</div>
          <q-btn flat round icon="download" size="lg" color="white" :loading="isDownloadSaving" @click="downloadFile" />
        </div>
        <div class="image-viewer-body">
          <img v-if="imageFullUrl" :src="imageFullUrl" class="fullscreen-image" />
          <div v-else class="fullscreen-loading">
            <q-spinner color="white" size="48px" />
            <div class="loading-text">{{ $t('LoadingFullImage', {}, 'Loading full image...') }}</div>
          </div>
        </div>
      </div>
    </q-dialog>
  </div>
</template>

<script>
import { parseMessageMarkup } from 'src/utils/chat-markup'
import { decryptFile, downloadFromBlossom } from 'src/wallet/nostr-media'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

const _replyThumbnailCache = new Map()

// Module-level cache for image thumbnails (LRU with max 100 entries)
const _imageThumbnailCache = new Map()
const MAX_THUMBNAIL_CACHE_SIZE = 200

// IndexedDB for persistent thumbnail cache
const DB_NAME = 'paytaca-chat-cache'
const DB_VERSION = 1
const STORE_NAME = 'thumbnails'

let _dbPromise = null

function openDatabase() {
  if (!_dbPromise) {
    _dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)
      
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        }
      }
    })
  }
  return _dbPromise
}

async function getThumbnailFromDB(cacheKey) {
  try {
    const db = await openDatabase()
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const request = store.get(cacheKey)
      request.onsuccess = () => resolve(request.result?.thumbnailUrl || null)
      request.onerror = () => resolve(null)
    })
  } catch {
    return null
  }
}

async function saveThumbnailToDB(cacheKey, thumbnailUrl) {
  try {
    const db = await openDatabase()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    store.put({ id: cacheKey, thumbnailUrl, timestamp: Date.now() })
  } catch (err) {
    console.warn('Failed to save thumbnail to IndexedDB:', err)
  }
}

export async function clearChatCache() {
  try {
    const db = await openDatabase()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    store.clear()
    _imageThumbnailCache.clear()
    _replyThumbnailCache.clear()
    return true
  } catch (err) {
    console.error('Failed to clear chat cache:', err)
    return false
  }
}

function evictOldestThumbnail() {
  if (_imageThumbnailCache.size >= MAX_THUMBNAIL_CACHE_SIZE) {
    const firstKey = _imageThumbnailCache.keys().next().value
    const url = _imageThumbnailCache.get(firstKey)
    if (url && url.startsWith('blob:')) {
      URL.revokeObjectURL(url)
    }
    _imageThumbnailCache.delete(firstKey)
  }
}

function bytesToHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

export default {
  name: 'MessageBubble',
  props: {
    message: { type: Object, required: true },
    myPubKey: { type: String, default: '' },
    showSenderName: { type: Boolean, default: false },
    contacts: { type: Array, default: () => [] },
    isRead: { type: Boolean, default: true },
    readByNames: { type: Array, default: () => [] },
    isNew: { type: Boolean, default: false },
    replyToMessage: { type: Object, default: null },
    isReplying: { type: Boolean, default: false },
    reactions: { type: Array, default: () => [] },
  },
  emits: ['context-menu', 'remove-reaction', 'scroll-to-message'],
    data () {
      return {
        expandedReaction: null,
        now: Date.now(),
        // pointer long-press state
        _pressTimer: null,
        _pressStartX: 0,
        _pressStartY: 0,
        _pressPointerId: null,
        isDownloading: false,
        isDownloadSaving: false,
        imageThumbnailUrl: null, // Small preview for fast browsing
        imageFullUrl: null,      // Full resolution (loaded on click)
        showImageDialog: false,
        replyImageThumbnail: null, // Reply preview thumbnail (reactive)
      }
    },
    mounted () {
      this._timer = setInterval(() => { this.now = Date.now() }, 1000)
      if (this.isImageFile && this.message.aesKeyHex && this.message.nonceHex) {
        // Check if thumbnail is already cached
        const cacheKey = this.message.id || this.message.content
        if (_imageThumbnailCache.has(cacheKey)) {
          this.imageThumbnailUrl = _imageThumbnailCache.get(cacheKey)
        } else {
          // Load thumbnail when image enters viewport
          this._imgObserver = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
              this._imgObserver.disconnect()
              this._imgObserver = null
              this.loadThumbnail()
            }
          }, { rootMargin: '200px' })
          this._imgObserver.observe(this.$el)
        }
      }
    },
   beforeUnmount () {
     this._unmounted = true
     clearInterval(this._timer)
     if (this._imgObserver) {
       this._imgObserver.disconnect()
       this._imgObserver = null
     }
      // Only revoke full image URL (thumbnails are cached globally)
      if (this.imageFullUrl) {
        URL.revokeObjectURL(this.imageFullUrl)
      }
       // Revoke any in-flight thumbnail blob URL
       if (this._pendingThumbnailUrl) {
         URL.revokeObjectURL(this._pendingThumbnailUrl)
         this._pendingThumbnailUrl = null
       }
       // Revoke any in-flight loading thumbnail blob URL
       if (this._loadingBlobUrl) {
         URL.revokeObjectURL(this._loadingBlobUrl)
         this._loadingBlobUrl = null
       }
   },
  computed: {
    isMine () {
      return this.message.sender === this.myPubKey
    },
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    senderName () {
      const contact = this.contacts.find(c => c.pubKeyHex === this.message.sender)
      return contact?.name || this.message.sender?.slice(0, 12) + '...'
    },
    replySenderName () {
      if (!this.replyToMessage) return ''
      const contact = this.contacts.find(c => c.pubKeyHex === this.replyToMessage.sender)
      return contact?.name || this.replyToMessage.sender?.slice(0, 12) + '...'
    },
    replySnippet () {
      if (!this.replyToMessage) return ''
      if (this.replyToMessage.isFile) {
        return this.replyToMessage.fileName || this.$t('File', {}, 'File')
      }
      const { text } = parseMessageMarkup(this.replyToMessage.content || '')
      return text.length > 80 ? text.slice(0, 80) + '...' : text
    },
    replyToFileIcon () {
      if (!this.replyToMessage) return 'description'
      if (this.replyToMessage.fileType?.startsWith('image/')) return 'image'
      if (this.replyToMessage.fileType?.startsWith('video/')) return 'videocam'
      if (this.replyToMessage.fileType?.startsWith('audio/')) return 'audiotrack'
      return 'description'
    },
    replyToImageThumbStyle () {
      const w = this.replyToMessage?.imageWidth || 120
      const h = this.replyToMessage?.imageHeight || 120
      const maxSide = 72
      const scale = Math.min(maxSide / Math.max(w, h), 1)
      return {
        width: Math.round(w * scale) + 'px',
        height: Math.round(h * scale) + 'px',
      }
    },
    themeColor () {
      const theme = this.$store.getters['global/theme']
      if (theme === 'glassmorphic-red') return '#f54270'
      if (theme === 'glassmorphic-green') return '#4caf50'
      if (theme === 'glassmorphic-gold') return '#ffa726'
      return '#3b82f6'
    },
    parsed () {
      return parseMessageMarkup(this.message.content)
    },
    displayText () {
      return this.parsed.text
    },
    markup () {
      return this.parsed.markup
    },
    groupedReactions () {
      const groups = {}
      for (const r of this.reactions) {
        if (!groups[r.emoji]) groups[r.emoji] = { emoji: r.emoji, count: 0, reactors: [], isRemovable: false }
        groups[r.emoji].count++
        groups[r.emoji].reactors.push({ pubKey: r.reactorPubKey, createdAt: r.createdAt })
        if (r.reactorPubKey === this.myPubKey && this.now - (r.createdAt || 0) < 30000) {
          groups[r.emoji].isRemovable = true
        }
      }
      return Object.values(groups)
    },
    expandedGroup () {
      if (!this.expandedReaction) return null
      return this.groupedReactions.find(g => g.emoji === this.expandedReaction)
    },
    fileIcon () {
      if (this.message.fileType?.startsWith('image/')) return 'image'
      if (this.message.fileType?.startsWith('video/')) return 'videocam'
      if (this.message.fileType?.startsWith('audio/')) return 'audiotrack'
      return 'description'
    },
    isImageFile () {
      return this.message.fileType?.startsWith('image/')
    },
    imageFrameStyle () {
      const w = this.message.imageWidth
      const h = this.message.imageHeight
      if (!w || !h) {
        return { width: '360px', paddingBottom: '75%' }
      }
      
      const aspectRatio = h / w
      const isLandscape = w >= h
      
      // Landscape images get more width, portrait images are narrower for proportional appearance
      const maxThumbWidth = isLandscape ? 640 : 200
      const maxThumbHeight = isLandscape ? 480 : 480
      
      const displayWidth = Math.min(w, maxThumbWidth)
      const displayHeight = displayWidth * aspectRatio
      const cappedHeight = Math.min(displayHeight, maxThumbHeight)
      const finalWidth = cappedHeight < displayHeight ? cappedHeight / aspectRatio : displayWidth
      
      return { 
        width: `${finalWidth}px`,
        paddingBottom: `${(cappedHeight / finalWidth) * 100}%`
      }
    },
  },
  watch: {
    replyToMessage: {
      handler (msg) {
        if (!msg || !msg.isFile || !msg.fileType?.startsWith('image/') || !msg.aesKeyHex) {
          this.replyImageThumbnail = null
          return
        }
        const msgId = msg.id || msg.content
        // Check both caches first
        if (_imageThumbnailCache.has(msgId)) {
          this.replyImageThumbnail = _imageThumbnailCache.get(msgId)
          return
        }
        if (_replyThumbnailCache.has(msgId)) {
          this.replyImageThumbnail = _replyThumbnailCache.get(msgId)
          return
        }
        // Load if not cached
        this.loadReplyThumbnail(msg)
      },
      immediate: true, // Trigger on mount if replyToMessage already exists
    },
  },
  methods: {
    getDarkModeClass,
    loadReplyThumbnail (msg) {
      const msgId = msg.id || msg.content
      const blossomServer = 'https://blossom.paytaca.com'
      const self = this
      downloadFromBlossom(msg.content, blossomServer)
        .then(encryptedData => decryptFile(encryptedData, msg.aesKeyHex, msg.nonceHex))
        .then(decryptedData => {
          if (self._unmounted) return
          const blob = new Blob([decryptedData], { type: msg.fileType || 'image/jpeg' })
          const url = URL.createObjectURL(blob)
          self._pendingThumbnailUrl = url
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
            const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.85)
            _replyThumbnailCache.set(msgId, thumbnailUrl)
            self.replyImageThumbnail = thumbnailUrl
            URL.revokeObjectURL(url)
            self._pendingThumbnailUrl = null
          }
          img.onerror = () => {
            URL.revokeObjectURL(url)
            self._pendingThumbnailUrl = null
          }
          img.src = url
        })
        .catch(() => {})
    },
    formatTime (ts) {
      if (!ts) return ''
      const d = new Date(ts * 1000)
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    },
    formatTxid (txid) {
      if (!txid || txid.length < 16) return txid
      return txid.slice(0, 8) + '...' + txid.slice(-8)
    },
    openTransactionDetail () {
      if (!this.markup?.txid) return
      this.$emit('open-transaction', this.message.id)
    },
    onContextMenu ($event) {
      if (this.message.deleted) return
      this.$emit('context-menu', this.message, $event)
    },
    // Pointer-based long-press detection. Uses pointer events to unify mouse/touch input
    onPointerDown (e) {
      if (this.message.deleted) return
      // Only start long-press for primary button/touch
      if (e.button && e.button !== 0) return
      // Remember pointer id to ignore unrelated pointers
      this._pressPointerId = e.pointerId
      this._pressStartX = e.clientX
      this._pressStartY = e.clientY

      // Start timer (600ms) to detect long-press
      this._pressTimer = setTimeout(() => {
        // Prevent default only when long-press triggers to avoid interfering with scroll
        try { e.preventDefault() } catch (_) {}
        
        this.$emit('context-menu', this.message, { clientX: e.clientX, clientY: e.clientY })
        // Clear state
        this._clearPress()
      }, 600)
    },
    onPointerMove (e) {
      if (!this._pressTimer || e.pointerId !== this._pressPointerId) return
      const dx = Math.abs(e.clientX - this._pressStartX)
      const dy = Math.abs(e.clientY - this._pressStartY)
      if (dx > 10 || dy > 10) {
        this._clearPress()
      }
    },
    onPointerUp (e) {
      // If timer still pending, cancel it. Do NOT treat as long-press.
      if (e.pointerId && this._pressPointerId && e.pointerId !== this._pressPointerId) return
      this._clearPress()
    },
    onPointerCancel (e) {
      if (e.pointerId && this._pressPointerId && e.pointerId !== this._pressPointerId) return
      this._clearPress()
    },
    _clearPress () {
      if (this._pressTimer) {
        clearTimeout(this._pressTimer)
        this._pressTimer = null
      }
      this._pressPointerId = null
      this._pressStartX = 0
      this._pressStartY = 0
    },
    reactorName (pubKey) {
      if (pubKey === this.myPubKey) return this.$t('You', {}, 'You')
      const contact = this.contacts.find(c => c.pubKeyHex === pubKey)
      return contact?.name || pubKey.slice(0, 12) + '...'
    },
    canRemoveReaction (reactor) {
      if (reactor.pubKey !== this.myPubKey) return false
      return this.now - (reactor.createdAt || 0) < 30000
    },
    onReactionClick (reactor) {
      if (reactor.pubKey === this.myPubKey && this.canRemoveReaction(reactor)) {
        this.$emit('remove-reaction', { messageId: this.message.id || this.message.kind14Id, emoji: this.expandedReaction })
        this.expandedReaction = null
      }
    },
    getFileName (url) {
      if (!url) return 'Unknown file'
      const parts = url.split('/')
      const lastPart = parts[parts.length - 1]
      // If it's a hash, add extension based on type
      if (lastPart.length === 64) {
        const ext = this.getFileExtension()
        return `file${ext}`
      }
      return lastPart || 'Unknown file'
    },
    formatFileSize (bytes) {
      if (!bytes || bytes < 1024) return (bytes || 0) + ' B'
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
      return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
    },
    getFileExtension () {
      if (this.message.fileType?.includes('image')) return '.jpg'
      if (this.message.fileType?.includes('video')) return '.mp4'
      if (this.message.fileType?.includes('audio')) return '.mp3'
      return ''
    },
    async loadThumbnail () {
      const cacheKey = this.message.id || this.message.content
      
      // Check in-memory cache first
      if (_imageThumbnailCache.has(cacheKey)) {
        this.imageThumbnailUrl = _imageThumbnailCache.get(cacheKey)
        return
      }

      // Check IndexedDB cache
      const dbThumbnail = await getThumbnailFromDB(cacheKey)
      if (dbThumbnail) {
        this.imageThumbnailUrl = dbThumbnail
        _imageThumbnailCache.set(cacheKey, dbThumbnail)
        return
      }

      if (this.isDownloading) return

      const aesKeyHex = this.message.aesKeyHex
      const nonceHex = this.message.nonceHex
      const fileUrl = this.message.content

      if (!aesKeyHex || !nonceHex || !fileUrl) return

      this.isDownloading = true
      try {
        const blossomServer = 'https://blossom.paytaca.com'
        const encryptedData = await downloadFromBlossom(fileUrl, blossomServer)
        const decryptedData = await decryptFile(encryptedData, aesKeyHex, nonceHex)

        const mimeType = this.message.fileType || 'image/jpeg'
        const blob = new Blob([decryptedData], { type: mimeType })
        
        // Generate thumbnail with aspect ratio preservation
        const img = new Image()
        const blobUrl = URL.createObjectURL(blob)
        this._loadingBlobUrl = blobUrl
        
        img.onload = async () => {
          const canvas = document.createElement('canvas')
          
          // Use larger max dimensions for better quality
          const isLandscape = img.width >= img.height
          const maxWidth = isLandscape ? 960 : 300
          const maxHeight = isLandscape ? 720 : 720
          
          const aspectRatio = img.height / img.width
          let thumbWidth = Math.min(img.width, maxWidth)
          let thumbHeight = thumbWidth * aspectRatio
          
          // Cap height and recalculate width if needed
          if (thumbHeight > maxHeight) {
            thumbHeight = maxHeight
            thumbWidth = thumbHeight / aspectRatio
          }
          
          canvas.width = thumbWidth
          canvas.height = thumbHeight
          
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0, thumbWidth, thumbHeight)
          
          // Higher quality JPEG compression
          const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.92)
          
          // Cache in memory
          evictOldestThumbnail()
          _imageThumbnailCache.set(cacheKey, thumbnailUrl)
          
          // Persist to IndexedDB
          await saveThumbnailToDB(cacheKey, thumbnailUrl)
          
          this.imageThumbnailUrl = thumbnailUrl
          URL.revokeObjectURL(blobUrl)
          this._loadingBlobUrl = null
        }
        
        img.onerror = () => {
          URL.revokeObjectURL(blobUrl)
          this._loadingBlobUrl = null
        }
        
        img.src = blobUrl
      } catch (err) {
        console.error('Thumbnail load error:', err)
      } finally {
        this.isDownloading = false
      }
    },
    async loadFullImage () {
      if (this.imageFullUrl || this.isDownloading) return

      const aesKeyHex = this.message.aesKeyHex
      const nonceHex = this.message.nonceHex
      const fileUrl = this.message.content

      if (!aesKeyHex || !nonceHex || !fileUrl) return

      this.isDownloading = true
      try {
        const blossomServer = 'https://blossom.paytaca.com'
        const encryptedData = await downloadFromBlossom(fileUrl, blossomServer)
        const decryptedData = await decryptFile(encryptedData, aesKeyHex, nonceHex)

        const mimeType = this.message.fileType || 'image/jpeg'
        const blob = new Blob([decryptedData], { type: mimeType })
        if (this.imageFullUrl) URL.revokeObjectURL(this.imageFullUrl)
        this.imageFullUrl = URL.createObjectURL(blob)
      } catch (err) {
        console.error('Full image load error:', err)
      } finally {
        this.isDownloading = false
      }
    },
    onImageClick () {
      if (!this.imageThumbnailUrl) return
      this.showImageDialog = true
      // Load full resolution image when dialog opens
      if (!this.imageFullUrl) {
        this.loadFullImage()
      }
    },
    onImageTouchStart (e) {
      this._imgTouchTimer = setTimeout(() => {
        e.preventDefault()
        this.onContextMenu(e)
        this._imgTouchFired = true
      }, 600)
      this._imgTouchX = e.touches[0].clientX
      this._imgTouchY = e.touches[0].clientY
      this._imgTouchFired = false
    },
    onImageTouchMove (e) {
      const dx = Math.abs(e.touches[0].clientX - this._imgTouchX)
      const dy = Math.abs(e.touches[0].clientY - this._imgTouchY)
      if (dx > 10 || dy > 10) {
        clearTimeout(this._imgTouchTimer)
      }
    },
    onImageTouchEnd () {
      clearTimeout(this._imgTouchTimer)
      if (this._imgTouchFired) {
        this._imgTouchFired = false
      }
    },
    async downloadFile () {
      const aesKeyHex = this.message.aesKeyHex
      const nonceHex = this.message.nonceHex
      const fileUrl = this.message.content

      if (!aesKeyHex || !nonceHex || !fileUrl) {
        this.$q.notify({
          type: 'negative',
          message: this.$t('FileDecryptKeyMissing', {}, 'Decryption key not available'),
          timeout: 3000,
        })
        return
      }

      this.isDownloadSaving = true
      try {
        const blossomServer = 'https://blossom.paytaca.com'
        const encryptedData = await downloadFromBlossom(fileUrl, blossomServer)
        const decryptedData = await decryptFile(encryptedData, aesKeyHex, nonceHex)

        const mimeType = this.message.fileType || 'application/octet-stream'
        const blob = new Blob([decryptedData], { type: mimeType })
        const blobUrl = URL.createObjectURL(blob)

        const fileName = this.message.fileName || this.getFileName(fileUrl)
        const link = document.createElement('a')
        link.href = blobUrl
        link.download = fileName
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        setTimeout(() => URL.revokeObjectURL(blobUrl), 60000)

        this.$q.notify({
          type: 'positive',
          message: this.$t('FileDownloaded', {}, 'File downloaded'),
          timeout: 2000,
        })
      } catch (err) {
        console.error('Download/decrypt error:', err)
        this.$q.notify({
          type: 'negative',
          message: this.$t('FileDownloadFailed', {}, 'Download failed') + ': ' + err.message,
          timeout: 5000,
        })
      } finally {
        this.isDownloadSaving = false
      }
    },
  },
}
</script>

<style scoped>
.message-row {
  display: flex;
  width: 100%;
  margin-bottom: 8px;
  touch-action: manipulation;
  min-width: 0;
}

.message-row.mine {
  justify-content: flex-end;
}

.message-row.theirs {
  justify-content: flex-start;
}

.message-bubble {
  max-width: 80%;
  padding: 10px 14px;
  border-radius: 18px;
  position: relative;
  word-wrap: break-word;
  line-height: 1.45;
  touch-action: manipulation;
  -webkit-user-select: none;
  user-select: none;
  min-width: 0;
  overflow: hidden;
}

.message-row.mine .message-bubble {
  color: #ffffff;
  border-bottom-right-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.message-row.theirs .message-bubble {
  background: #ffffff;
  color: #1f2937;
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-bottom-left-radius: 4px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}

.message-bubble.is-deleted {
  opacity: 0.5;
  background: transparent !important;
  border-color: transparent !important;
  box-shadow: none !important;
  padding: 6px 14px;
}

.sender-name {
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 4px;
}

/* Reply preview */
.reply-preview {
  display: flex;
  align-items: stretch;
  gap: 8px;
  margin-bottom: 6px;
  padding: 6px 10px;
  background: rgba(0, 0, 0, 0.04);
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.reply-preview:hover {
  background: rgba(0, 0, 0, 0.08);
}

.reply-preview-indicator {
  width: 3px;
  border-radius: 2px;
  flex-shrink: 0;
}

.reply-preview-thumb {
  width: 48px;
  height: 48px;
  border-radius: 6px;
  object-fit: cover;
  flex-shrink: 0;
  border: 2px solid rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.1);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.reply-preview-file-icon {
  flex-shrink: 0;
}

.reply-preview-body {
  flex: 1;
  min-width: 0;
}

.reply-preview-sender {
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 2px;
  opacity: 0.8;
}

.reply-preview-text {
  font-size: 13px;
  opacity: 0.65;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Dark mode reply preview */
.dark .reply-preview {
  background: rgba(255, 255, 255, 0.06);
}

.dark .reply-preview:hover {
  background: rgba(255, 255, 255, 0.1);
}

.dark .reaction-badge {
  background: rgba(255, 255, 255, 0.1);
}

.dark .reaction-detail {
  background: rgba(255, 255, 255, 0.06);
}

.dark .reaction-detail-item.is-mine:hover {
  background: rgba(255, 255, 255, 0.08);
}

/* Replying indicator */
.message-row.is-replying .message-bubble {
  box-shadow: 0 0 0 2px var(--replying-color, #3b82f6) !important;
}

.message-text {
  font-size: 15px;
  white-space: pre-wrap;
  word-break: break-word;
  -webkit-user-select: none;
  user-select: none;
  -webkit-touch-callout: none;
}

.message-reactions {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 6px;
}

.reaction-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 13px;
  line-height: 1.4;
  background: rgba(0, 0, 0, 0.06);
  color: inherit;
  cursor: pointer;
  transition: transform 0.12s ease, background-color 0.12s ease;
}

.reaction-badge:hover {
  transform: scale(1.08);
}

.reaction-badge:active {
  transform: scale(0.95);
}

.reaction-badge.reaction-removable {
  animation: reactionPulse 2s ease-in-out infinite;
}

@keyframes reactionPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.45; }
}

.message-row.mine .message-bubble.is-image-bubble .reaction-badge {
  background: rgba(0, 0, 0, 0.06);
}

.message-row.mine .reaction-badge {
  background: rgba(255, 255, 255, 0.2);
}

.reaction-detail {
  margin-top: 4px;
  padding: 8px 10px;
  background: rgba(0, 0, 0, 0.04);
  border-radius: 10px;
  font-size: 13px;
  line-height: 1.5;
  max-width: 220px;
}

.reaction-detail-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
  font-weight: 600;
}

.reaction-detail-emoji {
  font-size: 16px;
}

.reaction-detail-count {
  color: #6b7280;
  font-size: 12px;
  font-weight: 400;
}

.reaction-detail-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.reaction-detail-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 3px 6px;
  border-radius: 6px;
  cursor: default;
}

.reaction-detail-item.is-mine {
  cursor: pointer;
}

.reaction-detail-item.is-mine:hover {
  background: rgba(0, 0, 0, 0.06);
}

.reaction-detail-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.reaction-remove-icon {
  opacity: 0.5;
  flex-shrink: 0;
  margin-left: 6px;
}

.message-meta {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
}

.message-time {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.55);
}

.message-row.theirs .message-time {
  color: rgba(0, 0, 0, 0.35);
}

.dark .message-row.theirs .message-time {
  color: rgba(255, 255, 255, 0.3);
}

.edited-label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  font-style: italic;
}

.message-row.theirs .edited-label {
  color: rgba(0, 0, 0, 0.35);
}

.dark .message-row.theirs .edited-label {
  color: rgba(255, 255, 255, 0.3);
}

.deleted-message {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-style: italic;
  opacity: 0.5;
}

.deleted-icon {
  opacity: 0.6;
}

.read-receipt-wrapper {
  display: inline-flex;
  align-items: center;
  cursor: default;
}

.read-receipt-wrapper.has-readers {
  cursor: pointer;
}

.read-receipt {
  font-size: 14px;
  color: #fff;
}

.read-receipt.read {
  color: #34d399;
}

.seen-by-menu {
  border-radius: 10px !important;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.18) !important;
  overflow: hidden;
}

/* Payment card */
.payment-card {
  padding: 12px 14px;
  margin-bottom: 6px;
  background: linear-gradient(135deg, #f0fdf4, #dcfce7);
  border: 1px solid #bbf7d0;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.payment-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(34, 197, 94, 0.15);
}

.payment-card:active {
  transform: translateY(0);
}

.message-row.mine .message-bubble.is-image-bubble {
  background: transparent !important;
  box-shadow: none !important;
  border: none !important;
  padding: 4px;
  border-radius: 12px;
}

.message-row.mine .message-bubble.is-image-bubble .message-time {
  color: rgba(0, 0, 0, 0.45);
}

.message-row.mine .message-bubble.is-image-bubble .edited-label {
  color: rgba(0, 0, 0, 0.35);
}

.message-row.mine .message-bubble.is-image-bubble .read-receipt {
  color: rgba(255, 255, 255, 0.8);
}

.message-row.mine .message-bubble.is-image-bubble .read-receipt.read {
  color: #34d399;
}

.message-row.theirs .message-bubble.is-image-bubble {
  background: transparent !important;
  box-shadow: none !important;
  border: none !important;
  padding: 4px;
  border-radius: 12px;
}

/* Image message (no bubble) */
.image-message {
  display: block;
  cursor: pointer;
}

.image-frame {
  position: relative;
  display: inline-block;
  height: 0;
  border-radius: 12px;
  overflow: hidden;
  max-width: 100%;
}

.image-fill {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  -webkit-user-select: none;
  user-select: none;
  -webkit-touch-callout: none;
  pointer-events: none;
  border-radius: 12px;
}

/* Fullscreen image viewer */
.image-viewer {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #000000;
}

.image-viewer-header {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  gap: 8px;
  color: #ffffff;
  flex-shrink: 0;
  z-index: 10;
}

.image-viewer-header .q-btn {
  color: #ffffff;
}

.image-viewer-filename {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  color: #ffffff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.image-viewer-body {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: auto;
  min-height: 0;
}

.fullscreen-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.fullscreen-loading {
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

.dark .message-row.mine .message-bubble.is-image-bubble .message-time,
.dark .message-row.mine .message-bubble.is-image-bubble .edited-label,
.dark .message-row.mine .message-bubble.is-image-bubble .read-receipt {
  color: rgba(255, 255, 255, 0.5);
}

.dark .message-row.mine .message-bubble.is-image-bubble .read-receipt.read {
  color: #34d399;
}

/* File card */
.file-card {
  padding: 12px 14px;
  margin-bottom: 6px;
  background: linear-gradient(135deg, #eff6ff, #dbeafe);
  border: 1px solid #bfdbfe;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  min-width: 200px;
}

.file-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
}

.file-card:active {
  transform: translateY(0);
}

.file-card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.file-icon {
  flex-shrink: 0;
}

.file-info {
  flex: 1;
  min-width: 0;
}

.file-name {
  font-size: 14px;
  font-weight: 600;
  color: #1e40af;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-meta {
  font-size: 11px;
  color: #64748b;
  margin-top: 2px;
}

.file-card-actions {
  display: flex;
  gap: 4px;
}

.dark .file-card {
  background: linear-gradient(135deg, #1e3a5f, #1e40af);
  border-color: #1e40af;
}

.dark .file-name {
  color: #93c5fd;
}

.dark .file-meta {
  color: #94a3b8;
}

.dark .file-card:hover {
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
}

.payment-amount-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.payment-amount {
  font-size: 18px;
  font-weight: 700;
  color: #166534;
}

.payment-txid {
  display: flex;
  align-items: center;
  gap: 6px;
}

.txid-label {
  font-size: 10px;
  font-weight: 700;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.txid-value {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  color: #374151;
  flex: 1;
}

.payment-chevron {
  color: #9ca3af;
  margin-left: auto;
}

/* Dark mode overrides */
.dark .message-row.theirs .message-bubble {
  background: #1e293b;
  color: #e2e8f0;
  border-color: rgba(255, 255, 255, 0.06);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
}

.dark .payment-card {
  background: linear-gradient(135deg, #14532d, #166534);
  border-color: #166534;
}

.dark .payment-amount {
  color: #86efac;
}

.dark .txid-label {
  color: #9ca3af;
}

.dark .txid-value {
  color: #d1d5db;
}

.dark .payment-chevron {
  color: #6b7280;
}

.dark .payment-card:hover {
  box-shadow: 0 4px 12px rgba(34, 197, 94, 0.25);
}

.dark .read-receipt {
  color: #fff;
}

.dark .read-receipt.read {
  color: #34d399;
}

/* New message highlight — elegant background fade */
/* Only applies to received messages (not sent by me) */
.message-row.theirs .message-bubble.new-message {
  animation: newMessageFade 4s ease-out forwards;
}

@keyframes newMessageFade {
  0%, 20% {
    background-color: #dbeafe;
    box-shadow: 0 2px 16px rgba(59, 130, 246, 0.12);
  }
  100% {
    background-color: #ffffff;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
  }
}

/* Dark mode: new message highlight */
.dark .message-row.theirs .message-bubble.new-message {
  animation: newMessageFadeDark 4s ease-out forwards;
}

@keyframes newMessageFadeDark {
  0%, 20% {
    background-color: #1a3655;
    box-shadow: 0 2px 12px rgba(59, 130, 246, 0.12);
  }
  100% {
    background-color: #1e293b;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
  }
}
</style>

<style>
/* Global styles for seen-by q-menu portal content (unscoped — q-menu renders outside component) */
.seen-by-menu-inner {
  padding: 10px 14px;
  min-width: 120px;
  max-height: 220px;
  overflow-y: auto;
}

.seen-by-menu-inner .read-by-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #6b7280;
  margin-bottom: 6px;
  position: sticky;
  top: 0;
  background: inherit;
  padding-top: 2px;
  padding-bottom: 4px;
}

.seen-by-menu-inner .read-by-name {
  font-size: 13px;
  padding: 2px 0;
  color: #111827;
}

.body--dark .seen-by-menu-inner .read-by-label {
  color: #9ca3af;
  background: transparent;
}

.body--dark .seen-by-menu-inner .read-by-name {
  color: #f3f4f6;
}
</style>

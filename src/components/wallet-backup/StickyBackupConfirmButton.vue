<template>
  <div 
    v-if="!lastBackupTimestamp && (!isAtBottom || !hasScrolled || showAfterTimeout)" 
    class="sticky-button-container"
    :class="getDarkModeClass(darkMode)"
  >
    <div class="confirm-backup-instructions q-mb-md">
      {{ $t('ConfirmBackupInstructions', {}, 'Click the button below to confirm that you already made a backup.') }}
    </div>
    <q-btn
      unelevated
      no-caps
      class="sticky-confirm-button full-width bg-grad"
      :class="themeClass"
      :label="$t('ConfirmBackup', {}, 'Confirm Backup')"
      @click="showConfirmationDialog"
      padding="lg"
    />
  </div>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

export default {
  name: 'StickyBackupConfirmButton',
  
  props: {
    authenticated: {
      type: Boolean,
      required: true
    }
  },
  
  data () {
    return {
      isAtBottom: false,
      hasScrolled: false,
      showAfterTimeout: true,
      bottomTimeout: null,
      scrollHandler: null
    }
  },
  
  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    lastBackupTimestamp () {
      return this.$store.getters['global/lastBackupTimestamp']
    },
    theme () {
      return this.$store.getters['global/theme']
    },
    themeClass () {
      return `theme-${this.theme}`
    }
  },
  
  watch: {
    authenticated (newVal) {
      if (newVal && !this.lastBackupTimestamp) {
        this.$nextTick(() => {
          this.addScrollListener()
        })
      }
    }
  },
  
  methods: {
    getDarkModeClass,
    checkIfAtBottom () {
      const windowHeight = window.innerHeight
      const documentHeight = document.documentElement.scrollHeight
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop
      const threshold = 50
      return scrollTop + windowHeight >= documentHeight - threshold
    },
    startShowHideCycle () {
      const vm = this
      // Show the button
      vm.showAfterTimeout = true
      // Clear any existing timeout
      if (vm.bottomTimeout) {
        clearTimeout(vm.bottomTimeout)
      }
      // Start timer to hide after 3 seconds
      vm.bottomTimeout = setTimeout(() => {
        // Check if still at bottom
        if (vm.checkIfAtBottom()) {
          // Still at bottom - hide the button
          vm.showAfterTimeout = false
          // Start timer to show again after 3 seconds
          vm.bottomTimeout = setTimeout(() => {
            // Check again if still at bottom
            if (vm.checkIfAtBottom()) {
              // Still at bottom - restart the cycle
              vm.startShowHideCycle()
            } else {
              // Not at bottom - keep button shown and clear timer
              vm.showAfterTimeout = true
              vm.bottomTimeout = null
            }
          }, 3000)
        } else {
          // Not at bottom - keep button shown and clear timer
          vm.showAfterTimeout = true
          vm.bottomTimeout = null
        }
      }, 3000)
    },
    checkScrollPosition () {
      const vm = this
      const windowHeight = window.innerHeight
      const documentHeight = document.documentElement.scrollHeight
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop
      
      // Mark that user has scrolled
      if (scrollTop > 0) {
        vm.hasScrolled = true
      }
      
      // Only hide if page is scrollable and user has scrolled to bottom
      // If page height <= viewport height, always show (page not scrollable)
      if (documentHeight <= windowHeight) {
        vm.isAtBottom = false
        // Clear any timeout and show button
        if (vm.bottomTimeout) {
          clearTimeout(vm.bottomTimeout)
          vm.bottomTimeout = null
        }
        vm.showAfterTimeout = true
        return
      }
      
      // Check if at bottom
      const isAtBottom = vm.checkIfAtBottom()
      const wasAtBottom = vm.isAtBottom
      vm.isAtBottom = isAtBottom && vm.hasScrolled
      
      // If just reached bottom, hide and start the show/hide cycle
      if (vm.isAtBottom && !wasAtBottom) {
        vm.showAfterTimeout = false
        // Clear any existing timeout
        if (vm.bottomTimeout) {
          clearTimeout(vm.bottomTimeout)
        }
        // Start the cycle: show after 3 seconds, then hide, then show again, etc.
        vm.bottomTimeout = setTimeout(() => {
          // Check if still at bottom
          if (vm.checkIfAtBottom()) {
            // Still at bottom - start the show/hide cycle
            vm.startShowHideCycle()
          } else {
            // Not at bottom anymore - show the button
            vm.showAfterTimeout = true
            vm.bottomTimeout = null
          }
        }, 3000)
      }
      
      // If scrolled away from bottom, clear timeout and show immediately
      if (!vm.isAtBottom && wasAtBottom) {
        if (vm.bottomTimeout) {
          clearTimeout(vm.bottomTimeout)
          vm.bottomTimeout = null
        }
        vm.showAfterTimeout = true
      }
    },
    addScrollListener () {
      const vm = this
      this.scrollHandler = this.checkScrollPosition
      window.addEventListener('scroll', this.scrollHandler, { passive: true })
      // Check initial position after a brief delay to ensure content is rendered
      this.$nextTick(() => {
        setTimeout(() => {
          vm.checkScrollPosition()
        }, 100)
      })
    },
    removeScrollListener () {
      if (this.scrollHandler) {
        window.removeEventListener('scroll', this.scrollHandler)
        this.scrollHandler = null
      }
      // Clear timeout on unmount
      if (this.bottomTimeout) {
        clearTimeout(this.bottomTimeout)
        this.bottomTimeout = null
      }
    },
    showConfirmationDialog () {
      const vm = this
      this.$q.dialog({
        title: this.$t('ConfirmBackupDone', {}, 'Confirm Backup'),
        message: this.$t('BackupConfirmationWarning', {}, 'Warning: If you lose your device without a backup, you will permanently lose access to your funds. Only mark this as done if you have securely backed up your recovery phrase.'),
        icon: 'warning',
        iconColor: 'warning',
        persistent: true,
        ok: {
          label: this.$t('IUnderstandMarkAsDone', {}, 'I Understand, Mark as Done'),
          color: 'negative',
          flat: true
        },
        cancel: {
          label: this.$t('Cancel'),
          flat: true,
          color: 'grey'
        },
        class: `br-15 pt-card text-bow ${this.getDarkModeClass(this.darkMode)}`,
        style: 'min-width: 300px'
      }).onOk(() => {
        // Record the timestamp when backup was confirmed for this wallet
        // Each wallet is tracked independently
        vm.$store.commit('global/setLastBackupTimestamp', Date.now())
        vm.$q.notify({
          type: 'positive',
          message: vm.$t('BackupReminderDisabled', {}, 'Backup reminder has been disabled'),
          position: 'top',
          timeout: 2000
        })
      })
    }
  },
  
  mounted () {
    if (this.authenticated && !this.lastBackupTimestamp) {
      this.$nextTick(() => {
        this.addScrollListener()
      })
    }
  },
  
  beforeUnmount () {
    this.removeScrollListener()
  }
}
</script>

<style lang="scss" scoped>
  .sticky-button-container {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 24px 16px;
    background: rgba(255, 255, 255, 0.98);
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    box-shadow: 0 -2px 32px rgba(0, 0, 0, 0.08), 0 -1px 0 rgba(0, 0, 0, 0.05);
    z-index: 1000;
    max-width: 800px;
    margin: 0 auto;
    border-top: 1px solid rgba(0, 0, 0, 0.06);

    &.dark {
      background: rgba(26, 29, 35, 0.98);
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      box-shadow: 0 -2px 32px rgba(0, 0, 0, 0.3), 0 -1px 0 rgba(255, 255, 255, 0.05);
    }

    .confirm-backup-instructions {
      text-align: center;
      font-size: 13px;
      line-height: 1.6;
      opacity: 0.75;
      padding: 0 12px 16px;
      color: var(--q-dark);
      font-weight: 400;
      letter-spacing: -0.01em;
      
      .dark & {
        color: rgba(255, 255, 255, 0.8);
      }
    }

    .sticky-confirm-button {
      font-size: 15px;
      font-weight: 600;
      letter-spacing: 0.3px;
      border-radius: 14px;
      height: 52px;
      color: white !important;
      backdrop-filter: blur(20px) saturate(180%);
      -webkit-backdrop-filter: blur(20px) saturate(180%);
      border: 1px solid rgba(255, 255, 255, 0.25);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12), 0 2px 4px rgba(0, 0, 0, 0.08);
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      text-transform: none;
      display: flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
      
      :deep(.q-btn__content) {
        line-height: 1;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      &:hover {
        transform: translateY(-1px);
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.16), 0 3px 6px rgba(0, 0, 0, 0.1);
      }
      
      &:active {
        transform: translateY(0);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
      }
    }
  }
</style>


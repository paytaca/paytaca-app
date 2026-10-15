<template>
  <div class="pt-custom-keyboard" :class="{'pt-custom-keyboard--embedded': embedded}" v-if="keyboard">
    <div class="pt-keyboard-container shadow-2 br-top-15 pt-card" :class="getDarkModeClass(darkMode)">
      <div class="row q-px-sm q-mb-none q-py-sm pt-custom-keyboard-row br-top-15 full-height bg-grad q-pb-lg q-pt-md">
        <div class="col-3 pt-col-key" v-for="(key, index) in 15" :key="index">
          <q-btn
            push
            v-if="[4, 8].includes(key)"
            @click="makeKeyAction(key === 4 ? 'delete' : 'backspace')"
            class="pt-key-del"
            style="width: 95%; height: 95%"
            :class="['pt-remove-key', {'bg-grey-9 text-white': darkMode}]"
            :icon="key === 4 ? 'delete' : 'backspace'" />
          <q-btn
            push
            v-else-if="key === 12 && !hideCheckKey"
            @click="makeKeyAction('ready to submit')"
            class="pt-key-del pt-check-key"
            style="width: 95%; height: 95%"
            icon="done" />
          <div v-else-if="key === 12 && hideCheckKey" />
          <q-btn
            push
            class="pt-key-num"
            color="white"
            text-color="dark"
            style="width: 95%; height: 95%; font-weight: 400; line-height: 200%"
            :class="{'pt-bg-dark': darkMode}"
            v-else-if="key !== 13"
            :label="key > 3 ? key > 8 ? key === 13 ? '' : key === 14 ? 0 : key === 15 ? getLocaleSeparators().decimal : (key-2) : (key-1) : key"
            @click="enterKey(key > 3 ? key > 8 ? key === 13 ? '' : key === 14 ? 0 : key === 15 ? '.' : (key-2) : (key-1) : key)" />
        </div>
      </div>
    </div>
  </div>
</template>
<script>
import { Capacitor } from '@capacitor/core'
import { getLocaleSeparators } from 'src/utils/denomination-utils'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

export default {
  emits: ['addKey', 'makeKeyAction', 'update:modelValue', 'backPressed'],
  props: {
    customKeyboardState: {},
    modelValue: {
      type: [String, Number],
      default: ''
    },
    hideCheckKey: {
      type: Boolean,
      default: false
    },
    embedded: {
      type: Boolean,
      default: false
    }
  },
  data () {
    return {
      val: this.modelValue,
      keyboard: this.customKeyboardState === 'show',
      darkMode: this.$store.getters['darkmode/getStatus']
    }
  },
  computed: {
    parsedValue () {
      return Number(this.val)
    }
  },
  created () {
    this.__kbSentinelActive = false
    this.__kbObstructionObserver = null
    this.__kbObstructionCheckTimer = null
    this.__kbObstructionHideTimer = null
    this.__kbOnViewportChange = () => this.scheduleObstructionCheck()
    this.__kbOnPopstate = () => {
      if (this.__kbSentinelActive) {
        this.__kbSentinelActive = false
        window.removeEventListener('popstate', this.__kbOnPopstate)
      }
      if (this.customKeyboardState === 'show') {
        const activeEl = document.activeElement
        if (activeEl && typeof activeEl.blur === 'function') activeEl.blur()
        this.$emit('backPressed')
      }
    }
  },
  mounted () {
    if (this.customKeyboardState === 'show') this.addBackButtonSentinel()
    if (this.keyboard) this.startObstructionWatch()
  },
  beforeUnmount () {
    this.removeBackButtonSentinel()
    this.stopObstructionWatch()
  },
  methods: {
    getLocaleSeparators,
    getDarkModeClass,

    addBackButtonSentinel () {
      if (Capacitor.getPlatform() !== 'android' || this.__kbSentinelActive) return
      this.__kbSentinelActive = true
      window.addEventListener('popstate', this.__kbOnPopstate)
      window.history.pushState({ ...window.history.state, __ptCustomKeyboard: true }, '')
    },
    removeBackButtonSentinel () {
      if (!this.__kbSentinelActive) return
      this.__kbSentinelActive = false
      window.removeEventListener('popstate', this.__kbOnPopstate)
      if (window.history.state?.__ptCustomKeyboard === true) window.history.back()
    },

    // Universal auto-hide: while the keyboard is open, if a user-facing message
    // (alert/warning/error/notice/notification) is rendered in the area the
    // keyboard covers, hide the keyboard after a short delay so the message is
    // readable. Tapping an amount input brings the keyboard back.
    obstructionSelectors () {
      return '[role="alert"],[role="status"],[aria-live="polite"],[aria-live="assertive"],.q-notification,.q-dialog,.q-banner'
    },
    isObstructionCandidateVisible (el) {
      if (!el || !el.isConnected) return false
      const style = window.getComputedStyle(el)
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false
      const rect = el.getBoundingClientRect()
      return rect.width > 0 && rect.height > 0
    },
    startObstructionWatch () {
      if (typeof MutationObserver !== 'undefined' && !this.__kbObstructionObserver) {
        this.__kbObstructionObserver = new MutationObserver(() => this.scheduleObstructionCheck())
        this.__kbObstructionObserver.observe(document.body, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ['class', 'style']
        })
      }
      window.addEventListener('scroll', this.__kbOnViewportChange, true)
      window.addEventListener('resize', this.__kbOnViewportChange)
      this.scheduleObstructionCheck()
    },
    stopObstructionWatch () {
      if (this.__kbObstructionObserver) {
        this.__kbObstructionObserver.disconnect()
        this.__kbObstructionObserver = null
      }
      window.removeEventListener('scroll', this.__kbOnViewportChange, true)
      window.removeEventListener('resize', this.__kbOnViewportChange)
      if (this.__kbObstructionCheckTimer) {
        clearTimeout(this.__kbObstructionCheckTimer)
        this.__kbObstructionCheckTimer = null
      }
      this.cancelObstructionHide()
    },
    scheduleObstructionCheck () {
      if (this.__kbObstructionCheckTimer) return
      this.__kbObstructionCheckTimer = setTimeout(() => {
        this.__kbObstructionCheckTimer = null
        this.checkForObstruction()
      }, 150)
    },
    checkForObstruction () {
      if (!this.keyboard) return
      const el = this.$el
      if (!el || typeof el.getBoundingClientRect !== 'function') return
      const kbRect = el.getBoundingClientRect()
      if (!kbRect.height) return

      let occluded = false
      const nodes = document.querySelectorAll(this.obstructionSelectors())
      for (const node of nodes) {
        if (el.contains(node)) continue
        if (!this.isObstructionCandidateVisible(node)) continue
        const rect = node.getBoundingClientRect()
        // Message sits in (or under) the region covered by the keyboard.
        if (rect.bottom > kbRect.top + 4 && rect.top < kbRect.bottom - 4) {
          occluded = true
          break
        }
      }

      if (occluded) this.scheduleObstructionHide()
      else this.cancelObstructionHide()
    },
    scheduleObstructionHide () {
      if (this.__kbObstructionHideTimer) return
      this.__kbObstructionHideTimer = setTimeout(() => {
        this.__kbObstructionHideTimer = null
        this.hideForObstruction()
      }, 3000)
    },
    cancelObstructionHide () {
      if (this.__kbObstructionHideTimer) {
        clearTimeout(this.__kbObstructionHideTimer)
        this.__kbObstructionHideTimer = null
      }
    },
    hideForObstruction () {
      if (!this.keyboard) return
      // Blur so the next tap on an input re-emits focus and reopens the keyboard.
      const activeEl = document.activeElement
      if (activeEl && typeof activeEl.blur === 'function') activeEl.blur()
      this.$emit('backPressed')
    },

    enterKey (num) {
      this.$emit('addKey', num)
      this.updateValueOnKeyEnter(num)
    },
    makeKeyAction (action) {
      this.$emit('makeKeyAction', action)
      this.updateValueOnAction(action)
    },
    updateValueOnKeyEnter (num) {
      let val = isNaN(Number(this.val)) ? '' : String(this.val)
      const hasPeriod = val.indexOf('.') >= 0

      if (num === '.' && hasPeriod) return
      if (num === '.' && val === '') val = '0'
      if (/[0]+/.test(val) && !hasPeriod && Number(num) === 0) return

      val += num

      // Set the new val
      this.val = val
    },
    updateValueOnAction (action) {
      if (action === 'backspace') {
        // Backspace
        if (this.val && typeof this.val === 'string') this.val = this.val.slice(0, -1)
      } else if (action === 'delete') {
        // Delete
        this.val = ''
      }
    }
  },
  watch: {
    val () {
      this.$emit('update:modelValue', this.val)
    },
    modelValue () {
      this.val = this.modelValue
    },
    customKeyboardState (state) {
      this.keyboard = state === 'show'
      if (state === 'show') this.addBackButtonSentinel()
      else this.removeBackButtonSentinel()
    },
    keyboard (visible) {
      if (visible) this.startObstructionWatch()
      else this.stopObstructionWatch()
    }
  }
}
</script>

<style scoped>
.pt-custom-keyboard {
  position: fixed !important;
  display: flex;
  justify-content: center;
  width: 100%;
  left: 0 !important;
  bottom: 0 !important;
  z-index: 9000;
}
.pt-custom-keyboard--embedded {
  position: relative !important;
  left: auto !important;
  bottom: auto !important;
}
.pt-custom-keyboard--embedded .pt-keyboard-container,
.pt-custom-keyboard--embedded .pt-custom-keyboard-row {
  border-radius: 0 !important;
  box-shadow: none !important;
}
.pt-custom-keyboard--embedded .pt-keyboard-container {
  background: transparent !important;
  margin-bottom: 20px;
}
.pt-keyboard-container {
  height: calc(250px + env(safe-area-inset-bottom, 0px));
  background: #fff;
}
.pt-custom-keyboard--embedded .pt-keyboard-container {
  height: 250px;
}
.br-top-15 {
  border-top-left-radius: 15px;
  border-top-right-radius: 15px;
}
.pt-custom-keyboard-row {
  width: 100%;
  color: #515151;
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

.pt-key-num {
  height: 45px;
  font-size: 16px;
  font-weight: bolder;
}
.pt-key-del {
  height: 45px;
  font-weight: bolder;
  background: #fff;
}
.pt-check-key {
  color: #fff;
  background-color: #3b7bf6;
}
.pt-remove-key {
  background: #D7DBDE;
}
.pt-col-key {
  padding: 2px;
}
.pt-bg-dark {
  color: #fff !important;
  background: #273746 !important;
}
</style>

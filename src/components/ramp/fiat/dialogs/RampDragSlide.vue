<template>
  <div v-if="!swiped" class="ramp-drag-slide-container absolute-bottom">
    <div class="drag-slide-inner">
      <q-slide-item :left-color="themeColor" @left="slide" style="background: transparent; border-radius: 40px;">
        <template v-if="!locked" v-slot:left>
          <div style="font-size: 15px" class="text-body1">
            <q-icon class="material-icons q-mr-md" size="lg">task_alt</q-icon>
            {{ $t('SecurityCheck') }}
          </div>
        </template>
        <q-item class="bg-grad text-white q-py-sm">
          <q-item-section avatar>
            <q-icon v-if="locked" name="lock" size="sm" :class="`bg-${themeColor}`" class="q-pa-sm" style="border-radius: 50%" />
            <q-icon v-else name="mdi-chevron-double-right" size="lg" :class="`bg-${themeColor}`" style="border-radius: 50%" />
          </q-item-section>
          <q-item-section class="text-right">
            <h6 class="q-my-sm text-white text-uppercase" style="font-size: medium;">{{ sliderText }}</h6>
          </q-item-section>
        </q-item>
      </q-slide-item>
    </div>
  </div>
  <pinDialog v-model:pin-dialog-action="pinDialogAction" v-on:nextAction="pinDialogNextAction" />
</template>
<script>
import { NativeBiometric } from 'capacitor-native-biometric'
import pinDialog from 'src/components/pin/index.vue'

export default {
  name: 'drag-slide',
  components: {
    pinDialog
  },
  data () {
    return {
      swiped: false,
      sliderText: this.$t('SwipeToSend'),
      theme: this.$store.getters['global/theme'],
      pinDialogAction: ''
    }
  },
  computed: {
    themeColor () {
      const themeMap = {
        'glassmorphic-blue': 'blue-6',
        'glassmorphic-green': 'green-6',
        'glassmorphic-gold': 'orange-6',
        'glassmorphic-red': 'pink-6'
      }
      return themeMap[this.theme] || 'blue-6'
    }
  },
  emits: ['ok', 'cancel'],
  props: {
    locked: {
      type: Boolean,
      default: false
    },
    text: {
      type: String,
      default: ''
    }
  },
  methods: {
    slide ({ reset }) {
      setTimeout(() => {
        try {
          reset()
        } catch {}
      }, 2000)
      this.swiped = true
      this.executeSecurityChecking(reset)
    },
    executeSecurityChecking (reset = () => {}) {
      const vm = this
      setTimeout(() => {
        const preferredSecurity = vm.$store?.getters?.['global/preferredSecurity']
        if (preferredSecurity === 'pin') {
          // Reset first to ensure watcher is triggered
          vm.pinDialogAction = ''
          vm.$nextTick(() => {
            vm.pinDialogAction = 'VERIFY'
          })
        } else {
          vm.verifyBiometric(reset)
        }
      }, 300)
    },
    verifyBiometric (reset = () => {}) {
      const vm = this
      NativeBiometric.verifyIdentity({
        reason: vm.$t('NativeBiometricReason2'),
        title: vm.$t('SecurityAuthentication'),
        subtitle: vm.$t('NativeBiometricSubtitle'),
        description: ''
      }).then(
        () => {
          // Authentication successful
          vm.$emit('ok')
        },
        (error) => {
          // Failed to authenticate
          if (error.message.includes('Cancel') || error.message.includes('Authentication cancelled') || error.message.includes('Fingerprint operation cancelled')) {
            reset?.()
            vm.swiped = false
            vm.$emit('cancel')
          } else if (error.message.includes('Too many attempts. Try again later.')) {
            // Retry after delay
            setTimeout(() => {
              vm.verifyBiometric(reset)
            }, 2000)
          } else {
            vm.verifyBiometric(reset)
          }
        }
      )
    },
    pinDialogNextAction (action) {
      if (action === 'proceed') {
        this.$emit('ok')
      } else {
        this.swiped = false
        this.$emit('cancel')
      }
    }
  },
  async mounted () {
    const vm = this
    if (vm.text) {
      vm.sliderText = vm.text
    }
  }
}
</script>
<style lang="scss" scoped>
/* iOS-specific fixes for drag slide positioning */
.ramp-drag-slide-container {
  &.absolute-bottom {
    position: fixed !important;
    bottom: 0;
    left: 0;
    right: 0;
    width: 100%;
    z-index: 9999 !important;
    padding-bottom: calc(20px + env(safe-area-inset-bottom, 0px));
    padding-top: 20px;
    background: transparent !important;
    pointer-events: auto;
    
    /* Ensure the element stays attached to viewport on iOS */
    -webkit-backface-visibility: hidden;
    backface-visibility: hidden;
    -webkit-transform: translateZ(0);
    transform: translateZ(0);
    
    /* Prevent iOS from hiding fixed elements during scroll */
    will-change: transform;

    /*
      IMPORTANT:
      Do NOT force all child backgrounds to transparent.
      QSlideItem uses the `left-color` to paint the revealed area during swipe.
      Overriding it causes a "transparent strip" while sliding.
    */
    :deep(.q-slide-item__content) {
      background: transparent;
    }

    /* Keep only the actual button gradient - uses theme bg-grad */
    :deep(.q-item.bg-grad) {
      /* Gradient is provided by theme system */
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      transition: all 0.3s ease;
      
      &:active {
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      }
    }

    /* Ensure the slide item clips revealed background nicely */
    :deep(.q-slide-item) {
      border-radius: 40px;
      overflow: hidden;
    }
  }
}

.drag-slide-inner {
  margin-bottom: 16px;
  margin-left: 10%;
  margin-right: 10%;
  background: transparent;
  position: relative;
  z-index: 10000;
  
  /* iOS specific - add more bottom margin */
  @supports (-webkit-touch-callout: none) {
    margin-bottom: 20px;
  }
  
  /* Ensure all child elements have proper z-index */
  :deep(.q-slide-item),
  :deep(.q-item) {
    position: relative;
    z-index: 10001;
  }
}
</style>

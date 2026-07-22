<template>
  <!-- Root must be an actual element so directives on <DragSlide> can attach -->
  <div :class="{ 'absolute-bottom': !disableAbsoluteBottom, 'br-15': true, 'drag-slide-container': true }">
    <q-list v-if="!swiped">
      <div style="margin-bottom: 20px; margin-left: 5%; margin-right: 5%;">
        <q-slide-item
          left-color="blue"
          @left="slide"
          :disable="disable"
          style="background-color: transparent; border-radius: clamp(30px, 10vw, 40px); min-width: 200px;"
        >
          <template v-if="!disable" v-slot:left>
            <div style="font-size: 15px" class="text-body1">
              <q-icon class="material-icons q-mr-md" size="lg">
                task_alt
              </q-icon>
              {{ $t('SecurityCheck') }}
            </div>
          </template>

          <q-item :class="[disable ? 'drag-slide-disabled' : 'bg-grad', 'text-white q-py-md']">
            <q-item-section avatar>
              <Transition name="icon-swap" mode="out-in">
                <q-icon v-if="disable" key="lock" name="lock" size="sm" class="drag-slide-disabled-icon q-pa-sm" style="border-radius: 50%" />
                <q-icon v-else key="arrow" name="mdi-chevron-double-right" size="xl" class="bg-blue icon-arrow-hint" style="border-radius: 50%" />
              </Transition>
            </q-item-section>
            <q-item-section class="text-right">
              <h5 :class="disable ? 'text-grey-4' : 'text-grey-4'" class="q-my-sm text-uppercase" style="font-size: clamp(14px, 3.5vw, 18px);">{{ sliderText }}</h5>
            </q-item-section>
          </q-item>
        </q-slide-item>
      </div>
    </q-list>
  </div>
</template>
<script>

export default {
  name: 'drag-slide',
  data () {
    return {
      swiped: false,
      sliderText: this.$t('SwipeToSend')
    }
  },
  props: {
    disableAbsoluteBottom: Boolean,
    disable: {
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
      if (this.disable) {
        reset()
        return
      }
      setTimeout(() => {
        try {
          reset()
        } catch {}
      }, 2000)
      this.swiped = true
      this.$emit('swiped', () => this.swiped = false)
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
/* Fix for iOS positioning issues */
.drag-slide-container {
  &.absolute-bottom {
    position: fixed !important;
    bottom: 0;
    left: 0;
    right: 0;
    width: 100%;
    z-index: 2000;
    
    /* Ensure proper positioning on iOS */
    body.platform-ios & {
      position: fixed !important;
      bottom: 0;
      padding-bottom: env(safe-area-inset-bottom, 0);
    }
    
    /* Add a subtle background to ensure visibility */
    &::before {
      content: '';
      position: absolute;
      top: -20px;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(to bottom, transparent, rgba(0,0,0,0.03));
      pointer-events: none;
      z-index: -1;
    }
  }
}

.drag-slide-disabled {
  background: rgba(128, 128, 128, 0.25) !important;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 2px 12px 0 rgba(128, 128, 128, 0.08);
}

.drag-slide-disabled-icon {
  background: rgba(128, 128, 128, 0.45) !important;
}

/* Dark mode disabled */
body.body--dark .drag-slide-disabled {
  background: rgba(128, 128, 128, 0.2) !important;
  border-color: rgba(255, 255, 255, 0.08);
}

body.body--dark .drag-slide-disabled-icon {
  background: rgba(128, 128, 128, 0.35) !important;
}

/* Lock → Arrow transition */
.icon-swap-leave-active {
  transition: all 180ms cubic-bezier(0.25, 1, 0.5, 1);
}
.icon-swap-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.9);
}
.icon-swap-enter-active {
  transition: all 220ms cubic-bezier(0.22, 1, 0.36, 1);
}
.icon-swap-enter-from {
  opacity: 0;
  transform: translateY(8px) scale(0.9);
}

/* Arrow sway hint */
@keyframes arrow-hint {
  0%, 100% {
    transform: translateX(0);
  }
  50% {
    transform: translateX(6px);
  }
}
.icon-arrow-hint {
  animation: arrow-hint 1.4s ease-in-out infinite;
  animation-delay: 300ms;
}

/* Shimmer sweep — arrow-shaped highlight */
.bg-grad {
  position: relative;
  overflow: hidden;
  border-radius: clamp(30px, 10vw, 40px);
}
.bg-grad::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 55%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.12), rgba(255,255,255,0.15), transparent);
  clip-path: polygon(0% 0%, 65% 0%, 100% 50%, 65% 100%, 0% 100%, 25% 50%);
  transform: translateX(-100%);
  animation: shimmer-sweep 2.8s ease-in-out infinite;
  pointer-events: none;
}
@keyframes shimmer-sweep {
  0% { transform: translateX(-100%); }
  45% { transform: translateX(160%); }
  100% { transform: translateX(160%); }
}

@media (prefers-reduced-motion: reduce) {
  .icon-swap-leave-active,
  .icon-swap-enter-active {
    transition: none;
  }
  .icon-swap-leave-to,
  .icon-swap-enter-from {
    opacity: 1;
    transform: none;
  }
  .icon-arrow-hint {
    animation: none;
  }
  .bg-grad::after {
    animation: none;
  }
}

/* Dark mode background */
body.body--dark .drag-slide-container.absolute-bottom::before {
  background: linear-gradient(to bottom, transparent, rgba(0,0,0,0.2));
}
</style>

<template>
  <q-dialog
    ref="dialog"
    v-model="showDialog"
    persistent
    maximized
    transition-show="fade"
    transition-hide="fade"
  >
    <div class="wallet-switch-loading" :class="[getDarkModeClass(darkMode), themeClass]">
      <!-- Animated Background Gradient -->
      <div class="animated-background" :class="themeClass"></div>
      
      <!-- Logo Section (copied from LockScreen) -->
      <div class="logo-section">
        <div class="logo-glass-circle" :class="[getDarkModeClass(darkMode), themeClass]">
          <div class="logo-glow" :class="themeClass"></div>
          <img src="~/assets/paytaca_logo.png" height="50" alt="" class="logo-image">
        </div>
      </div>
    </div>
  </q-dialog>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

export default {
  name: 'WalletSwitchLoading',
  emits: ['ok', 'hide'],
  data() {
    return {
      showDialog: true
    }
  },
  computed: {
    darkMode() {
      return this.$store?.state?.darkmode?.darkmode
    },
    theme() {
      return this.$store.getters['global/theme']
    },
    themeClass() {
      return `theme-${this.theme}`
    }
  },
  methods: {
    getDarkModeClass,
    show() {
      this.showDialog = true
      this.$refs.dialog?.show()
    },
    hide() {
      this.showDialog = false
      this.$refs.dialog?.hide()
    }
  }
}
</script>

<style lang="scss" scoped>
@keyframes gradientShift {
  0%, 100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 0.8;
  }
  50% {
    transform: scale(1.1);
    opacity: 1;
  }
}

.wallet-switch-loading {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  
  &.light {
    background: linear-gradient(-45deg, #f5f7fa, #e8eef5, #f0f4f8, #e3e9f0);
    background-size: 400% 400%;
    animation: gradientShift 15s ease infinite;
  }
  
  &.dark {
    background: linear-gradient(-45deg, #1a1d23, #252930, #1e2229, #2a2f38);
    background-size: 400% 400%;
    animation: gradientShift 15s ease infinite;
  }
  
  // Theme-specific gradient overlays
  &.theme-glassmorphic-blue {
    &.light::before {
      content: '';
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at 30% 50%, rgba(66, 165, 245, 0.15), transparent 50%),
                  radial-gradient(circle at 70% 50%, rgba(21, 101, 192, 0.1), transparent 50%);
      pointer-events: none;
    }
    &.dark::before {
      content: '';
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at 30% 50%, rgba(66, 165, 245, 0.08), transparent 50%),
                  radial-gradient(circle at 70% 50%, rgba(21, 101, 192, 0.05), transparent 50%);
      pointer-events: none;
    }
  }
  
  &.theme-glassmorphic-gold {
    &.light::before {
      content: '';
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at 30% 50%, rgba(255, 167, 38, 0.15), transparent 50%),
                  radial-gradient(circle at 70% 50%, rgba(230, 81, 0, 0.1), transparent 50%);
      pointer-events: none;
    }
    &.dark::before {
      content: '';
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at 30% 50%, rgba(255, 167, 38, 0.08), transparent 50%),
                  radial-gradient(circle at 70% 50%, rgba(230, 81, 0, 0.05), transparent 50%);
      pointer-events: none;
    }
  }
  
  &.theme-glassmorphic-green {
    &.light::before {
      content: '';
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at 30% 50%, rgba(76, 175, 80, 0.15), transparent 50%),
                  radial-gradient(circle at 70% 50%, rgba(46, 125, 50, 0.1), transparent 50%);
      pointer-events: none;
    }
    &.dark::before {
      content: '';
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at 30% 50%, rgba(76, 175, 80, 0.08), transparent 50%),
                  radial-gradient(circle at 70% 50%, rgba(46, 125, 50, 0.05), transparent 50%);
      pointer-events: none;
    }
  }
  
  &.theme-glassmorphic-red {
    &.light::before {
      content: '';
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at 30% 50%, rgba(245, 66, 112, 0.15), transparent 50%),
                  radial-gradient(circle at 70% 50%, rgba(192, 21, 67, 0.1), transparent 50%);
      pointer-events: none;
    }
    &.dark::before {
      content: '';
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at 30% 50%, rgba(245, 66, 112, 0.08), transparent 50%),
                  radial-gradient(circle at 70% 50%, rgba(192, 21, 67, 0.05), transparent 50%);
      pointer-events: none;
    }
  }
}

.animated-background {
  position: absolute;
  inset: 0;
  opacity: 0.3;
  pointer-events: none;
}

.logo-section {
  position: relative;
  z-index: 1;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.logo-glass-circle {
  position: relative;
  width: 110px;
  height: 110px;
  margin: 0 auto;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  padding: 25px;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  animation: pulse 3s ease-in-out infinite;
  
  &.dark {
    background: rgba(255, 255, 255, 0.05);
    border: 2px solid rgba(255, 255, 255, 0.15);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3),
                0 0 0 1px rgba(255, 255, 255, 0.05) inset;
  }
  
  &.light {
    background: rgba(255, 255, 255, 0.5);
    border: 2px solid rgba(255, 255, 255, 0.6);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.12),
                0 0 0 1px rgba(255, 255, 255, 0.3) inset;
  }
  
  // Theme-specific glow effects
  &.theme-glassmorphic-blue {
    box-shadow: 0 12px 40px rgba(66, 165, 245, 0.25),
                0 0 0 1px rgba(66, 165, 245, 0.2) inset;
  }
  
  &.theme-glassmorphic-gold {
    box-shadow: 0 12px 40px rgba(255, 167, 38, 0.25),
                0 0 0 1px rgba(255, 167, 38, 0.2) inset;
  }
  
  &.theme-glassmorphic-green {
    box-shadow: 0 12px 40px rgba(76, 175, 80, 0.25),
                0 0 0 1px rgba(76, 175, 80, 0.2) inset;
  }
  
  &.theme-glassmorphic-red {
    box-shadow: 0 12px 40px rgba(245, 66, 112, 0.25),
                0 0 0 1px rgba(245, 66, 112, 0.2) inset;
  }
}

.logo-glow {
  position: absolute;
  inset: -10px;
  border-radius: 50%;
  opacity: 0.3;
  filter: blur(20px);
  pointer-events: none;
  
  &.theme-glassmorphic-blue {
    background: radial-gradient(circle, rgba(66, 165, 245, 0.4), transparent 70%);
  }
  
  &.theme-glassmorphic-gold {
    background: radial-gradient(circle, rgba(255, 167, 38, 0.4), transparent 70%);
  }
  
  &.theme-glassmorphic-green {
    background: radial-gradient(circle, rgba(76, 175, 80, 0.4), transparent 70%);
  }
  
  &.theme-glassmorphic-red {
    background: radial-gradient(circle, rgba(245, 66, 112, 0.4), transparent 70%);
  }
}

.logo-image {
  position: relative;
  z-index: 1;
  width: 100%;
  height: auto;
  object-fit: contain;
  filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.15));
}
</style>


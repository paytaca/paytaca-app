<template>
  <div class="keyboard-tooltip-bubble" :class="getDarkModeClass(darkMode)">
    {{ $t('PleaseUseCustomKeyboard') }}
  </div>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

export default {
  name: 'KeyboardTooltip',
  props: {
    darkMode: { type: Boolean, default: false }
  },
  methods: {
    getDarkModeClass
  }
}
</script>

<style lang="scss" scoped>
.keyboard-tooltip-bubble {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  bottom: calc(100% + 10px);
  z-index: 10;
  white-space: nowrap;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.4;
  font-weight: 700;
  pointer-events: none;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  animation: shake 0.4s ease-in-out;

  &::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 7px solid transparent;
  }

  &.dark {
    background: #d32f2f;
    color: #fff;

    &::after {
      border-top-color: #d32f2f;
    }
  }

  &.light {
    background: #e53935;
    color: #fff;

    &::after {
      border-top-color: #e53935;
    }
  }
}

@keyframes shake {
  0%, 100% { transform: translateX(-50%); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(calc(-50% - 4px)); }
  20%, 40%, 60%, 80% { transform: translateX(calc(-50% + 4px)); }
}
</style>

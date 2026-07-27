<template>
  <teleport to="body">
    <div v-if="panelVisible" class="keyboard-slide-panel">
      <CustomKeyboard
        v-if="keyboardState === 'show'"
        embedded
        :custom-keyboard-state="keyboardState"
        :hide-check-key="hideCheckKey"
        @addKey="$emit('addKey', $event)"
        @makeKeyAction="$emit('makeKeyAction', $event)"
      />
      <slot name="slide" />
    </div>
  </teleport>
</template>

<script>
import CustomKeyboard from 'src/components/CustomKeyboard.vue'

export default {
  name: 'KeyboardSlidePanel',
  components: { CustomKeyboard },
  props: {
    panelVisible: { type: Boolean, default: false },
    keyboardState: { type: String, default: 'dismiss' },
    hideCheckKey: { type: Boolean, default: false },
  },
  emits: ['addKey', 'makeKeyAction'],
}
</script>

<style>
.keyboard-slide-panel {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 9000;
  display: flex;
  flex-direction: column;
  background: #fff;
  padding-bottom: env(safe-area-inset-bottom, 0px);
  border-top-left-radius: 15px;
  border-top-right-radius: 15px;
  box-shadow: 0 1px 5px rgba(0,0,0,.2), 0 2px 2px rgba(0,0,0,.14), 0 3px 1px -2px rgba(0,0,0,.12);
}
body.body--dark .keyboard-slide-panel {
  background: #1d2631;
  box-shadow: 0 1px 5px rgba(0,0,0,.4), 0 2px 2px rgba(0,0,0,.28), 0 3px 1px -2px rgba(0,0,0,.24);
}
</style>

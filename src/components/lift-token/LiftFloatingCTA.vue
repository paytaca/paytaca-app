<template>
  <q-page-sticky position="bottom-right" :offset="[18, 18]">
    <q-btn
      fab
      :icon="icon"
      :color="color"
      :class="['floating-cta-button', { 'pulse-animation': pulse }]"
      @click="$emit('click')"
    >
      <q-badge v-if="badge" color="red" floating>
        {{ badge }}
      </q-badge>
      <q-tooltip
        anchor="center left"
        self="center right"
        :offset="[10, 10]"
      >
        {{ tooltipText }}
      </q-tooltip>
    </q-btn>
  </q-page-sticky>
</template>

<script>
export default {
  name: 'LiftFloatingCTA',
  props: {
    icon: {
      type: String,
      default: 'shopping_cart'
    },
    color: {
      type: String,
      default: 'primary'
    },
    tooltipText: {
      type: String,
      default: 'Buy LIFT'
    },
    badge: {
      type: [String, Number],
      default: null
    },
    pulse: {
      type: Boolean,
      default: true
    }
  },
  emits: ['click']
}
</script>

<style lang="scss" scoped>
.floating-cta-button {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;
  
  &:hover {
    transform: scale(1.1);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
  }
  
  &.pulse-animation {
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.9;
    transform: scale(1.05);
  }
}
</style>


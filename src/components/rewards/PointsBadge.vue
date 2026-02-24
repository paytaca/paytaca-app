<template>
  <span
    class="points-badge"
    :class="[complete ? 'completed' : 'pending', darkModeClass]"
  >
    +{{ points }} UP
  </span>
</template>

<script>
export default {
  name: 'PointsBadge',

  props: {
    complete: { type: Boolean, default: false },
    darkModeClass: { type: String, default: 'dark' },
    points: { type: Number, default: 0 }
  }
}
</script>

<style lang="scss" scoped>
  .points-badge {
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
    
    &.completed {
      &.dark {
        background: rgba(76, 175, 80, 0.15);
        color: #4caf50;
      }

      &.light {
        background: rgba(76, 175, 80, 0.20);
        color: #2e7d32;
      }
    }
    
    &.pending {
      &.dark {
        background: rgba(158, 158, 158, 0.15);
        color: #9e9e9e;
      }
      &.light {
        background: rgba(158, 158, 158, 0.25);
        color: #616161;
      }
    }
  }
</style>
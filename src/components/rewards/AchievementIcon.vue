<template>
  <span
    class="achievement-icon"
    :class="[complete ? 'completed' : 'pending', darkModeClass]"
  >
    <q-icon
      :name="complete ? 'check_circle' : 'radio_button_unchecked'"
      size="24px"
    />
  </span>
</template>

<script>
export default {
  name: 'AchievementIcon',

  props: {
    complete: { type: Boolean, default: false },
    darkModeClass: { type: String, default: 'dark' }
  }
}
</script>

<style lang="scss" scoped>
  .achievement-icon {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    
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
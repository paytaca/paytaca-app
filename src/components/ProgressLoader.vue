<template>
  <div class="lds-ellipsis transparent" :class="isTight ? 'tight' : ''">
    <div :class="color ? `bg-${color}` : 'theme-primary'" :style="themePrimaryStyle"></div>
    <div :class="color ? `bg-${color}` : 'theme-primary'" :style="themePrimaryStyle"></div>
    <div :class="color ? `bg-${color}` : 'theme-primary'" :style="themePrimaryStyle"></div>
    <div :class="color ? `bg-${color}` : 'theme-primary'" :style="themePrimaryStyle"></div>
  </div>
</template>

<script>
import { mapGetters } from 'vuex'

export default {
  name: 'ProgressLoader',
  props: {
    color: {
      type: String,
      default: null
    },
    isTight: { type: Boolean, default: false }
  },
  computed: {
    ...mapGetters('global', ['theme']),
    themePrimaryStyle () {
      // If a specific color is provided, don't apply theme style
      if (this.color) {
        return {}
      }
      
      // Get theme from store (now reactive via mapGetters)
      const theme = this.theme || 'glassmorphic-blue'
      
      // Map of themes to their primary colors
      const themeColors = {
        'glassmorphic-blue': '#42a5f5',
        'glassmorphic-gold': '#ffa726',
        'glassmorphic-green': '#4caf50',
        'glassmorphic-red': '#f54270',
        'payhero': '#ffbf00'
      }
      
      const primaryColor = themeColors[theme] || themeColors['glassmorphic-blue']
      
      return {
        backgroundColor: primaryColor
      }
    }
  }
}
</script>

<style scoped>
.theme-primary {
  /* Fallback to CSS variable, but inline style from themePrimaryStyle will override */
  background-color: var(--q-primary);
}

.lds-ellipsis {
  display: inline-block;
  position: relative;
  width: 80px;
  height: 80px;
}
.lds-ellipsis div {
  position: absolute;
  top: 33px;
  width: 13px;
  height: 13px;
  border-radius: 50%;
  animation-timing-function: cubic-bezier(0, 1, 1, 0);
}
.lds-ellipsis div:nth-child(1) {
  left: 8px;
  animation: lds-ellipsis1 0.6s infinite;
}
.lds-ellipsis div:nth-child(2) {
  left: 8px;
  animation: lds-ellipsis2 0.6s infinite;
}
.lds-ellipsis div:nth-child(3) {
  left: 32px;
  animation: lds-ellipsis2 0.6s infinite;
}
.lds-ellipsis div:nth-child(4) {
  left: 56px;
  animation: lds-ellipsis3 0.6s infinite;
}
@keyframes lds-ellipsis1 {
  0% {
    transform: scale(0);
  }
  100% {
    transform: scale(1);
  }
}
@keyframes lds-ellipsis3 {
  0% {
    transform: scale(1);
  }
  100% {
    transform: scale(0);
  }
}
@keyframes lds-ellipsis2 {
  0% {
    transform: translate(0, 0);
  }
  100% {
    transform: translate(24px, 0);
  }
}
</style>

<style lang="scss" scoped>
.tight.lds-ellipsis {
  height: 15px !important;

  & div {
    top: 10px !important;
  }
}
</style>

<template>
    <div class="text-center">Confirmation Page + Slider</div>
  <DragSlide
    :style="{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 1500,
    }"
    @swiped="true"
    text="Swipe To Confirm"
  />
</template>
<script>
import DragSlide from '../../drag-slide.vue'
export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus']
    }
  },
  components: {
    DragSlide
  }
}
</script>

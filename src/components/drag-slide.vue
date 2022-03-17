<template>
  <div>
    <!-- val: {{ val }},
    styleVal: {{ styleVal }},
    dragging: {{ dragging }}, -->
    <div
      class="drag-slide-container q-pa-xs"
      :style="{
        borderRadius: square ? '': '999px',
      }"
      ref="container"
    >
      <template v-if="!swiped">
        <div
          role="button"
          ref="thumb"
          :style="{
            position: 'relative',
            left: `${styleVal}%`,
            transition: dragging ? '' : 'left 0.28s',
          }"
          @mousedown="mouseDownHandler"
          @mouseup="mouseUpHandler"
          v-touch-pan.horizontal.prevent="touchPanHandler"
        >
          <q-icon
            class="drag-slide-thumb"
            name="arrow_forward"
            size="4em"
          />
        </div>

        <div class="flex q-space items-center justify-end">
          <span
            class="text-h5 text-white"
            :style="{
              opacity: `${100-val}%`,
              marginRight: '5%',
            }"
          >Swipe to send</span>
        </div>
      </template>
      <div v-else
        class="flex q-space items-center justify-center q-py-md"
        style="height:4em;"
      >
        <span class="text-h5 text-white">
          Success
        </span>
      </div>
    </div>
  </div>
</template>
<script>
export default {
  name: 'drag-slide',
  props: {
    square: {
      type: Boolean,
      default: false,
    }
  },
  data () {
    return {
      val: 0,
      dragging: false,

      swiped: false,
    }
  },
  computed: {
    styleVal () {
      // style val will set indention percentage with consideration to thumb & container width

      const pctg = this.val
      const containerEl = this.$refs.container
      const thumb = this.$refs.thumb
      if (!containerEl || !thumb) return 0

      const thumbHalfWidth = thumb.offsetWidth / 2
      const maxStyleWidthPctg = ((containerEl.offsetWidth - (thumbHalfWidth*2)) / containerEl.offsetWidth) * 100
      return (Math.min(pctg, maxStyleWidthPctg)).toFixed()
    },
  },

  methods: {
    updateValFromMouseEvent (e) {
      const containerEl = this.$refs.container
      const thumb = this.$refs.thumb
      if (!containerEl || !thumb) return

      const thumbHalfWidth = thumb.offsetWidth / 2
      const absPctg = (e.clientX - containerEl.offsetLeft - thumbHalfWidth) / (containerEl.offsetWidth - thumbHalfWidth)
      const pctg = Math.max(Math.min(absPctg, 1), 0)

      this.val = Number((pctg * 100).toFixed())
      if (this.val >= 90) {
        this.$nextTick(() => {
          this.swiped = true
          this.mouseUpHandler()
          this.$emit('swiped')
        })
      }
    },
    touchPanHandler(e) {
      this.updateValFromMouseEvent({
        clientX: e.position.left
      })
      if (e.isFinal) {
        this.mouseUpHandler()
      }
    },

    mouseDownHandler (e) {
      if (e.button !== 0) return
      this.dragging = true
      this.updateValFromMouseEvent(e)
    },
    mouseUpHandler () {
      this.dragging = false
      this.val = 0
    },
    mouseMoveHandler(e) {
      if (!this.dragging) return
      this.updateValFromMouseEvent(e)
    },

    registerEventHandlers () {
      console.log('Adding event listeners')
      document.addEventListener('mouseup', this.mouseUpHandler)
      document.addEventListener('mousemove', this.mouseMoveHandler)
    },
    removeEventHandlers () {
      console.log('Removing event listeners')
      document.removeEventListener('mouseup', this.mouseUpHandler)
      document.removeEventListener('mousemove', this.mouseMoveHandler)
    },
  },

  unmounted () {
    this.removeEventHandlers()
  },

  mounted () {
    this.removeEventHandlers()
    this.registerEventHandlers()
  }
}
</script>
<style scoped>
.drag-slide-container {
  width: 100%;
  position: relative;
  display: flex;

  border: 1px solid black;

  background-image: linear-gradient(to right bottom, #3b7bf6, #a866db, #da53b2, #ef4f84);
}
.drag-slide-thumb {
  color: white;
  border: 1px solid currentColor;
  border-radius: 50%;
  background-color: #3b7bf6;
}
</style>

<template>
  <q-list v-if="!swiped" :class="{ 'absolute-bottom': !disableAbsoluteBottom, 'br-15': true, 'drag-slide-container': true }">
    <div style="margin-bottom: 20px; margin-left: 10%; margin-right: 10%;">
      <q-slide-item 
        left-color="blue" 
        @left="slide" 
        :disable="disable"
        style="background-color: transparent; border-radius: 40px;"
      >
        <template v-if="!disable" v-slot:left>
          <div style="font-size: 15px" class="text-body1">
          <q-icon class="material-icons q-mr-md" size="lg">
            task_alt
          </q-icon>
          {{ $t('SecurityCheck') }}
          </div>
        </template>

        <q-item class="bg-grad text-white q-py-md">
          <q-item-section avatar>
            <q-icon v-if="disable" name="lock" size="sm" class="bg-blue q-pa-sm" style="border-radius: 50%" />
            <q-icon v-else name="mdi-chevron-double-right" size="xl" class="bg-blue" style="border-radius: 50%" />
          </q-item-section>
          <q-item-section class="text-right">
            <h5 class="q-my-sm text-grey-4 text-uppercase" style="font-size: large;">{{ sliderText }}</h5>
          </q-item-section>
        </q-item>
      </q-slide-item>
    </div>
  </q-list>
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

/* Dark mode background */
body.body--dark .drag-slide-container.absolute-bottom::before {
  background: linear-gradient(to bottom, transparent, rgba(0,0,0,0.2));
}
</style>

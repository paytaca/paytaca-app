<template>
  <div v-if="!swiped" class="ramp-drag-slide-container absolute-bottom">
    <div style="margin-bottom: 25px; margin-left: 10%; margin-right: 10%; background: transparent;">
      <q-slide-item left-color="blue" @left="slide" style="background: transparent; border-radius: 40px;">
        <template v-if="!locked" v-slot:left>
          <div style="font-size: 15px" class="text-body1">
            <q-icon class="material-icons q-mr-md" size="lg">task_alt</q-icon>
            {{ $t('SecurityCheck') }}
          </div>
        </template>
        <q-item class="bg-grad text-white q-py-sm">
          <q-item-section avatar>
            <q-icon v-if="locked" name="lock" size="sm" class="bg-blue q-pa-sm" style="border-radius: 50%" />
            <q-icon v-else name="mdi-chevron-double-right" size="lg" class="bg-blue" style="border-radius: 50%" />
          </q-item-section>
          <q-item-section class="text-right">
            <h6 class="q-my-sm text-white text-uppercase" style="font-size: medium;">{{ sliderText }}</h6>
          </q-item-section>
        </q-item>
      </q-slide-item>
    </div>
  </div>
</template>
<script>
import SecurityCheckDialog from 'src/components/SecurityCheckDialog.vue'
import { Dialog } from 'quasar'

export default {
  name: 'drag-slide',
  data () {
    return {
      swiped: false,
      sliderText: this.$t('SwipeToSend')
    }
  },
  emits: ['ok', 'cancel'],
  props: {
    locked: {
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
      setTimeout(() => {
        try {
          reset()
        } catch {}
      }, 2000)
      this.swiped = true
      this.showSecurityDialog()
    },
    showSecurityDialog () {
      Dialog.create({
        component: SecurityCheckDialog
      })
        .onOk(() => {
          this.$emit('ok')
        })
        .onCancel(() => {
          this.$emit('cancel')
        })
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
/* iOS-specific fixes for drag slide positioning */
.ramp-drag-slide-container {
  &.absolute-bottom {
    position: fixed !important;
    bottom: 0;
    left: 0;
    right: 0;
    width: 100%;
    z-index: 1500;
    padding-bottom: env(safe-area-inset-bottom, 0);
    background: transparent !important;
    
    /* Ensure the element stays attached to viewport on iOS */
    -webkit-backface-visibility: hidden;
    backface-visibility: hidden;
    -webkit-transform: translateZ(0);
    transform: translateZ(0);
    
    /* Prevent iOS from hiding fixed elements during scroll */
    will-change: transform;
    
    /* Make sure all child elements are also transparent */
    ::v-deep * {
      background-color: transparent !important;
    }
    
    /* Keep only the actual button gradient */
    ::v-deep .q-item.bg-grad {
      background: linear-gradient(135deg, #42a5f5 0%, #1e88e5 100%) !important;
    }
  }
}
</style>

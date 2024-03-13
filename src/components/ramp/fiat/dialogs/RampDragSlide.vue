<template>
  <div v-if="!swiped" class="absolute-bottom br-15">
    <div style="margin-bottom: 25px; margin-left: 10%; margin-right: 10%;">
      <q-slide-item left-color="blue" @left="slide" style="background-color: transparent; border-radius: 40px;">
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

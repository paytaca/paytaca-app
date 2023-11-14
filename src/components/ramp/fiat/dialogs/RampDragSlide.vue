<template>
    <q-list v-if="!swiped" class="absolute-bottom br-15">
      <div>
        <q-slide-item v-if="locked" left-color="blue" @left="slide" style="border-radius: 10px;">
          <q-item class="bg-grad text-white q-py-md">
            <q-item-section avatar>
              <q-icon name="lock" size="md" class="bg-blue q-pa-sm" style="border-radius: 50%" />
            </q-item-section>
            <q-item-section class="text-right">
              <h5 class="q-my-sm text-grey-4 text-uppercase">{{ sliderText }}</h5>
            </q-item-section>
          </q-item>
        </q-slide-item>
        <q-slide-item v-else left-color="blue" @left="slide" style="border-radius: 10px;">
          <template v-slot:left>
            <div style="font-size: 15px" class="text-body1">
            <q-icon class="material-icons q-mr-md" size="lg">
              task_alt
            </q-icon>
            {{ $t('SecurityCheck') }}
            </div>
          </template>

          <q-item class="bg-grad text-white q-py-md">
            <q-item-section avatar>
              <q-icon name="mdi-chevron-double-right" size="xl" class="bg-blue" style="border-radius: 50%" />
            </q-item-section>
            <q-item-section class="text-right">
              <h5 class="q-my-sm text-grey-4 text-uppercase">{{ sliderText }}</h5>
            </q-item-section>
          </q-item>
        </q-slide-item>
      </div>
    </q-list>
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

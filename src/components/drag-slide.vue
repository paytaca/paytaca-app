<template>
  <q-list v-if="!swiped" class="absolute-bottom br-15">
    <div style="margin-bottom: 20px; margin-left: 10%; margin-right: 10%;">
      <q-slide-item left-color="blue" @left="slide" style="background-color: transparent; border-radius: 40px;">
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
            <h5 class="q-my-sm text-grey-4 text-uppercase" style="font-size: large;">{{ sliderText }}</h5>
          </q-item-section>
        </q-item>
      </q-slide-item>
    </div>
  </q-list>
</template>
<script>
import { addressContentsToLockingBytecode } from '@bitauth/libauth'
import { runInThisContext } from 'vm'

export default {
  name: 'drag-slide',
  data () {
    return {
      swiped: false,
      sliderText: this.$t('SwipeToSend')
    }
  },
  props: {
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
      this.$emit('swiped')
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

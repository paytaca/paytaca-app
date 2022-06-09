<template>
  <q-list v-if="!swiped" class="absolute-bottom">
    <q-slide-item left-color="blue" @left="slide">
      <template v-slot:left>
        <div style="font-size: 15px" class="text-body1">
        <q-icon class="material-icons q-mr-md" size="lg">
          task_alt
        </q-icon>
        Security Check
        </div>
      </template>

      <q-item class="bg-grad text-white q-py-md">
        <q-item-section avatar>
          <q-icon name="mdi-chevron-double-right" size="xl" class="bg-blue" style="border-radius: 50%" />
        </q-item-section>
        <q-item-section class="text-right">
          <h5 class="q-my-sm text-grey-4">SWIPE TO SEND</h5>
        </q-item-section>
      </q-item>
    </q-slide-item>
  </q-list>
</template>
<script>
export default {
  name: 'drag-slide',
  data () {
    return {
      swiped: false,
    }
  },
  methods: {
    slide ({ reset }) {
      setTimeout(() => {
        reset()
      }, 2000)
      this.swiped = true
      this.$emit('swiped')
    }
  }
}
</script>

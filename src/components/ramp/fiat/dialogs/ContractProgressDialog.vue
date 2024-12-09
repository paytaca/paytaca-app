<template>
  <q-dialog v-model="sendingBch" persistent no-shake backdrop-filter="blur(0.8px)">
    <q-card class="text-bow q-py-sm pt-card" :class="getDarkModeClass(darkMode)">
      <div class="q-mx-lg q-px-xs q-my-sm">
        <q-spinner class="q-mr-md"/>{{ message }}
      </div>
    </q-card>
  </q-dialog>
</template>
<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      sendingBch: true
    }
  },
  props: {
    message: String
  },
  methods: {
    getDarkModeClass
  }
}
</script>

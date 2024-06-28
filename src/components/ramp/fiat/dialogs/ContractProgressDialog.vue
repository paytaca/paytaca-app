<template>
  <q-dialog v-model="sendingBch" persistent seamless full-width position="bottom">
    <q-card class="text-bow q-py-sm pt-card" :class="getDarkModeClass(darkMode)">
      <div class="q-mx-lg q-px-md q-my-sm">
        <q-spinner class="q-mr-sm"/>{{ message }}
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

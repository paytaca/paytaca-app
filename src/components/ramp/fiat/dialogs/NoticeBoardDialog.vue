<template>
  <q-dialog v-model="showDialog" seamless position="bottom" @before-hide="onBeforeHide">
    <q-card :style="bottomMargin" style="width: 50px; margin-left: 10%; margin-right: 10%;" :class="[bgColor, darkMode ? 'text-white' : 'text-black']" class="q-mx-lg bottom-card">
      <q-bar>
        <q-icon name="mdi-information-outline"></q-icon>
        <div>{{ capitalize(type) }}</div>
        <q-space />

        <q-btn dense flat icon="close" v-close-popup>
          <q-tooltip>Close</q-tooltip>
        </q-btn>
      </q-bar>
      <q-card-section class="q-pb-sm">
        <div style="font-size: medium; overflow-x: auto;" v-html="message"></div>
        <div v-if="optional" class="q-mt-none row justify-center">
          <q-checkbox
            left-label
            color="green"
            v-model="dontShowAgain">
            Don't show this again
          </q-checkbox>
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>
<script>
import { ref } from 'vue'

export default {
  setup () {
    return {
      showDialog: ref(true)
    }
  },
  data () {
    return {
      dontShowAgain: false,
      darkMode: this.$store.getters['darkmode/getStatus'],
    }
  },
  emits: ['hide'],
  props: {
    type: String,
    action: String,
    message: String,
    optional: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    bottomMargin () {
      let margin = 'margin-bottom: 100px;'
      if (this.action === 'orders') {
        margin = 'margin-bottom: 50px;'
      }
      return margin
    },
    bgColor () {
      switch (this.type) {
        case 'info':
          return 'bg-info'
        case 'error':
          return 'bg-danger'
        case 'warning':
          return 'bg-warning'
        default:
          return ''
      }
    }
  },
  methods: {
    capitalize (str) {
      return str?.charAt(0).toUpperCase() + str?.slice(1).toLowerCase()
    },
    onBeforeHide () {
      if (this.dontShowAgain && this.type) {
        switch (this.action) {
          case 'ad-limit':
            this.$store.commit('ramp/updateShowAdLimitMessage', !this.dontShowAgain)
        }
      }
      this.$emit('hide')
    }
  }
}
</script>
<style scoped>
.bg-danger {
  background-color: #e74c3c;
}
</style>

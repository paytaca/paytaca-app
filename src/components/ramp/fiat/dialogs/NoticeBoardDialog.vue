<template>
  <q-dialog v-model="showDialog" seamless position="bottom" @before-hide="onBeforeHide">
    <q-card style="width: 50px; margin-bottom: 100px;" class="bg-primary text-white q-mx-md">
      <q-bar>
        <q-icon name="mdi-information-outline"></q-icon>
        <div>Notice</div>
        <q-space />

        <q-btn dense flat icon="close" v-close-popup>
          <q-tooltip>Close</q-tooltip>
        </q-btn>
      </q-bar>
      <q-card-section class="q-pb-sm">
        <div style="font-size: medium;" v-html="message"></div>
        <div class="q-mt-none row justify-center">
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
      dontShowAgain: false
    }
  },
  emits: ['hide'],
  props: {
    type: String,
    message: String
  },
  methods: {
    onBeforeHide () {
      if (this.dontShowAgain && this.type) {
        switch (this.type) {
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
.custom-dialog {
  position: absolute;
  bottom: 10px; /* Adjust this value as needed */
  left: 50%;
  transform: translateX(-50%);
  width: auto; /* Adjust width as needed */
}
</style>

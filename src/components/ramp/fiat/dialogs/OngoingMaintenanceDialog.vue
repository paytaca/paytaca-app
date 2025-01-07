<template>
  <q-dialog v-model="openDialog" maximized>
    <q-card class="pt-card" :class="getDarkModeClass(darkMode)">
      <div class="text-center q-px-lg q-mx-md" :style="`margin-top: 150px;`">
        <q-icon name="engineering" size="80px" color="primary"/>
        <div class="text-left">
          <div class="q-mt-md" :class="darkMode ? '' : 'text-grey-8'" style="font-size: x-large;">
            Ongoing maintenance
          </div>
          <div class="q-pt-sm" :class="darkMode ? 'text-grey-5' : 'text-grey-6'" style="font-size: medium;">
            <p>We are currently performing maintenance to enhance our services. You might experience temporary interruptions.</p>
            <p>Thank you for your patience!</p>
          </div>
        </div>
        <div class="button-container">
          <q-btn
            ripple
            label="Okay"
            class="col full-footer-button"
            :class="getDarkModeClass(darkMode)"
            @click="close"
            >
          </q-btn>
        </div>
      </div>
    </q-card>
  </q-dialog>
</template>
<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

export default {
  data () {
    return {
      openDialog: true,
      darkMode: this.$store.getters['darkmode/getStatus'],
      screenHeight: (this.$q.screen.height / 2) - 100,
      loading: false
    }
  },
  emits: ['retry'],
  methods: {
    getDarkModeClass,
    close () {
      this.openDialog = false
      this.$router.push('/apps')
    },
    retry () {
      this.loading = true
      this.$router.go()
    }
  }
}
</script>
<style lang="scss" scoped>
.center {
  margin: 0;
  position: absolute;
  top: 50%;
}
.button-container {
  position: fixed; bottom: 20px;
  left: 0;
  width: 100%; /* Ensures the row spans the full width of the screen */
  padding: 20px;
  box-sizing: border-box; /* Includes padding in the element's total width */
}
.full-footer-button {
  flex: 1; /* This makes the button take up the full width of the container */
  padding: 10px 20px;
  background-color: #d14444;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  width: 90%; /* Ensures the button spans the full width of the row */
  max-width: 100%; /* Ensures the button doesn't exceed the row's width */
}

</style>

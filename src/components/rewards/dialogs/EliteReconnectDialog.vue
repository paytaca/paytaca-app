<template>
  <q-dialog
    ref="dialog"
    persistent
    seamless
    class="no-click-outside"
  >
    <q-card
      class="q-pa-md pt-card text-bow br-15"
      :class="getDarkModeClass(darkMode)"
      style="min-width: 320px; max-width: 80dvw;"
    >
      <q-card-section class="q-pt-sm q-pb-md">
        <div class="column items-center text-center q-gutter-y-md">
          <div class="q-mb-sm icon-container">
            <q-icon name="link_off" size="50px" class="elite-reconnect-icon" />
          </div>

          <h5 class="q-ma-none text-h5 text-weight-bold">
            Reconnect Elite Program
          </h5>

          <p class="q-ma-none text-body1">
            This wallet's connection to the Elite Program is out of date.
            Reconnecting creates a new secure link so your balances can be
            checked again. Your balances and history are not affected.
          </p>
        </div>
      </q-card-section>

      <q-card-actions class="q-px-md q-pb-md column q-gutter-y-md">
        <q-btn
          rounded
          class="button bg-grad cta-button full-width"
          :class="getDarkModeClass(darkMode)"
          label="Reconnect"
          @click="onOKClick"
        />
        <q-btn
          flat
          no-caps
          class="full-width"
          label="Not now"
          @click="hide"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

export default {
  name: 'EliteReconnectDialog',

  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    }
  },

  methods: {
    getDarkModeClass,

    hide () {
      this.$refs.dialog.hide()
    },

    onOKClick () {
      this.$emit('ok')
      this.hide()
    }
  }
}
</script>

<style lang="scss" scoped>
@import 'src/css/rewards/elite-row-styles.scss';

.elite-reconnect-icon {
  color: #d4a643;

  .light & {
    color: #c89d36;
  }
}
</style>

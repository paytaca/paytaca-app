<template>
  <div class="col-2 flex justify-end" v-if="!isMobile">
    <q-btn
      flat
      round
      icon="notifications"
      class="text-bow"
      :class="getDarkModeClass(darkMode)"
      @click="openNotificationsDialog"
    >
      <q-badge color="red" floating v-if="notifsCount > 0">{{ notifsCount }}</q-badge>
    </q-btn>
  </div>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

import Notifications from 'src/components/notifications/index.vue'

export default {
  name: 'NotificationButton',

  emits: [
    'hide-multi-wallet-dialog'
  ],

  data () {
    return {
      notifsCount: 4
    }
  },

  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    isMobile () {
      return this.$q.platform.is.mobile || this.$q.platform.is.android || this.$q.platform.is.ios
    }
  },

  methods: {
    getDarkModeClass,
    openNotificationsDialog () {
      this.$emit('hide-multi-wallet-dialog')
      this.$q.dialog({
        component: Notifications
      })
    }
  }
}
</script>

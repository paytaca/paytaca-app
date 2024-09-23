<template>
  <q-dialog
    ref="notifs-dialog"
    full-width
  >
    <q-card class="q-pa-md wallet-card text-bow" :class="getDarkModeClass(darkMode)">
      <div class="row justify-between items-center q-mb-md">
        <span class="text-bold text-h6">Notifications</span>
        <q-space/>
        <q-btn
          flat
          round
          padding="xs"
          icon="close"
          align="right"
          class="close-button"
          v-close-popup
        />
      </div>

      <q-card-section class="q-pt-sm flex flex-center" v-if="isLoading">
        <ProgressLoader :color="isNotDefaultTheme(theme) ? theme : 'pink'"/>
      </q-card-section>

      <template v-else>
        <div v-if="notifsList.length > 0">
          notif data here yey
        </div>

        <div
          class="text-center text-subtitle1"
          style="color: gray"
          v-else
        >
          No notifications
        </div>
      </template>
    </q-card>
  </q-dialog>
</template>

<script>
import { getDarkModeClass, isNotDefaultTheme } from 'src/utils/theme-darkmode-utils'
import { getWalletNotifications } from 'src/utils/cashback-utils'

import ProgressLoader from 'src/components/ProgressLoader.vue'

export default {
  name: 'Notifications',

  components: {
    ProgressLoader
  },

  data () {
    return {
      notifsList: [],
      isLoading: false
    }
  },

  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    theme () {
      return this.$store.getters['global/theme']
    }
  },

  async mounted () {
    this.isLoading = true
    this.notifsList = await getWalletNotifications('replace_wallet_hash')
    this.isLoading = false
  },

  methods: {
    getDarkModeClass,
    isNotDefaultTheme
  }
}
</script>

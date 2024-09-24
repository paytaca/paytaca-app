<template>
  <q-dialog
    ref="notifs-dialog"
    full-width
    full-height
  >
    <q-card class="q-pa-md wallet-card text-bow" :class="getDarkModeClass(darkMode)">
      <div class="row justify-between items-center q-mb-lg">
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
        <div v-if="notifsList.length > 0" class="q-mt-sm q-gutter-y-md">
          <transition-group
            appear
            leave-active-class="animated zoomOut fast"
            v-for="(notif, index) in notifsList"
            :key="`notif-${index}`"
          >
            <q-slide-item
              left-color="red"
              right-color="red"
              class="pt-card-2 text-bow"
              :class="getDarkModeClass(darkMode)"
              :key="`notif-${index}`"
              @left="(event) => onSwipe(event, index)"
              @right="(event) => onSwipe(event, index)"
              v-if="!notif.is_hidden"
            >
              <template v-slot:left>
                <q-icon name="delete" /> Delete
              </template>
              <template v-slot:right>
                Delete <q-icon name="delete" />
              </template>

              <transition
                appear
                leave-active-class="animated zoomOut fast"
              >
                <div class="q-py-sm q-px-md">
                  <p>{{ notif.title }}</p>
                  <span>{{ notif.message }}</span>
                </div>
              </transition>
            </q-slide-item>
          </transition-group>
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
    isNotDefaultTheme,
    onSwipe (event, index) {
      event.reset()
      this.notifsList[index].is_hidden = true
      setTimeout(() => {
        this.notifsList.splice(index, 1)
      }, 250)
      // call to engagement-hub to hide idth notif
    }
  }
}
</script>

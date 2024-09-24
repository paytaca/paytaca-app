<template>
  <q-dialog
    ref="notifs-dialog"
    full-width
    full-height
  >
    <q-card class="q-pa-md pt-card text-bow" :class="getDarkModeClass(darkMode)">
      <div class="row justify-between items-center q-mb-sm">
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
        <div class="row justify-end q-mb-md">
          filter and refresh? and settings?
        </div>
        <div
          v-if="notifsList.length > 0"
          class="q-pb-sm q-gutter-y-sm"
          style="height: 70vh; overflow-y: scroll;"
        >
          <transition-group
            appear
            leave-active-class="animated zoomOut fast"
            v-for="(notif, index) in notifsList"
            :key="`notif-${index}`"
          >
            <q-slide-item
              left-color="red"
              right-color="red"
              class="pt-card-2 text-bow item-border"
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
                <div class="row q-py-sm q-px-md">
                  <span class="row col-12 q-mb-sm text-bold" style="font-size: 17px;">
                    {{ notif.title }}
                  </span><br/>
                  <span class="col-12">{{ notif.message }}</span>
                  <span
                    class="col-12 q-mt-xs text-caption"
                    align="right"
                    style="color: gray;"
                  >
                    {{ parseNotifType(notif.notif_type) }} | {{ formatDate(notif.date_posted) }}
                  </span>
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
import ago from 's-ago'

import { getDarkModeClass, isNotDefaultTheme } from 'src/utils/theme-darkmode-utils'
import { getWalletNotifications, parseNotifType } from 'src/utils/engagementhub-utils'

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
    parseNotifType,
    onSwipe (event, index) {
      event.reset()
      this.notifsList[index].is_hidden = true
      setTimeout(() => {
        this.notifsList.splice(index, 1)
      }, 250)
      // call to engagement-hub to hide idth notif
    },
    formatDate (date) {
      return ago(new Date(date))
    }
  }
}
</script>

<style lang="scss" scoped>
  .item-border.light {
    border: 1px solid black;
  }
</style>

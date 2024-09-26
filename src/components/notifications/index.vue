<template>
  <q-dialog
    ref="notifs-dialog"
    full-width
    full-height
  >
    <q-card class="q-pa-md pt-card text-bow" :class="getDarkModeClass(darkMode)">
      <div class="row justify-between items-center">
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

      <div>
        <div class="row justify-end items-center q-mb-sm q-gutter-x-md">
          <q-btn
            flat
            round
            icon="refresh"
            :disable="isLoading"
            @click="refreshNotifsList()"
          />
          <q-btn
            flat
            round
            icon="filter_alt"
          />
          <q-btn
            flat
            round
            icon="settings"
          />
        </div>

        <template v-if="isLoading">
          <q-card-section class="q-pt-sm flex flex-center">
            <ProgressLoader :color="isNotDefaultTheme(theme) ? theme : 'pink'"/>
          </q-card-section>
        </template>

        <template v-else>
          <div v-if="notifsList.length > 0">
            <div
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

            <div class="row justify-center items-end q-mt-sm">
              <q-pagination
                padding="xs"
                :modelValue="notifsPage"
                :max="20"
                :max-pages="5"
                :dark="darkMode"
                :class="getDarkModeClass(darkMode)"
                :hide-below-pages="2"
              />
            </div>
          </div>

          <div
            class="text-center text-subtitle1"
            style="color: gray"
            v-else
          >
            No notifications
          </div>
        </template>
      </div>
    </q-card>
  </q-dialog>
</template>

<script>
import ago from 's-ago'

import { getDarkModeClass, isNotDefaultTheme } from 'src/utils/theme-darkmode-utils'
import {
  getWalletNotifications, parseNotifType, hideItemUpdate
} from 'src/utils/engagementhub-utils'

import ProgressLoader from 'src/components/ProgressLoader.vue'

export default {
  name: 'Notifications',

  components: {
    ProgressLoader
  },

  data () {
    return {
      notifsList: [],
      isLoading: false,
      notifsPage: 0
    }
  },

  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    theme () {
      return this.$store.getters['global/theme']
    },
    currentWalletHash () {
      return this.$store.getters['global/getWallet']('bch')?.walletHash
    }
  },

  async mounted () {
    await this.refreshNotifsList()
  },

  methods: {
    getDarkModeClass,
    isNotDefaultTheme,
    parseNotifType,

    async refreshNotifsList () {
      const vm = this

      vm.isLoading = true
      vm.notifsList = await getWalletNotifications(vm.currentWalletHash)
      vm.isLoading = false
    },
    async onSwipe (event, index) {
      const vm = this

      event.reset()
      vm.notifsList[index].is_hidden = true
      setTimeout(async () => {
        const deletedItem = vm.notifsList.splice(index, 1)
        // call to engagement-hub to hide idth notif
        await hideItemUpdate(deletedItem[0])
      }, 250)
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

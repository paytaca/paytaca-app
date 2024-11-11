<template>
  <q-dialog
    ref="notifs-dialog"
    full-width
    full-height
    seamless
    class="no-click-outside"
  >
    <q-card class="q-px-md q-pt-md pt-card text-bow" :class="getDarkModeClass(darkMode)">
      <div class="row justify-between items-center">
        <span class="text-bold text-h6" style="color: #ed5f59;">
          {{ $t('Notifications') }}
        </span>
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
        <q-pull-to-refresh @refresh="refreshNotifsList">
          <div class="row justify-end items-center q-mb-sm q-gutter-x-md">
            <q-btn
              flat
              round
              icon="refresh"
              :disable="isLoading"
              @click="refreshNotifsList()"
            />
            <!-- <q-btn
              flat
              round
              :disable="isLoading"
              icon="delete"
            /> -->
            <q-btn
              flat
              round
              :disable="isLoading"
              icon="filter_alt"
              @click="openFilterDialog"
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
                    @click="clickRedirect(notif)"
                    v-if="!notif.is_hidden"
                  >
                    <template v-slot:left>
                      <q-icon name="delete" /> {{ $t('Delete') }}
                    </template>
                    <template v-slot:right>
                      {{ $t('Delete') }} <q-icon name="delete" />
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

              <div class="row flex-center q-mt-sm">
                <q-pagination
                  padding="xs"
                  :modelValue="notifsPage"
                  :max="maxPages"
                  :max-pages="6"
                  :dark="darkMode"
                  :class="getDarkModeClass(darkMode)"
                  :hide-below-pages="2"
                  @update:modelValue="(val) => {
                    notifsPage = val
                    refreshNotifsList(null)
                  }"
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
        </q-pull-to-refresh>
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
import NotificationsFilterDialog from 'src/components/notifications/NotificationsFilterDialog.vue'

export default {
  name: 'Notifications',

  components: {
    ProgressLoader
  },

  data () {
    return {
      notifsList: [],
      isLoading: false,
      notifsPage: 1,
      notifsTypes: ['GE', 'MP', 'CB', 'AH', 'RP', 'GI', 'TR'],
      maxPages: 0
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

    async refreshNotifsList (done) {
      const vm = this

      if (done) done()

      vm.isLoading = true
      const respData = await getWalletNotifications(
        vm.currentWalletHash, this.notifsTypes, this.notifsPage
      )
      vm.notifsList = respData.list
      vm.maxPages = respData.max
      vm.isLoading = false
    },
    async onSwipe (event, index) {
      const vm = this

      event.reset()
      vm.notifsList[index].is_hidden = true
      setTimeout(async () => {
        const deletedItem = vm.notifsList.splice(index, 1)
        // call to engagement-hub to hide idth notif
        await hideItemUpdate(deletedItem[0]).then(async () => {
          if (vm.notifsList.length === 0) {
            vm.notifsPage -= 1
            await this.refreshNotifsList(null)
          }
        })
      }, 250)
    },
    async openFilterDialog () {
      this.$q.dialog({
        component: NotificationsFilterDialog,
        componentProps: { notifTypes: this.notifsTypes }
      })
        .onOk(async (data) => {
          this.notifsTypes = data
          this.refreshNotifsList(null)
        })
    },
    async clickRedirect (notif) {
      const vm = this
      vm.$refs['notifs-dialog'].hide()

      switch (notif.notif_type) {
        case 'TR': {
          console.log('transaction notif yey')
          const url = notif.extra_url
          if (url !== '') {
            // automatically hide JPP payment request notifications after clicking
            if (url.includes('bitcoincash:?')) {
              await hideItemUpdate(notif)
            }

            const query = {
              assetId: vm.$store.getters['assets/getAssets'][0].id,
              tokenType: 1,
              network: 'BCH',
              address: url
            }
            vm.$router.push({
              name: 'transaction-send',
              query
            })
          }
          break
        } case 'MP': {
          console.log('marketplace notif yey')
          break
        } case 'AH': {
          console.log('anyhedge notif yey')
          break
        } case 'RP': {
          console.log('p2p exchange notif yey')
          break
        } case 'CB': {
          console.log('cashback notif yey')
          break
        } default:
          break
      }
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
  .q-card.light {
    background-color: $grey-2 !important;
  }
</style>

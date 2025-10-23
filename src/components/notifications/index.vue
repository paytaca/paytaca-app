<template>
  <q-dialog
    ref="notifs-dialog"
    full-height
    position="right"
    class="no-click-outside"
    maximized
  >
    <q-card
      class="notifs-card wallet-card"
      :class="getDarkModeClass(darkMode)"
      :style="{'padding-top': $q.platform.is.ios ? '20px' : '0px'}"
    >
      <!-- Fixed Header -->
      <div class="fixed-header" :class="getDarkModeClass(darkMode)">
        <div class="row justify-between items-center q-px-lg q-py-sm">
          <div class="notifs-title text-weight-bold text-grad">
            {{ $t('Notifications') }}
          </div>
          <q-btn
            round
            flat
            dense
            icon="keyboard_double_arrow_right"
            class="default-text-color"
            v-close-popup
          />
        </div>
      </div>

      <!-- Scrollable Content -->
      <div class="scrollable-notifs-content" :class="getDarkModeClass(darkMode)">
        <div class="q-px-md q-pt-md">
        <div class="row justify-end items-center q-mb-sm q-gutter-x-sm">
          <q-btn
            v-if="isCheckboxClicked"
            flat
            round
            :disable="isLoading"
            icon="cancel"
            @click="isCheckboxClicked = false"
          />
          <q-btn
            flat
            round
            :disable="isLoading || notifsList.length === 0"
            :icon="isCheckboxClicked ? 'delete' : 'check_box_outline_blank'"
            :color="isCheckboxClicked ? 'red' : ''"
            @click="massDeleteNotifs"
          />
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
            icon="mark_chat_read"
            :disable="isLoading || notifsList.length === 0"
            @click="markAllAsRead()"
          />
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
            <ProgressLoader />
          </q-card-section>
        </template>

        <template v-else>
          <div v-if="notifsList.length > 0">
            <div
              class="q-pb-sm q-gutter-y-sm col-12"
              style="overflow-y: scroll;"
              :style="{ 'height': $q.platform.is.ios ? '67vh' : '75vh'}"
            >
              <template v-if="isCheckboxClicked">
                <div
                  v-for="(notif, index) in notifsList"
                  :key="`notif-${index}`"
                  class="row"
                >
                  <div class="col-2 flex flex-center">
                    <q-checkbox
                      v-model="checkboxList[index]"
                    />
                  </div>

                  <q-slide-item
                    v-if="!notif.is_hidden"
                    left-color="red"
                    right-color="red"
                    class="col-10 pt-card-2 text-bow item-border"
                    :class="getDarkModeClass(darkMode)"
                    :key="`notif-${index}`"
                  >
                    <NotificationBody
                      :title="notif.title"
                      :message="notif.message"
                      :notif_type="parseNotifType(notif.notif_type)"
                      :date_posted="formatDate(notif.date_posted)"
                      :is_read="notif.is_read"
                    />
                  </q-slide-item>
                </div>
              </template>

              <template v-else>
                <transition-group
                  appear
                  leave-active-class="animated zoomOut fast"
                  v-for="(notif, index) in notifsList"
                  :key="`notif-${index}`"
                >
                  <q-slide-item
                    v-if="!notif.is_hidden"
                    left-color="red"
                    right-color="red"
                    class="col-12 pt-card-2 text-bow item-border"
                    :class="getDarkModeClass(darkMode)"
                    :key="`notif-${index}`"
                    @left="(event) => onSwipe(event, index)"
                    @right="(event) => onSwipe(event, index)"
                    @click="clickRedirect(notif)"
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
                      <NotificationBody
                        :title="notif.title"
                        :message="notif.message"
                        :notif_type="parseNotifType(notif.notif_type)"
                        :date_posted="formatDate(notif.date_posted)"
                        :is_read="notif.is_read"
                      />
                    </transition>
                  </q-slide-item>
                </transition-group>
              </template>
            </div>

            <div class="row flex-center q-mt-lg">
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
            class="q-mt-lg text-center text-subtitle1"
            style="color: gray"
            v-else
          >
            {{ $t('NoNotifications') }}
          </div>
        </template>
        </div>
      </div>
    </q-card>
  </q-dialog>
</template>

<script>
import ago from 's-ago'

import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import {
  getWalletNotifications,
  parseNotifType,
  hideItemUpdate,
  massHideNotifs,
  markWalletNotifsAsRead,
  markItemAsRead
} from 'src/utils/engagementhub-utils/engagementhub-utils'

import ProgressLoader from 'src/components/ProgressLoader.vue'
import NotificationsFilterDialog from 'src/components/notifications/NotificationsFilterDialog.vue'
import NotificationBody from 'src/components/notifications/NotificationBody.vue'
import NotificationMoreInfoDialog from 'src/components/notifications/NotificationMoreInfoDialog.vue'

export default {
  name: 'Notifications',

  components: {
    ProgressLoader,
    NotificationBody
  },

  props: {
    onOpenTransaction: { type: Function }
  },

  data () {
    return {
      notifsList: [],
      checkboxList: null,
      notifsTypes: ['MP', 'CB', 'AH', 'RP', 'TR', 'NF', 'EP'],

      isLoading: false,
      isCheckboxClicked: false,

      notifsPage: 1,
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
    },
    mainchainAssets () {
      return this.$store.getters['assets/getAssets'].filter(
        item => item && item.id !== 'bch'
      )
    }
  },

  async mounted () {
    await this.refreshNotifsList()
  },

  methods: {
    getDarkModeClass,
    parseNotifType,

    async refreshNotifsList (done) {
      const vm = this

      try {
        if (done) done()

        vm.isLoading = true
        const respData = await getWalletNotifications(
          vm.currentWalletHash, this.notifsTypes, this.notifsPage
        )
        vm.notifsList = respData.list
        vm.maxPages = respData.max
        this.resetCheckboxList()
        vm.isLoading = false
      } catch {
        // fallback when an error occurs after deleting last remaining notif
        vm.notifsList = []
        vm.maxPages = 0
        vm.isLoading = false
      }
    },
    async onSwipe (event, index) {
      const vm = this

      event.reset()
      vm.notifsList[index].is_hidden = true
      setTimeout(async () => {
        const deletedItem = vm.notifsList.splice(index, 1)
        // call to engagement-hub to hide idth notif
        await hideItemUpdate(deletedItem[0].id)
        
        if (vm.notifsList.length === 0) {
          vm.notifsPage = vm.notifsPage === vm.maxPages 
            ? vm.notifsPage - 1 
            : vm.notifsPage
          await this.refreshNotifsList(null)
        }
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

      if (!['CB', 'EP'].includes(notif.notif_type)) vm.$refs['notifs-dialog'].hide()
      if (!notif.is_read) await markItemAsRead(notif.id)

      switch (notif.notif_type) {
        case 'TR': {
          const data = notif.extra_data

          let url = null
          if (data.startsWith('bitcoincash:') || data.startsWith('bchtest:')) {
            url = data
          }

          if (url) { // jpp notif
            // automatically hide JPP payment request notifications after clicking
            if (url.includes('bitcoincash:?')) {
              await hideItemUpdate(notif.id)
            }

            const query = {
              assetId: vm.$store.getters['assets/getAssets'][0].id,
              network: 'BCH',
              paymentUrl: url
            }
            vm.$router.push({ name: 'transaction-send', query })
          } else { // payment received notif
            const transactionDetails = notif.extra_data.split(';')
            let tokenId = transactionDetails[1]
            if (parseInt(tokenId) === 1) { // for backwards compatibility with bch notifs
              tokenId = 'bch'
            }

            this.onOpenTransaction({
              txid: transactionDetails[0],
              tokenId,
              chain: 'BCH'
            })
          }
          break
        } case 'MP': {
          const orderId = notif.message.match(/#(\d+)/)[1]
          vm.$router.push({ name: 'app-marketplace-order', params: { orderId } })
          break
        } case 'AH': {
          vm.$router.push({ name: 'anyhedge' })
          break
        } case 'RP': {
          vm.$router.push({ name: 'exchange' })
          break
        } case 'CB': {
          console.log('cashback notif yey')
          break
        } case 'NF': {
          vm.$router.push({ name: 'app-collectibles' })
          break
        } case 'EP': {
          const urlArray = notif.extra_data.split(' ')
          vm.$q.dialog({
            component: NotificationMoreInfoDialog,
            componentProps: {
              title: notif.title,
              message: notif.message,
              url: urlArray
            }
          })
          break
        } default:
          break
      }
    },
    resetCheckboxList () {
      if (this.isCheckboxClicked) {
        this.checkboxList = new Array(this.notifsList.length).fill(false)
      }
    },
    async massDeleteNotifs () {
      const vm = this

      if (!vm.isCheckboxClicked) vm.isCheckboxClicked = true
      else if (vm.checkboxList.filter(a => a === true).length > 0) {
        const checkboxTrueList = []

        vm.checkboxList.forEach((check, i) => {
          if (check) checkboxTrueList.push(i)
        })

        const notifsIds = vm.notifsList
          .filter((a, i) => checkboxTrueList.includes(i))
          .map(b => b.id)

        await massHideNotifs(notifsIds)
        await vm.refreshNotifsList(null)
        vm.isCheckboxClicked = false
      }
    },
    async markAllAsRead () {
      await markWalletNotifsAsRead(this.currentWalletHash)
      await this.refreshNotifsList(null)
    },

    formatDate (date) {
      return ago(new Date(date))
    }
  },

  watch: {
    isCheckboxClicked (value) {
      this.resetCheckboxList()
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
  .notifs-card {
    height: 100vh;
    width: 90vw;
    max-width: 450px;
    display: flex;
    flex-direction: column;
    
    @media (max-width: 600px) {
      width: 90vw;
    }
  }

  .fixed-header {
    position: sticky;
    top: 0;
    z-index: 10;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(12px);
    
    &.dark {
      background: rgba(0, 0, 0, 0.3);
    }
    
    &.light {
      background: rgba(255, 255, 255, 0.3);
    }
  }

  .notifs-title {
    font-size: 20px;
    letter-spacing: 0.5px;
  }

  .scrollable-notifs-content {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    
    /* Custom scrollbar styling */
    &::-webkit-scrollbar {
      width: 6px;
    }
    
    &::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 10px;
    }
    
    &::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.2);
      border-radius: 10px;
      
      &:hover {
        background: rgba(255, 255, 255, 0.3);
      }
    }
  }
</style>

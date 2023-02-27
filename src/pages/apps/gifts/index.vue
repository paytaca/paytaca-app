<template>
  <div class="static-container">
    <div
      id="app-container"
      style="background-color: #ECF3F3; min-height: 100vh;"
      class="q-pt-xl"
      :class="{ 'pt-dark': darkMode }"
    >
      <HeaderNav
        title="Gifts"
        backnavpath="/apps"
        style="position: fixed; top: 0; background: #ECF3F3; width: 100%; z-index: 100 !important;"
        class="q-px-sm"
      />
      <div :style="{ 'margin-top': $q.platform.is.ios ? '60px' : '30px'}">
        <div class="row items-center justify-end q-mx-md q-mb-md q-px-xs q-gutter-sm">
          <q-btn 
            no-caps
            color="primary"
            label="Create Gift"
            :to="{ name: 'create-gift'}"
          />
          <q-btn 
            no-caps
            color="primary"
            label="Claim Gift"
            :to="{ name: 'claim-gift'}"
          />
        </div>
        <div class="q-pa-md" :class="{'text-black': !darkMode}" style="margin-top: -10px;">
          <div class="q-px-xs row items-start">
            <div class="q-table__title q-space">Gifts you created</div>
            <q-btn-dropdown color="primary" no-caps :label="capitalize(filterOpts.recordType.active)" dense class="q-pl-sm" :dark="darkMode" content-style="color: black;">
              <q-list dense>
                <q-item
                  v-for="recordType in filterOpts.recordType.options"
                  :index="recordType"
                  clickable v-close-popup
                  :active="recordType === filterOpts.recordType.active"
                  @click="() => fetchGifts({ recordType: recordType })"
                >
                  <q-item-section>
                    <q-item-label>{{ capitalize(recordType) }}</q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>
            </q-btn-dropdown>
          </div>
          <div class="row items-start q-mt-sm">
            <template v-if="fetchingGifts">
              <div
                v-for="i in 3"
                class="q-pa-xs col-xs-12 col-sm-6 col-md-4 col-lg-3 grid-style-transition text-black"
              >
                <q-card :class="['q-py-sm q-px-md', darkMode ? 'text-white pt-dark-card' : 'text-black']">
                  <q-skeleton height="1.25em" class="q-mb-sm"/>
                  <q-skeleton height="1.25em" class="q-mb-sm"/>
                  <q-separator spaced :dark="darkMode"/>
                  <q-skeleton type="rect"/>
                </q-card>
              </div>
            </template>
            <div v-else-if="!gifts?.length"
              class="row items-center justify-center q-space text-center text-grey q-my-md q-gutter-sm"
              style="font-size:2rem"
            >
              <div>No gifts</div>
              <q-icon name="mdi-gift" size="1.25em"/>
            </div>
            <template v-else>
              <div
                v-for="gift in gifts"
                :key="gift?.gift_code_hash"
                class="q-pa-xs col-xs-12 col-sm-6 col-md-4 col-lg-3 grid-style-transition text-black"
              >
                <q-card :class="['q-py-sm q-px-md', darkMode ? 'text-white pt-dark-card' : 'text-black']">
                  <div class="row">
                    <div class="q-space">Amount</div>
                    <div class="text-caption text-grey">
                      {{gift?.amount}} BCH
                    </div>
                  </div>
                  <div class="row">
                    <div class="q-space">Date Created</div>
                    <div class="text-caption text-grey">
                      {{formatRelativeTimestamp(gift?.date_created)}}
                    </div>
                  </div>
                  <q-separator spaced :dark="darkMode"/>
                  <div v-if="gift.date_claimed === 'None'" class="row items-center q-gutter-sm">
                    <div class="q-space">
                      <q-badge color="grey" class="q-my-xs">Unclaimed</q-badge>
                    </div>
                    <div v-if="getGiftShare(gift?.gift_code_hash)">
                      <q-btn
                        flat
                        no-caps
                        padding="2px 0.75rem"
                        size="sm"
                        icon="mdi-cash-refund"
                        @click="() => confirmRecoverGift(gift)"
                      />
                    </div>
                    <q-separator v-if="getGiftShare(gift?.gift_code_hash) && getQrShare(gift?.gift_code_hash)" vertical :dark="darkMode"/>
                    <template v-if="getQrShare(gift?.gift_code_hash)">
                      <div>
                        <q-btn
                          flat
                          no-caps
                          padding="2px 0.75rem"
                          size="sm"
                          icon="mdi-qrcode"
                          @click="() => displayGift(gift)"
                        />
                      </div>
                      <q-separator vertical :dark="darkMode"/>
                      <div>
                        <q-btn
                          flat
                          no-caps
                          padding="2px 0.75rem"
                          size="sm"
                          icon="share"
                          @click="() => shareGift(gift)"
                        />
                      </div>
                    </template>
                  </div>
                  <div v-else class="row items-center q-gutter-sm">
                    <div class="q-space">
                      <q-badge color="green" class="q-my-xs">Claimed</q-badge>
                    </div>
                    <div class="text-caption text-grey">
                      {{formatRelativeTimestamp(gift?.date_claimed)}}
                    </div>
                  </div>
                </q-card>
              </div>
              <div class="full-width row q-mt-sm items-center justify-center">
                <q-pagination
                  v-if="pageNumberPaginationData?.pageCount > 1"
                  :modelValue="pageNumberPaginationData.currentPage"
                  :max="pageNumberPaginationData.pageCount"
                  :max-pages="6"
                  :dark="darkMode"
                  padding="xs"
                  boundary-numbers
                  @update:modelValue="
                    (val) => fetchGifts({
                      recordType: filterOpts.recordType.active,
                      limit: pageNumberPaginationData.pageSize,
                      offset: pageNumberPaginationData.pageSize * (val - 1)
                    })
                  "
                />
              </div>
            </template>
          </div>
        </div>
      </div>
     </div>
    </div>
</template>

<script>
import HeaderNav from '../../../components/header-nav'
import GiftDialog from 'src/components/gifts/GiftDialog.vue'
import ShareGiftDialog from 'src/components/gifts/ShareGiftDialog.vue'
// import { date } from 'quasar'
// import { defineComponent, ref } from 'vue'
import { capitalize } from 'vue'
import { formatDistance } from 'date-fns'
import axios from 'axios'

export default {
  name: 'Gift',
  components: { HeaderNav },
  data () {
    return {
      walletHash: this.getWallet('bch').walletHash,
      filterOpts: {
        recordType: {
          active: 'all',
          default: 'all',
          options: ['claimed', 'unclaimed', 'all'],
        }
      },
      fetchingGifts: false,
      gifts: [],
      pagination: {
        count: 0,
        limit: 0,
        offset: 0,
      },
    }
  },

  computed: {
    darkMode() {
      return this.$store.getters['darkmode/getStatus']
    },
    pageNumberPaginationData () {
      if (
        !this.pagination ||
        !Number.isSafeInteger(this.pagination.count) ||
        !Number.isSafeInteger(this.pagination.limit) ||
        !Number.isSafeInteger(this.pagination.offset)
      ) return

      return {
        pageCount: Math.ceil(this.pagination.count / this.pagination.limit),
        currentPage: Math.ceil(this.pagination.offset / this.pagination.limit) + 1,
        pageSize: this.pagination.limit
      }
    }
  },

  methods: {
    capitalize: capitalize,
    formatRelativeTimestamp(val) {
      if (isNaN(new Date(val).valueOf())) return ''
      return `${formatDistance(new Date(val), new Date(), { addSuffix: true })}`
    },
    fetchGifts(opts = { recordType: 'all', limit: 10, offset: 0 }) {
      const recordType = opts?.recordType || 'all'
      const url = `https://gifts.paytaca.com/api/gifts/${this.walletHash}/list`
      const query = { limit: undefined, offset: undefined, claimed: undefined }
      if (recordType === 'claimed') query.claimed = true
      if (recordType === 'unclaimed') query.claimed = false
      if (!isNaN(opts?.limit) || !isNaN(opts?.offset)) {
        query.limit = opts.limit
        query.offset = opts.offset
      }

      this.fetchingGifts = true
      axios.get(url, { params: query })
        .then(response => {
          if (!Array.isArray(response?.data?.gifts)) return Promise.reject({ response })

          this.gifts = response.data.gifts.filter(gift => {
            if (recordType === 'unclaimed') return gift.date_claimed === 'None'
            if (recordType === 'claimed') return gift.date_claimed !== 'None'

            if (gift.date_claimed !== 'None') this.$store.dispatch('gifts/deleteGift', gift.gift_code_hash)
            return true
          })

          return Promise.resolve(response)
        })
        .then(response => {
          this.filterOpts.recordType.active = recordType
          if (this.filterOpts.recordType.options.indexOf(recordType) < 0) {
            this.filterOpts.recordType.active = this.filterOpts.recordType.default
          }

          if (response?.data?.pagination) this.pagination = response?.data?.pagination
        })
        .finally(() => {
          this.fetchingGifts = false
        })
    },
    shareGift(gift) {
      this.$q.dialog({
        component: ShareGiftDialog,
        componentProps: { gift: gift },
      })
    },
    displayGift(gift) {
      this.$q.dialog({
        component: GiftDialog,
        componentProps: { gift: gift },
      })
    },
    getGiftShare (giftCodeHash) {
      return this.$store.getters['gifts/getGiftShare'](giftCodeHash)
    },
    getQrShare (giftCodeHash) {
      return this.$store.getters['gifts/getQrShare'](giftCodeHash)
    },
    confirmRecoverGift(gift) {
      this.$q.dialog({
        title: 'Recover gift',
        message: `Recover gift of ${gift.amount} BCH. Proceed?`,
        ok: true,
        cancel: true,
        class: this.darkMode ? 'text-white br-15 pt-dark-card' : 'text-black',
      })
        .onOk(() => this.recoverGift(gift?.gift_code_hash))
    },
    recoverGift (giftCodeHash) {
      const localShare = this.getGiftShare(giftCodeHash)
      this.$router.push(
        {
          name: 'claim-gift',
          query: {
            actionProp: 'Recover',
            giftCodeHash: giftCodeHash,
            localShare: localShare
          }
        }
      )
    },
    showQr (giftCodeHash) {
      // const localShare = this.getQrShare(giftCodeHash)
      const vm = this
      this.$router.push(
        {
          name: 'show-qr',
          query: {
            actionProp: 'showQr',
            giftCodeHash: giftCodeHash
          }
        }
      )
    },
    getWallet (type) {
      return this.$store.getters['global/getWallet'](type)
    }
  },
  mounted () {
    // this.getItemsWithSort()
    // this.getItems()
    this.fetchGifts()
    // console.log(this.getGiftShare(this.giftCodeHash))
  }
}
</script>

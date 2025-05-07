<template>
  <div class="static-container">
    <div id="app-container" :class="getDarkModeClass(darkMode)" style="margin-top: 84px;">
      <HeaderNav
        :title="$t('Gifts')"        
        class="q-px-sm apps-header gift-app-header"
      />
      <q-pull-to-refresh @refresh="fetchGifts">
        <div :style="{ 'margin-top': $q.platform.is.ios ? '45px' : '30px'}">
          <div class="row items-center justify-end q-mx-md q-mb-md q-px-xs q-gutter-sm">
            <q-btn
              no-caps
              color="primary"
              :label="$t('CreateGift')"
              class="button"
              :to="{ name: 'create-gift'}"
            />
            <q-btn
              no-caps
              color="primary"
              :label="$t('ClaimGift')"
              class="button"
              :to="{ name: 'claim-gift'}"
            />
          </div>
          <div class="q-pa-md" :class="{'text-black': !darkMode}" style="margin-top: -10px;">
            <div class="q-px-xs row items-start">
              <div class="q-table__title q-space">{{ $t('GiftsYouCreated') }}</div>
              <q-btn-dropdown
                color="primary"
                no-caps :label="$t(capitalize(filterOpts.recordType.active))"
                dense
                class="q-pl-sm button"
                :dark="darkMode"
                content-style="color: black;"
              >
                <q-list dense>
                  <q-item
                    v-for="(recordType, index) in filterOpts.recordType.options"
                    :key="index"
                    :index="recordType"
                    clickable v-close-popup
                    :active="recordType === filterOpts.recordType.active"
                    @click="() => fetchGifts(null, opts={ recordType: recordType, limit: 10 })"
                  >
                    <q-item-section>
                      <q-item-label>{{ $t(capitalize(recordType)) }}</q-item-label>
                    </q-item-section>
                  </q-item>
                </q-list>
              </q-btn-dropdown>
            </div>
            <div v-if="campaign_filter.id" class="text-center q-mt-md">
              <q-chip removable @remove="$event => { campaign_filter = {}; fetchGifts(null, opts={ recordType: 'all', limit: 10, offset: 0}) } ">{{ campaign_filter.name }}</q-chip>
            </div>
            <div class="row items-start q-mt-sm">
              <template v-if="fetchingGifts">
                <div
                  v-for="i in 3"
                  class="q-pa-xs col-xs-12 col-sm-6 col-md-4 col-lg-3 grid-style-transition text-black"
                >
                  <q-card class="q-py-sm q-px-md" :class="getDarkModeClass(darkMode, 'text-white', 'text-black')">
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
                <div>{{ $t('NoGifts') }}</div>
                <q-icon name="mdi-gift" size="1.25em"/>
              </div>
              <template v-else>
                <div
                  v-for="gift in gifts"
                  :key="gift?.gift_code_hash"
                  class="q-pa-xs col-xs-12 col-sm-6 col-md-4 col-lg-3 grid-style-transition text-black"
                >
                  <q-card
                    class="q-py-sm q-px-md pt-card"
                    :class="getDarkModeClass(darkMode, 'text-white', 'text-black')"
                  >
                    <div class="row">
                      <div class="q-space">{{ $t('Amount') }}</div>
                      <div class="text-caption text-grey">
                        {{ getAssetDenomination(denomination, gift?.amount) }}
                      </div>
                    </div>
                    <div class="row">
                      <div class="q-space">{{ $t('DateCreated') }}</div>
                      <div class="text-caption text-grey">
                        {{formatRelativeTimestamp(gift?.date_created)}}
                      </div>
                    </div>
                    <div class="row" v-if="gift?.campaign_name">
                      <div class="q-space">{{ $t('Campaign') }}</div>
                      <div class="text-caption text-grey">
                        <a style="text-decoration: underline;" @click="filterByCampaign(gift)">{{ gift?.campaign_name }}</a>
                      </div>
                    </div>
                    <q-separator spaced :dark="darkMode"/>
                    <div v-if="gift.date_claimed === 'None'" class="row items-center q-gutter-sm">
                      <div class="q-space">
                        <q-badge color="grey" class="q-my-xs">{{ $t('Unclaimed') }}</q-badge>
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
                      <div v-else>
                        <span style="color: red;">Gift code not found on this device</span>
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
                        <q-badge v-if="gift?.recovered" color="blue" class="q-my-xs">
                          {{ $t('Recovered') }}
                        </q-badge>
                        <q-badge v-else color="green" class="q-my-xs">
                          {{ $t('Claimed') }}
                        </q-badge>
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
                      (val) => fetchGifts(null, opts={
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
      </q-pull-to-refresh>
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
import { getAssetDenomination } from 'src/utils/denomination-utils'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

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
      campaign_filter: {}
    }
  },

  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    denomination () {
      return this.$store.getters['global/denomination']
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
    getAssetDenomination,
    getDarkModeClass,
    capitalize: capitalize,
    formatRelativeTimestamp(val) {
      if (isNaN(new Date(val).valueOf())) return ''
      return `${formatDistance(new Date(val), new Date(), { addSuffix: true })}`
    },
    fetchGifts(done, opts = { recordType: 'all', limit: 10, offset: 0 }) {
      const recordType = opts?.recordType || 'all'
      const url = `https://gifts.paytaca.com/api/gifts/${this.walletHash}/list`
      const query = { limit: undefined, offset: undefined, claimed: undefined }
      if (recordType === 'claimed') query.claimed = true
      if (recordType === 'unclaimed') query.claimed = false
      if (!isNaN(opts?.limit) || !isNaN(opts?.offset)) {
        query.limit = opts.limit
        query.offset = opts.offset
        query.campaign = this.campaign_filter ? this.campaign_filter.id : null
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
          if (done) {
            done()
          }
          this.fetchingGifts = false
        })
    },
    shareGift(gift) {
      this.$q.dialog({
        component: ShareGiftDialog,
        componentProps: { gift: gift },
      })
    },
    filterByCampaign (gift) {
      this.campaign_filter = { id: gift?.campaign_id, name: gift?.campaign_name }
      this.fetchGifts(null, opts={ recordType: 'all', limit: 10, offset: 0 })
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
        title: this.$t('RecoverGift'),
        message: this.$t('RecoverGiftDescription', { amount: gift.amount }, `Recover gift of ${gift.amount} BCH. Proceed?`),
        ok: this.$t('OK'),
        cancel: this.$t('Cancel'),
        seamless: true,
        class: `br-15 pt-card text-bow ${this.getDarkModeClass(this.darkMode)}`
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
    this.fetchGifts(null)
  }
}
</script>

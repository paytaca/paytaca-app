<template>
  <div class="static-container">
    <div id="app-container" :class="getDarkModeClass(darkMode)">
      <HeaderNav
        :title="$t('Gifts')"
        backnavpath="/apps"
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
                  v-for="i in 4"
                  class="col-6 q-pa-sm"
                >
                  <q-card class="q-pa-md" :class="getDarkModeClass(darkMode, 'text-white', 'text-black')">
                    <q-skeleton height="1.25em" class="q-mb-sm"/>
                    <q-skeleton height="1.25em" class="q-mb-sm"/>
                    <q-skeleton height="1.25em"/>
                  </q-card>
                </div>
              </template>
              <div v-else-if="!giftsList.length"
                class="col-12 row items-center justify-center text-center text-grey q-my-md q-gutter-sm"
                style="font-size:2rem"
              >
                <div>{{ $t('NoGifts') }}</div>
                <q-icon name="mdi-gift" size="1.25em"/>
              </div>
              <template v-else>
                <div v-for="gift in giftsList" :key="gift.hash" class="col-6 q-pa-sm">
                  <q-card class="gift-card">
                    <q-card-section>
                      <div class="text-h6">{{ getAssetDenomination(denomination, gift.amount) }}</div>
                      <div class="text-caption q-mt-sm">
                        {{ formatRelativeTimestamp(gift.date_created) }}
                      </div>
                      <div class="q-mt-md">
                        <q-chip
                          :color="gift.payload?.recovered ? 'warning' : (gift.date_claimed !== 'None' ? 'positive' : 'primary')"
                          text-color="white"
                          size="sm"
                          class="full-width"
                        >
                          {{ gift.payload?.recovered ? $t('Recovered') : (gift.date_claimed !== 'None' ? $t('Claimed') : $t('Unclaimed')) }}
                        </q-chip>
                        <q-btn
                          v-if="gift.status === 'failed'"
                          color="negative"
                          :loading="processing"
                          class="full-width q-mt-sm"
                          @click="resubmitGift(gift)"
                        >
                          {{ $t('Resubmit') }}
                        </q-btn>
                      </div>
                      <div class="row justify-center q-mt-md q-gutter-md">
                        <q-btn
                          flat
                          round
                          color="primary"
                          icon="mdi-share-variant"
                          @click="copyToClipboard('https://gifts.paytaca.com/claim/?code=' + gift.qr)"
                        >
                          <q-tooltip>{{ $t('ShareGiftLink') }}</q-tooltip>
                        </q-btn>
                        <q-btn
                          flat
                          round
                          color="primary"
                          icon="mdi-qrcode"
                          @click="showQr(gift.hash)"
                        >
                          <q-tooltip>{{ $t('ShowQRCode') }}</q-tooltip>
                        </q-btn>
                        <q-btn
                          v-if="!gift.recovered && gift.date_claimed === 'None'"
                          flat
                          round
                          color="warning"
                          icon="mdi-refresh"
                          @click="confirmRecoverGift(gift)"
                        >
                          <q-tooltip>{{ $t('RecoverGift') }}</q-tooltip>
                        </q-btn>
                      </div>
                    </q-card-section>
                  </q-card>
                </div>
                
                <!-- Pagination -->
                <div class="col-12 flex flex-center q-mt-lg">
                  <q-pagination
                    v-if="pageNumberPaginationData?.pageCount > 1"
                    v-model="pageNumberPaginationData.currentPage"
                    :max="pageNumberPaginationData.pageCount"
                    :max-pages="6"
                    :dark="darkMode"
                    direction-links
                    boundary-links
                    padding="xs"
                    @update:model-value="
                      (val) => fetchGifts(null, {
                        recordType: filterOpts.recordType.active,
                        limit: 10,
                        offset: (val - 1) * 10
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
import { capitalize } from 'vue'
import { formatDistance } from 'date-fns'
import axios from 'axios'
import { getAssetDenomination } from 'src/utils/denomination-utils'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { getMnemonic, Wallet } from '../../../wallet'
import QRCode from 'qrcode'
import QrDialog from 'src/components/gifts/QrDialog.vue'

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
      fetchedGifts: {},
      pagination: {
        count: 0,
        limit: 0,
        offset: 0,
      },
      campaign_filter: {},
      processing: false,
      wallet: null
    }
  },

  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    gifts () {
      return this.$store.state.gifts.gifts || {}
    },
    giftsList () {
      const gifts = Object.entries(this.fetchedGifts).map(([hash, gift]) => ({
        hash,
        ...gift,
        qr: this.$store.getters['gifts/getQr'](hash),
        date_created: gift.payload?.date_created,
        date_claimed: gift.payload?.date_claimed,
        campaign_id: gift.payload?.campaign_id,
        campaign_name: gift.payload?.campaign_name,
        recovered: gift.payload?.recovered
      }))

      // Filter based on recordType
      const filteredGifts = gifts.filter(gift => {
        const recordType = this.filterOpts.recordType.active
        if (recordType === 'unclaimed') return gift.date_claimed === 'None'
        if (recordType === 'claimed') return gift.date_claimed !== 'None'
        return true
      })

      // Sort by date_created in descending order (latest first)
      return filteredGifts.sort((a, b) => {
        return new Date(b.date_created) - new Date(a.date_created)
      })
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
        currentPage: Math.floor(this.pagination.offset / this.pagination.limit) + 1,
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
      this.fetchedGifts = {}
      const recordType = opts?.recordType || 'all'
      const url = `https://gifts.paytaca.com/api/gifts/${this.walletHash}/list`
      const query = {
        limit: opts.limit || 10,
        offset: opts.offset || 0,
        claimed: undefined
      }
      
      if (recordType === 'claimed') query.claimed = true
      if (recordType === 'unclaimed') query.claimed = false
      if (this.campaign_filter?.id) {
        query.campaign = this.campaign_filter.id
      }

      this.fetchingGifts = true
      axios.get(url, { params: query })
        .then(response => {
          if (!Array.isArray(response?.data?.gifts)) return Promise.reject({ response })

          // Transform gifts before storing
          const transformedGifts = response.data.gifts.map(gift => ({
            hash: gift.gift_code_hash,
            amount: gift.amount,
            date_created: gift.date_created,
            date_claimed: gift.date_claimed,
            campaign_id: gift.campaign_id,
            campaign_name: gift.campaign_name,
            recovered: gift.recovered,
            status: gift.date_claimed !== 'None' ? 'completed' : 'processing'
          }))

          // Store each gift individually
          transformedGifts.forEach(gift => {
            // Get existing gift data to preserve local share
            const existingGift = this.$store.getters['gifts/getGift'](gift.hash)
            const existingShare = existingGift?.share || null
            const savedGift = {
              giftCodeHash: gift.hash,
              share: existingShare, // Preserve existing local share
              status: gift.status,
              amount: gift.amount,
              address: gift.address,
              payload: {
                gift_code_hash: gift.hash,
                date_created: gift.date_created,
                amount: gift.amount,
                campaign_id: gift.campaign_id,
                campaign_name: gift.campaign_name,
                date_claimed: gift.date_claimed,
                recovered: gift.recovered
              }
            }
            this.$store.commit('gifts/saveGift', savedGift)
            this.fetchedGifts[gift.hash] = savedGift
          })
          return Promise.resolve(response)
        })
        .then(response => {
          this.filterOpts.recordType.active = recordType
          if (this.filterOpts.recordType.options.indexOf(recordType) < 0) {
            this.filterOpts.recordType.active = this.filterOpts.recordType.default
          }

          if (response?.data?.pagination) {
            this.pagination = response.data.pagination
          }
        })
        .finally(() => {
          if (done) done()
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
        .onOk(() => this.recoverGift(gift?.hash))
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
      const qrCode = this.$store.getters['gifts/getQr'](giftCodeHash)
      const gift = this.giftsList.find(g => g.hash === giftCodeHash)
      this.$q.dialog({
        component: QrDialog,
        componentProps: {
          qrCode: qrCode,
          amount: gift.amount,
          claimed: gift.date_claimed !== 'None',
          recovered: gift.recovered
        }
      })
    },
    getWallet (type) {
      return this.$store.getters['global/getWallet'](type)
    },
    async resubmitGift(gift) {
      if (this.processing) return
      
      this.processing = true
      const walletHash = this.wallet.BCH.getWalletHash()
      const url = `https://gifts.paytaca.com/api/gifts/${walletHash}/create/`
      
      try {
        const resp = await axios.post(url, gift.payload)
        if (resp.status === 200) {
          const result = await this.wallet.BCH.sendBch(gift.amount, gift.address)
          if (result.success) {
            this.$store.dispatch('gifts/updateGiftStatus', {
              giftCodeHash: gift.hash,
              status: 'completed'
            })
            this.$q.notify({
              message: this.$t('Success'),
              color: 'positive'
            })
          } else {
            this.$store.dispatch('gifts/updateGiftStatus', {
              giftCodeHash: gift.hash,
              status: 'failed'
            })
            this.$q.notify({
              message: this.$t('GiftCreatedButTransactionPending'),
              color: 'warning'
            })
          }
        }
      } catch (error) {
        this.$store.dispatch('gifts/updateGiftStatus', {
          giftCodeHash: gift.hash,
          status: 'failed'
        })
        this.$q.notify({
          message: this.$t('ErrorCreatingGiftPleaseRetry'),
          color: 'negative'
        })
      } finally {
        this.processing = false
      }
    },
    copyToClipboard(text) {
      this.$copyText(text)
      this.$q.notify({
        message: this.$t('CopiedToClipboard'),
        color: 'blue-9',
        timeout: 800,
        icon: 'mdi-clipboard-check'
      })
    }
  },
  async mounted() {
    const mnemonic = await getMnemonic(this.$store.getters['global/getWalletIndex'])
    this.wallet = new Wallet(mnemonic)
    this.fetchGifts(null)
  }
}
</script>

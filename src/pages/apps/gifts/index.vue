<template>
  <div id="app-container" class="sticky-header-container gifts-page" :class="getDarkModeClass(darkMode)">
    <HeaderNav
      :title="$t('Gifts')"
      backnavpath="/apps"
      class="header-nav q-px-sm apps-header"
    />
    <q-pull-to-refresh @refresh="fetchGifts">
      <div class="gifts-content" :style="{ 'margin-top': $q.platform.is.ios ? '45px' : '30px'}">
          <!-- Action Buttons -->
          <div class="action-buttons-wrapper q-px-md q-mb-md">
            <div class="action-buttons-container">
              <button
                class="action-button bg-grad"
                @click="$router.push({ name: 'create-gift' })"
              >
                <q-icon name="mdi-plus-circle" size="20px" class="q-mr-xs"/>
                {{ $t('CreateGift') }}
              </button>
              <button
                class="action-button action-button-outline"
                :style="`border-color: ${getThemeColor()}; color: ${getThemeColor()};`"
                @click="$router.push({ name: 'claim-gift' })"
              >
                <q-icon name="mdi-gift" size="20px" class="q-mr-xs"/>
                {{ $t('ClaimGift') }}
              </button>
            </div>
          </div>

          <!-- Tabs Section -->
          <div class="tabs-wrapper q-mb-md">
            <div 
              class="gifts-tabs" 
              :class="getDarkModeClass(darkMode)"
            >
              <button
                class="gifts-tab"
                :class="[
                  darkMode ? 'dark' : '',
                  tabButtonClass('unclaimed'),
                  `theme-${theme}`
                ]"
                :style="activeTab === 'unclaimed' ? `background-color: ${getThemeColor()} !important; color: #fff !important;` : ''"
                @click="changeTab('unclaimed')"
              >
                <q-icon name="mdi-gift" size="18px" class="q-mr-xs"/>
                {{ $t('Unclaimed') }}
              </button>
              <button
                class="gifts-tab"
                :class="[
                  darkMode ? 'dark' : '',
                  tabButtonClass('claimed'),
                  `theme-${theme}`
                ]"
                :style="activeTab === 'claimed' ? `background-color: ${getThemeColor()} !important; color: #fff !important;` : ''"
                @click="changeTab('claimed')"
              >
                <q-icon name="mdi-check-circle" size="18px" class="q-mr-xs"/>
                {{ $t('Claimed') }}
              </button>
              <button
                class="gifts-tab"
                :class="[
                  darkMode ? 'dark' : '',
                  tabButtonClass('recovered'),
                  `theme-${theme}`
                ]"
                :style="activeTab === 'recovered' ? `background-color: ${getThemeColor()} !important; color: #fff !important;` : ''"
                @click="changeTab('recovered')"
              >
                <q-icon name="mdi-recycle" size="18px" class="q-mr-xs"/>
                {{ $t('Recovered') }}
              </button>
            </div>
          </div>

          <div v-if="campaign_filter.id" class="text-center q-mb-md">
            <q-chip 
              removable 
              :color="themeColor"
              text-color="white"
              @remove="$event => { campaign_filter = {}; fetchGifts(null, opts={ recordType: activeTab, limit: 10, offset: 0}) }"
            >
              {{ campaign_filter.name }}
            </q-chip>
          </div>

          <!-- Unclaimed Gifts - Card View -->
          <div v-if="activeTab === 'unclaimed'" class="gifts-grid q-px-md q-pb-md">
            <template v-if="fetchingGifts">
              <div
                v-for="i in 4"
                :key="i"
                class="gift-card-container"
              >
                <div class="gift-card-skeleton pt-card" :class="getDarkModeClass(darkMode)">
                  <q-skeleton height="60px" class="q-mb-md" />
                  <q-skeleton height="20px" class="q-mb-sm" width="60%" />
                  <q-skeleton height="20px" width="40%" />
                  <div class="q-mt-md">
                    <q-skeleton height="32px" class="q-mb-sm" />
                    <q-skeleton height="40px" />
                  </div>
                </div>
              </div>
            </template>

            <div v-else-if="!giftsList.length"
              class="empty-state"
            >
              <q-icon name="mdi-gift-outline" size="80px" class="q-mb-md" :class="darkMode ? 'text-grey-5' : 'text-grey-7'"/>
              <div class="text-h6" :class="darkMode ? 'text-grey-6' : 'text-grey-8'">{{ $t('NoUnclaimedGifts', {}, 'No unclaimed gifts') }}</div>
              <div class="text-caption q-mt-sm" :class="darkMode ? 'text-grey-5' : 'text-grey-7'">
                {{ $t('CreateYourFirstGift', {}, 'Create your first gift to get started') }}
              </div>
            </div>

            <template v-else>
              <div 
                v-for="gift in giftsList" 
                :key="gift.hash" 
                class="gift-card-container"
              >
                <div 
                  class="gift-card pt-card"
                  :class="[
                    getDarkModeClass(darkMode),
                    { 'gift-card-claimed': gift.date_claimed !== 'None' || gift.recovered }
                  ]"
                >
                  <!-- Gift Icon & Amount -->
                  <div class="gift-header">
                    <div class="gift-icon-wrapper">
                      <q-icon 
                        name="mdi-gift" 
                        size="32px"
                        :class="getGiftIconClass(gift)"
                      />
                    </div>
                    <div class="gift-amount text-grad">
                      {{ getAssetDenomination(denomination, gift.amount) }}
                    </div>
                    <div class="gift-date text-caption">
                      {{ formatRelativeTimestamp(gift.date_created) }}
                    </div>
                  </div>

                  <!-- Status Badge -->
                  <div class="gift-status-section q-mt-md">
                    <q-badge
                      :class="getStatusBadgeClass(gift)"
                      class="status-badge"
                    >
                      <q-icon 
                        :name="getStatusIcon(gift)" 
                        size="14px" 
                        class="q-mr-xs"
                      />
                      {{ getStatusText(gift) }}
                    </q-badge>
                    
                    <q-btn
                      v-if="gift.status === 'failed'"
                      unelevated
                      no-caps
                      :loading="processing"
                      class="full-width q-mt-sm bg-grad"
                      @click="resubmitGift(gift)"
                    >
                      <q-icon name="mdi-reload" class="q-mr-sm" />
                      {{ $t('Resubmit') }}
                    </q-btn>
                  </div>

                  <!-- Action Buttons -->
                  <div class="gift-actions q-mt-md">
                    <q-btn
                      flat
                      dense
                      round
                      :color="themeColor"
                      icon="mdi-share-variant"
                      class="action-icon-btn"
                      @click="copyToClipboard('https://gifts.paytaca.com/claim/?code=' + gift.qr)"
                    >
                      <q-tooltip>{{ $t('ShareGiftLink') }}</q-tooltip>
                    </q-btn>
                    <q-btn
                      flat
                      dense
                      round
                      :color="themeColor"
                      icon="mdi-qrcode"
                      class="action-icon-btn"
                      @click="showQr(gift.hash)"
                    >
                      <q-tooltip>{{ $t('ShowQRCode') }}</q-tooltip>
                    </q-btn>
                    <q-btn
                      v-if="!gift.recovered && gift.date_claimed === 'None'"
                      flat
                      dense
                      round
                      color="orange-6"
                      icon="mdi-recycle"
                      class="action-icon-btn"
                      @click="confirmRecoverGift(gift)"
                    >
                      <q-tooltip>{{ $t('RecoverGift') }}</q-tooltip>
                    </q-btn>
                  </div>
                </div>
              </div>
            </template>

            <!-- Pagination -->
            <div v-if="pageNumberPaginationData?.pageCount > 1" class="pagination-container q-mt-lg">
              <q-pagination
                v-model="pageNumberPaginationData.currentPage"
                :max="pageNumberPaginationData.pageCount"
                :max-pages="6"
                :color="themeColor"
                :dark="darkMode"
                direction-links
                boundary-links
                padding="sm"
                @update:model-value="
                  (val) => fetchGifts(null, {
                    recordType: activeTab,
                    limit: 10,
                    offset: (val - 1) * 10
                  })
                "
              />
            </div>
          </div>

          <!-- Claimed/Recovered Gifts - Table View -->
          <div v-else class="gifts-table-container q-px-md q-pb-md">
            <div v-if="fetchingGifts" class="pt-card q-pa-md" :class="getDarkModeClass(darkMode)">
              <q-skeleton type="rect" height="400px" />
            </div>

            <div v-else-if="!giftsList.length" class="empty-state">
              <q-icon 
                :name="activeTab === 'claimed' ? 'mdi-check-circle-outline' : 'mdi-recycle'" 
                size="80px" 
                class="q-mb-md"
                :class="darkMode ? 'text-grey-5' : 'text-grey-7'"
              />
              <div class="text-h6" :class="darkMode ? 'text-grey-6' : 'text-grey-8'">
                {{ activeTab === 'claimed' ? $t('NoClaimedGifts', {}, 'No claimed gifts') : $t('NoRecoveredGifts', {}, 'No recovered gifts') }}
              </div>
            </div>

            <q-table
              v-else
              :rows="giftsList"
              :columns="tableColumns"
              row-key="hash"
              :dark="darkMode"
              flat
              class="gifts-table pt-card"
              :class="getDarkModeClass(darkMode)"
              :rows-per-page-options="[10, 20, 50]"
              :pagination="{ rowsPerPage: 10 }"
            >
              <template v-slot:body-cell-amount="props">
                <q-td :props="props">
                  <div class="text-weight-medium text-grad">
                    {{ getAssetDenomination(denomination, props.row.amount) }}
                  </div>
                </q-td>
              </template>

              <template v-slot:body-cell-date="props">
                <q-td :props="props">
                  <div class="text-caption">
                    {{ formatRelativeTimestamp(props.row.date_created) }}
                  </div>
                </q-td>
              </template>

              <template v-slot:body-cell-status="props">
                <q-td :props="props">
                  <q-badge
                    :class="getStatusBadgeClass(props.row)"
                    class="status-badge-small"
                  >
                    <q-icon 
                      :name="getStatusIcon(props.row)" 
                      size="12px" 
                      class="q-mr-xs"
                    />
                    {{ getStatusText(props.row) }}
                  </q-badge>
                </q-td>
              </template>

              <template v-slot:body-cell-claimed_date="props">
                <q-td :props="props">
                  <div v-if="props.row.date_claimed !== 'None'" class="text-caption">
                    {{ formatRelativeTimestamp(props.row.date_claimed) }}
                  </div>
                  <div v-else class="text-grey-5">-</div>
                </q-td>
              </template>

              <template v-slot:body-cell-actions="props">
                <q-td :props="props">
                  <div class="row q-gutter-xs no-wrap">
                    <q-btn
                      flat
                      dense
                      round
                      size="sm"
                      :color="themeColor"
                      icon="mdi-share-variant"
                      @click="copyToClipboard('https://gifts.paytaca.com/claim/?code=' + props.row.qr)"
                    >
                      <q-tooltip>{{ $t('ShareGiftLink') }}</q-tooltip>
                    </q-btn>
                    <q-btn
                      flat
                      dense
                      round
                      size="sm"
                      :color="themeColor"
                      icon="mdi-qrcode"
                      @click="showQr(props.row.hash)"
                    >
                      <q-tooltip>{{ $t('ShowQRCode') }}</q-tooltip>
                    </q-btn>
                  </div>
                </q-td>
              </template>
            </q-table>

            <!-- Pagination for table -->
            <div v-if="pageNumberPaginationData?.pageCount > 1" class="pagination-container q-mt-lg">
              <q-pagination
                v-model="pageNumberPaginationData.currentPage"
                :max="pageNumberPaginationData.pageCount"
                :max-pages="6"
                :color="themeColor"
                :dark="darkMode"
                direction-links
                boundary-links
                padding="sm"
                @update:model-value="
                  (val) => fetchGifts(null, {
                    recordType: activeTab,
                    limit: 10,
                    offset: (val - 1) * 10
                  })
                "
              />
            </div>
          </div>
        </div>
      </q-pull-to-refresh>
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
      activeTab: 'unclaimed',
      filterOpts: {
        recordType: {
          active: 'unclaimed',
          default: 'unclaimed',
          options: ['claimed', 'unclaimed', 'recovered'],
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
    theme () {
      return this.$store.getters['global/theme']
    },
    themeColor () {
      const themeMap = {
        'glassmorphic-blue': 'blue-6',
        'glassmorphic-green': 'green-6',
        'glassmorphic-gold': 'orange-6',
        'glassmorphic-red': 'pink-6'
      }
      return themeMap[this.theme] || 'blue-6'
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

      // Filter based on active tab
      const filteredGifts = gifts.filter(gift => {
        if (this.activeTab === 'unclaimed') {
          return gift.date_claimed === 'None' && !gift.recovered
        }
        if (this.activeTab === 'claimed') {
          return gift.date_claimed !== 'None' && !gift.recovered
        }
        if (this.activeTab === 'recovered') {
          return gift.recovered
        }
        return true
      })

      // Sort by date_created in descending order (latest first)
      return filteredGifts.sort((a, b) => {
        return new Date(b.date_created) - new Date(a.date_created)
      })
    },
    unclaimedGiftsCount () {
      // Count unclaimed gifts from fetchedGifts directly, regardless of active tab
      // This ensures limit enforcement works correctly even when user is on a different tab
      const gifts = Object.entries(this.fetchedGifts).map(([hash, gift]) => ({
        hash,
        ...gift,
        date_claimed: gift.payload?.date_claimed,
        recovered: gift.payload?.recovered
      }))
      return gifts.filter(gift => gift.date_claimed === 'None' && !gift.recovered).length
    },
    unclaimedGiftsLimit () {
      return this.$store.getters['subscription/getLimit']('unclaimedGifts')
    },
    isUnclaimedGiftsLimitReached () {
      return this.unclaimedGiftsCount >= this.unclaimedGiftsLimit
    },
    tableColumns () {
      const columns = [
        {
          name: 'amount',
          label: this.$t('Amount'),
          field: 'amount',
          align: 'left',
          sortable: true
        },
        {
          name: 'date',
          label: this.$t('DateCreated', {}, 'Date Created'),
          field: 'date_created',
          align: 'left',
          sortable: true
        },
        {
          name: 'status',
          label: this.$t('Status'),
          field: row => this.getStatusText(row),
          align: 'center',
          sortable: false
        },
        {
          name: 'claimed_date',
          label: this.activeTab === 'recovered' 
            ? this.$t('DateRecovered', {}, 'Date Recovered')
            : this.$t('DateClaimed', {}, 'Date Claimed'),
          field: 'date_claimed',
          align: 'left',
          sortable: true
        }
      ]

      // Only add Actions column for unclaimed tab
      if (this.activeTab === 'unclaimed') {
        columns.push({
          name: 'actions',
          label: this.$t('Actions'),
          field: 'actions',
          align: 'center',
          sortable: false
        })
      }

      return columns
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
    },
    getGiftIconClass(gift) {
      if (gift.recovered) return 'text-orange-6'
      if (gift.date_claimed !== 'None') return 'text-green-6'
      return 'text-grad'
    },
    getStatusBadgeClass(gift) {
      if (gift.recovered) return 'status-recovered'
      if (gift.date_claimed !== 'None') return 'status-claimed'
      return 'status-unclaimed'
    },
    getStatusIcon(gift) {
      if (gift.recovered) return 'mdi-recycle'
      if (gift.date_claimed !== 'None') return 'mdi-check-circle'
      return 'mdi-clock-outline'
    },
    getStatusText(gift) {
      if (gift.recovered) return this.$t('Recovered')
      if (gift.date_claimed !== 'None') return this.$t('Claimed')
      return this.$t('Unclaimed')
    },
    changeTab(tab) {
      this.activeTab = tab
      this.fetchGifts(null, { recordType: tab, limit: 10 })
    },
    tabButtonClass(tab) {
      return this.activeTab === tab ? 'active-theme-btn' : ''
    },
    getThemeColor() {
      const themeMap = {
        'glassmorphic-blue': '#42a5f5',
        'glassmorphic-green': '#4caf50',
        'glassmorphic-gold': '#ffa726',
        'glassmorphic-red': '#f54270'
      }
      return themeMap[this.theme] || '#42a5f5'
    }
  },
  async mounted() {
    const mnemonic = await getMnemonic(this.$store.getters['global/getWalletIndex'])
    this.wallet = new Wallet(mnemonic)
    this.fetchGifts(null, { recordType: this.activeTab, limit: 10 })
  }
}
</script>

<style lang="scss" scoped>
.gifts-page {
  &.dark {
    background-color: #1a1a1a;
  }
  
  &.light {
    background-color: #f5f5f7;
  }
}

// Action Buttons
.action-buttons-wrapper {
  display: flex;
  justify-content: center;
  animation: slideDown 0.4s ease-out;
}

.action-buttons-container {
  display: inline-flex;
  gap: 12px;
  width: 100%;
  max-width: 500px;

  .action-button {
    flex: 1;
    height: 50px;
    border-radius: 25px;
    border: none;
    font-weight: 600;
    font-size: 15px;
    letter-spacing: 0.3px;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    display: flex;
    align-items: center;
    justify-content: center;
    outline: 0;
    color: white;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
    
    &:active {
      transform: translateY(0);
    }
  }

  .action-button-outline {
    background: transparent;
    border: 2px solid;
    box-shadow: none;

    &:hover {
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    }
  }
}

// Tabs Section
.tabs-wrapper {
  display: flex;
  justify-content: center;
  padding: 0 8px;
  animation: fadeIn 0.5s ease-out;
}

.gifts-tabs {
  display: inline-flex;
  gap: clamp(4px, 1.5vw, 8px);
  background-color: rgb(242, 243, 252);
  border-radius: 24px;
  padding: 4px;
  max-width: 100%;
  box-sizing: border-box;
  
  &.dark {
    background-color: rgba(255, 255, 255, 0.1);
  }
}

.gifts-tab {
  min-width: clamp(90px, 25vw, 120px);
  height: 40px;
  border-radius: 20px;
  border: none;
  color: #4C4F4F;
  background-color: transparent;
  outline: 0;
  cursor: pointer;
  transition: all 0.3s;
  font-weight: 500;
  font-size: clamp(12px, 3vw, 14px);
  padding: 0 clamp(12px, 4vw, 20px);
  flex: 1 1 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover:not(.active-theme-btn) {
    background-color: rgba(0, 0, 0, 0.05);
  }
  
  &.dark {
    color: rgba(255, 255, 255, 0.7);
    
    &:hover:not(.active-theme-btn) {
      background-color: rgba(255, 255, 255, 0.08);
    }
  }
}

// Theme-based active tab styles
.gifts-tab.active-theme-btn {
  color: #fff !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.gifts-tab.active-theme-btn.theme-glassmorphic-blue {
  background-color: #42a5f5 !important;
}

.gifts-tab.active-theme-btn.theme-glassmorphic-gold {
  background-color: #ffa726 !important;
}

.gifts-tab.active-theme-btn.theme-glassmorphic-green {
  background-color: #4caf50 !important;
}

.gifts-tab.active-theme-btn.theme-glassmorphic-red {
  background-color: #f54270 !important;
}

// Dark mode active tab
.gifts-tab.active-theme-btn.dark {
  color: #fff !important;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
}

// Active tab hover effects
.gifts-tab.active-theme-btn.theme-glassmorphic-blue:hover {
  background-color: #1e88e5 !important;
}

.gifts-tab.active-theme-btn.theme-glassmorphic-gold:hover {
  background-color: #fb8c00 !important;
}

.gifts-tab.active-theme-btn.theme-glassmorphic-green:hover {
  background-color: #43a047 !important;
}

.gifts-tab.active-theme-btn.theme-glassmorphic-red:hover {
  background-color: #e91e63 !important;
}

// Gifts Grid
.gifts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  animation: fadeIn 0.6s ease-out;

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
}

.gift-card-container {
  animation: slideUp 0.4s ease-out backwards;
  
  @for $i from 1 through 20 {
    &:nth-child(#{$i}) {
      animation-delay: #{$i * 0.05}s;
    }
  }
}

// Gift Cards
.gift-card {
  padding: 20px;
  border-radius: 16px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: default;
  position: relative;
  overflow: hidden;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
  }

  &.gift-card-claimed {
    opacity: 0.85;

    &:hover {
      opacity: 1;
    }
  }
}

.gift-card-skeleton {
  padding: 20px;
  border-radius: 16px;
  min-height: 220px;
}

// Gift Header
.gift-header {
  text-align: center;
}

.gift-icon-wrapper {
  margin-bottom: 12px;
  display: inline-block;
  padding: 12px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  
  .dark & {
    background: rgba(255, 255, 255, 0.05);
  }
}

.gift-amount {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 4px;
  letter-spacing: -0.5px;
}

.gift-date {
  opacity: 0.7;
  font-size: 12px;
}

// Status Section
.gift-status-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.status-badge {
  padding: 8px 16px;
  border-radius: 20px;
  font-weight: 600;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;

  &.status-claimed {
    background: rgba(76, 175, 80, 0.15);
    color: #4caf50;
    border: 1px solid rgba(76, 175, 80, 0.3);
  }

  &.status-unclaimed {
    background: rgba(33, 150, 243, 0.15);
    color: #2196f3;
    border: 1px solid rgba(33, 150, 243, 0.3);
  }

  &.status-recovered {
    background: rgba(255, 152, 0, 0.15);
    color: #ff9800;
    border: 1px solid rgba(255, 152, 0, 0.3);
  }
}

// Action Buttons
.gift-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
  padding-top: 8px;
  border-top: 1px solid rgba(128, 128, 128, 0.15);
}

.action-icon-btn {
  transition: all 0.2s ease;

  &:hover {
    transform: scale(1.15);
  }

  &:active {
    transform: scale(0.95);
  }
}

// Empty State
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  text-align: center;
  animation: fadeIn 0.5s ease-out;
}

// Pagination
.pagination-container {
  display: flex;
  justify-content: center;
  animation: fadeIn 0.7s ease-out;
}

// Table View
.gifts-table-container {
  animation: fadeIn 0.6s ease-out;
}

.gifts-table {
  border-radius: 16px;
  overflow: hidden;

  :deep(.q-table__top) {
    padding: 16px;
  }

  :deep(.q-table thead tr) {
    th {
      font-weight: 600;
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
  }

  :deep(.q-table tbody tr) {
    transition: all 0.2s ease;

    &:hover {
      background: rgba(128, 128, 128, 0.08);
    }

    td {
      padding: 12px 16px;
    }
  }
}

.status-badge-small {
  padding: 4px 12px;
  border-radius: 12px;
  font-weight: 600;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  display: inline-flex;
  align-items: center;

  &.status-claimed {
    background: rgba(76, 175, 80, 0.15);
    color: #4caf50;
    border: 1px solid rgba(76, 175, 80, 0.3);
  }

  &.status-recovered {
    background: rgba(255, 152, 0, 0.15);
    color: #ff9800;
    border: 1px solid rgba(255, 152, 0, 0.3);
  }
}

// Animations
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>

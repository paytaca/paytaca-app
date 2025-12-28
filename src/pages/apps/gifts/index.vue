<template>
  <div id="app-container" class="sticky-header-container gifts-page" :class="getDarkModeClass(darkMode)">
    <HeaderNav
      :title="$t('Gifts')"
      backnavpath="/apps"
      class="header-nav q-px-sm apps-header"
    >
      <template v-slot:top-right-menu>
        <q-btn
          flat
          round
          dense
          icon="mdi-plus-circle"
          :class="getDarkModeClass(darkMode)"
          @click="handleCreateGiftClick"
        />
      </template>
    </HeaderNav>
    <q-pull-to-refresh @refresh="fetchGifts">
      <div class="gifts-content" :style="{ 'margin-top': $q.platform.is.ios ? '45px' : '30px'}">
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

          <!-- Unclaimed Gifts - List View -->
          <div 
            v-if="activeTab === 'unclaimed'" 
            ref="unclaimedGiftsList"
            class="gifts-list scroll-y"
            @scroll="onUnclaimedGiftsScroll"
          >
            <template v-if="fetchingGifts && !hasLoadedGifts">
              <div
                v-for="i in 8"
                :key="i"
                class="gift-item text-bow q-mx-lg q-px-sm q-py-md"
                :class="getDarkModeClass(darkMode)"
              >
                <q-skeleton type="rect" height="60px" />
              </div>
            </template>

            <div v-else-if="!giftsList.length" class="empty-state">
              <q-icon name="mdi-gift-outline" size="80px" class="q-mb-md" :class="darkMode ? 'text-grey-5' : 'text-grey-7'"/>
              <div class="text-h6" :class="darkMode ? 'text-grey-6' : 'text-grey-8'">{{ $t('NoUnclaimedGifts', {}, 'No unclaimed gifts') }}</div>
              <div 
                class="text-caption q-mt-sm cursor-pointer" 
                :class="darkMode ? 'text-grey-5' : 'text-grey-7'"
                style="text-decoration: underline;"
                @click="handleCreateGiftClick"
              >
                {{ $t('CreateAGiftNow', {}, 'Create a gift now') }}
              </div>
            </div>

            <template v-else>
              <div 
                v-for="gift in giftsList" 
                :key="gift.hash" 
                class="gift-item text-bow q-mx-lg q-px-sm q-py-md"
                :class="getDarkModeClass(darkMode)"
                @click="displayGift(gift)"
              >
                <div class="gift-item-content">
                  <div class="gift-item-header">
                    <div class="gift-item-type">
                      <q-icon name="mdi-gift" size="20px" class="q-mr-xs" :class="getGiftIconClass(gift)" />
                      <span class="type-text text-uppercase" :class="getDarkModeClass(darkMode)">
                        {{ $t('Gift') }}
                      </span>
                      <span v-if="gift.campaign_name" class="gift-campaign-name" :class="getDarkModeClass(darkMode)">
                        • {{ gift.campaign_name }}
                      </span>
                    </div>
                    <div class="gift-item-amount" :class="getDarkModeClass(darkMode)">
                      <div class="amount-primary text-grad">
                      {{ getAssetDenomination(denomination, gift.amount) }}
                    </div>
                    </div>
                  </div>
                  <div class="gift-item-footer">
                    <span class="gift-date-footer" :class="getDarkModeClass(darkMode)">
                      {{ formatRelativeTimestamp(gift.date_created) }}
                    </span>
                    <div class="gift-item-actions">
                    <q-btn
                      v-if="gift.encrypted_gift_code && gift.qr"
                      flat
                      dense
                      round
                        size="sm"
                      :color="themeColor"
                      icon="mdi-share-variant"
                        @click.stop="copyToClipboard('https://gifts.paytaca.com/claim/?code=' + gift.qr)"
                    >
                      <q-tooltip>{{ $t('ShareGiftLink') }}</q-tooltip>
                    </q-btn>
                    <q-btn
                      v-if="gift.encrypted_gift_code && gift.qr"
                      flat
                      dense
                      round
                        size="sm"
                      :color="themeColor"
                      icon="mdi-qrcode"
                        @click.stop="displayGiftQr(gift)"
                    >
                      <q-tooltip>{{ $t('ShowQRCode') }}</q-tooltip>
                    </q-btn>
                    <q-btn
                      v-if="gift.encrypted_gift_code && gift.qr && !gift.recovered && gift.date_claimed === 'None'"
                      flat
                      dense
                      round
                        size="sm"
                      color="orange-6"
                      icon="mdi-recycle"
                        @click.stop="confirmRecoverGift(gift)"
                    >
                      <q-tooltip>{{ $t('RecoverGift') }}</q-tooltip>
                    </q-btn>
                  </div>
                </div>
              </div>
              </div>
              
              <!-- Loading indicator for infinite scroll -->
              <div v-if="loadingMoreGifts && giftsList.length > 0" class="loading-more q-pa-md">
                <q-spinner :color="themeColor" size="32px" />
                <p class="loading-text q-mt-sm" :class="getDarkModeClass(darkMode)">{{ $t('LoadingMore', {}, 'Loading more') }}...</p>
            </div>
              
              <!-- End of list indicator -->
              <div v-else-if="giftsList.length > 0 && !hasMoreUnclaimedGifts" class="end-of-list q-pa-md">
                <q-icon name="check_circle" size="24px" :class="getDarkModeClass(darkMode)" />
                <p class="end-text q-mt-sm" :class="getDarkModeClass(darkMode)">{{ $t('AllGiftsLoaded', {}, 'All gifts loaded') }}</p>
          </div>

              <!-- Scroll sentinel for intersection observer -->
              <div ref="scrollSentinel" class="scroll-sentinel"></div>
            </template>
            </div>

          <!-- Claimed Gifts - List View -->
          <div 
            v-else 
            ref="claimedGiftsList"
            class="gifts-list scroll-y"
            @scroll="onClaimedGiftsScroll"
          >
            <template v-if="fetchingGifts && !hasLoadedClaimedGifts">
              <div
                v-for="i in 8"
                :key="i"
                class="gift-item text-bow q-mx-lg q-px-sm q-py-md"
                :class="getDarkModeClass(darkMode)"
              >
                <q-skeleton type="rect" height="60px" />
              </div>
            </template>

            <div v-else-if="!giftsList.length" class="empty-state">
              <q-icon 
                name="mdi-check-circle-outline" 
                size="80px" 
                class="q-mb-md"
                :class="darkMode ? 'text-grey-5' : 'text-grey-7'"
              />
              <div class="text-h6" :class="darkMode ? 'text-grey-6' : 'text-grey-8'">
                {{ $t('NoClaimedGifts', {}, 'No claimed gifts') }}
              </div>
            </div>

            <template v-else>
              <div 
                v-for="gift in giftsList" 
                :key="gift.hash" 
                class="gift-item text-bow q-mx-lg q-px-sm q-py-md"
              :class="getDarkModeClass(darkMode)"
                @click="displayGift(gift)"
              >
                <div class="gift-item-content">
                  <div class="gift-item-header">
                    <div class="gift-item-type">
                      <q-icon name="mdi-gift" size="20px" class="q-mr-xs" :class="getGiftIconClass(gift)" />
                      <span class="type-text text-uppercase" :class="getDarkModeClass(darkMode)">
                        {{ $t('Gift') }}
                      </span>
                      <span v-if="gift.campaign_name" class="gift-campaign-name" :class="getDarkModeClass(darkMode)">
                        • {{ gift.campaign_name }}
                      </span>
                  </div>
                    <div class="gift-item-amount" :class="getDarkModeClass(darkMode)">
                      <div class="amount-primary text-grad">
                        {{ getAssetDenomination(denomination, gift.amount) }}
                  </div>
                    </div>
                  </div>
                  <div class="gift-item-footer">
                    <span class="gift-date-footer" :class="getDarkModeClass(darkMode)">
                      {{ formatRelativeTimestamp(gift.date_claimed !== 'None' ? gift.date_claimed : gift.date_created) }}
                    </span>
                  <q-badge
                      :class="gift.recovered ? 'status-recovered' : 'status-claimed'"
                    class="status-badge-small"
                  >
                    <q-icon 
                        :name="gift.recovered ? 'mdi-recycle' : 'mdi-check-circle'" 
                      size="12px" 
                      class="q-mr-xs"
                    />
                      {{ gift.recovered ? $t('Recovered', {}, 'RECOVERED') : $t('Claimed', {}, 'CLAIMED') }}
                  </q-badge>
                  </div>
                </div>
              </div>
              
              <!-- Loading indicator for infinite scroll -->
              <div v-if="loadingMoreClaimedGifts && giftsList.length > 0" class="loading-more q-pa-md">
                <q-spinner :color="themeColor" size="32px" />
                <p class="loading-text q-mt-sm" :class="getDarkModeClass(darkMode)">{{ $t('LoadingMore', {}, 'Loading more') }}...</p>
                  </div>
              
              <!-- End of list indicator -->
              <div v-else-if="giftsList.length > 0 && !hasMoreClaimedGifts" class="end-of-list q-pa-md">
                <q-icon name="check_circle" size="24px" :class="getDarkModeClass(darkMode)" />
                <p class="end-text q-mt-sm" :class="getDarkModeClass(darkMode)">{{ $t('AllGiftsLoaded', {}, 'All gifts loaded') }}</p>
                  </div>
              
              <!-- Scroll sentinel for intersection observer -->
              <div ref="claimedScrollSentinel" class="scroll-sentinel"></div>
            </template>
          </div>
        </div>
      </q-pull-to-refresh>
  </div>
</template>

<script>
import HeaderNav from '../../../components/header-nav'
import GiftDialog from 'src/components/gifts/GiftDialog.vue'
import ShareGiftDialog from 'src/components/gifts/ShareGiftDialog.vue'
import UpgradePromptDialog from 'src/components/subscription/UpgradePromptDialog.vue'
import { capitalize } from 'vue'
import { formatDistance } from 'date-fns'
import axios from 'axios'
import { getAssetDenomination } from 'src/utils/denomination-utils'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { getMnemonic, Wallet } from '../../../wallet'
import QRCode from 'qrcode'
import { ensureKeypair } from 'src/utils/memo-service'
import { decryptMemo } from 'src/utils/transaction-memos'

export default {
  name: 'Gift',
  components: { 
    HeaderNav,
    UpgradePromptDialog
  },
  data () {
    return {
      walletHash: this.getWallet('bch').walletHash,
      activeTab: 'unclaimed',
      filterOpts: {
        recordType: {
          active: 'unclaimed',
          default: 'unclaimed',
          options: ['claimed', 'unclaimed'],
        }
      },
      fetchingGifts: false,
      fetchedGifts: {},
      pagination: {
        count: 0,
        limit: 0,
        offset: 0,
      },
      isGiftDialogOpen: false, // Track if gift dialog is currently open
      currentGiftDialog: null, // Store reference to current dialog instance
      campaign_filter: {},
      processing: false,
      wallet: null,
      // Infinite scroll state
      loadingMoreGifts: false,
      unclaimedGiftsPage: 1,
      unclaimedGiftsLimit: 10,
      hasMoreUnclaimedGifts: true,
      hasLoadedGifts: false,
      // Claimed gifts infinite scroll state
      loadingMoreClaimedGifts: false,
      claimedGiftsPage: 1,
      claimedGiftsLimit: 10,
      hasMoreClaimedGifts: true,
      hasLoadedClaimedGifts: false,
      claimedGiftsNoItemsCount: 0, // Track consecutive fetches with no items
      // IntersectionObserver for infinite scroll
      unclaimedIntersectionObserver: null,
      claimedIntersectionObserver: null,
      // Debounce timers for scroll handlers
      unclaimedScrollTimer: null,
      claimedScrollTimer: null
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
    giftsList () {
      const gifts = Object.entries(this.fetchedGifts).map(([hash, gift]) => ({
        hash,
        ...gift,
        qr: gift.giftCode,
        date_created: gift.date_created,
        date_claimed: gift.date_claimed,
        campaign_id: gift.campaign_id,
        campaign_name: gift.campaign_name,
        recovered: gift.recovered
      }))

      // Filter based on active tab
      const filteredGifts = gifts.filter(gift => {
        // Helper to check if gift is recovered (handles various formats)
        const isRecovered = gift.recovered === true || gift.recovered === 'true' || gift.recovered === 1
        
        if (this.activeTab === 'unclaimed') {
          return gift.date_claimed === 'None' && !isRecovered
        }
        if (this.activeTab === 'claimed') {
          // Show all gifts returned by API when type=claimed
          // The API already filters by type, so we should trust all returned items
          // Some items might be recovered and not have date_claimed set, but they're still "claimed" in the API's view
          return true
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
        date_claimed: gift.date_claimed,
        recovered: gift.recovered
      }))
      // Helper to check if gift is recovered (handles various formats)
      return gifts.filter(gift => {
        const isRecovered = gift.recovered === true || gift.recovered === 'true' || gift.recovered === 1
        return gift.date_claimed === 'None' && !isRecovered
      }).length
    },
    subscriptionUnclaimedGiftsLimit () {
      return this.$store.getters['subscription/getLimit']('unclaimedGifts')
    },
    isUnclaimedGiftsLimitReached () {
      return this.unclaimedGiftsCount >= this.subscriptionUnclaimedGiftsLimit
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
          label: this.$t('DateClaimed', {}, 'Date Claimed'),
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
      try {
        const date = new Date(val)
        const now = new Date()
        const diffTime = Math.abs(now - date)
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        
        if (diffDays < 7) {
          // Show relative time for dates less than 7 days ago
          return `${formatDistance(date, now, { addSuffix: true })}`
        } else {
          // Show absolute date for dates 7 days or more ago
          return date.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          })
        }
      } catch (e) {
        return val
      }
    },
    fetchGifts(done, opts = { recordType: 'all', limit: 10, offset: 0, append: false }) {
      const recordType = opts?.recordType || 'all'
      const shouldAppend = opts?.append || false
      
      // Reset state if not appending
      if (!shouldAppend) {
        this.fetchedGifts = {}
        if (recordType === 'unclaimed') {
          this.unclaimedGiftsPage = 1
          this.hasMoreUnclaimedGifts = true
          this.hasLoadedGifts = false
        } else if (recordType === 'claimed') {
          this.claimedGiftsPage = 1
          this.hasMoreClaimedGifts = true
          this.hasLoadedClaimedGifts = false
        }
      }
      
      const url = `https://gifts.paytaca.com/api/gifts/${this.walletHash}/list`
      const query = {
        limit: opts.limit || (recordType === 'unclaimed' ? this.unclaimedGiftsLimit : (recordType === 'claimed' ? this.claimedGiftsLimit : 10)),
        offset: opts.offset || 0
      }
      
      // Set type parameter based on recordType
      if (recordType === 'unclaimed' || recordType === 'claimed') {
        query.type = recordType
      }
      
      if (this.campaign_filter?.id) {
        query.campaign = this.campaign_filter.id
      }

      this.fetchingGifts = true
      return axios.get(url, { params: query })
        .then(async response => {
          if (!Array.isArray(response?.data?.gifts)) return Promise.reject({ response })


          // Get keypair for decryption
          const keypair = await ensureKeypair()

          // Transform gifts and decrypt gift codes
          const transformedGifts = await Promise.all(
            response.data.gifts.map(async gift => {
              let giftCode = null
              if (gift.encrypted_gift_code) {
                try {
                  giftCode = await decryptMemo(keypair.privkey, gift.encrypted_gift_code)
                } catch (error) {
                  console.error('Failed to decrypt gift code:', error)
                }
              }
              return {
            hash: gift.gift_code_hash,
            amount: gift.amount,
            date_created: gift.date_created,
            date_claimed: gift.date_claimed,
            campaign_id: gift.campaign_id,
            campaign_name: gift.campaign_name,
            recovered: gift.recovered,
                status: gift.date_claimed !== 'None' ? 'completed' : 'processing',
                giftCode: giftCode,
                encrypted_gift_code: gift.encrypted_gift_code
              }
            })
          )

          // Store gifts in component state only (no Vuex store)
          if (shouldAppend) {
            // Append new gifts (don't overwrite existing ones)
            const beforeCount = Object.keys(this.fetchedGifts).length
            const existingHashes = new Set(Object.keys(this.fetchedGifts))
            let addedCount = 0
            const skippedHashes = []
            const newHashes = []
            
          transformedGifts.forEach(gift => {
              if (!this.fetchedGifts[gift.hash]) {
                this.fetchedGifts[gift.hash] = gift
                addedCount++
                newHashes.push(gift.hash.substring(0, 8))
              } else {
                skippedHashes.push(gift.hash.substring(0, 8))
              }
            })
            const afterCount = Object.keys(this.fetchedGifts).length
          } else {
            // Replace gifts - clear first if not appending
            this.fetchedGifts = {}
            transformedGifts.forEach(gift => {
              this.fetchedGifts[gift.hash] = gift
            })
          }
          
          
          // Update pagination state for unclaimed gifts
          if (recordType === 'unclaimed') {
            const pagination = response?.data?.pagination || {}
            // Use the offset we requested (query.offset) when appending, otherwise use pagination offset or 0
            const currentOffset = shouldAppend ? query.offset : (pagination.offset || query.offset || 0)
            const currentLimit = pagination.limit || query.limit
            const totalCount = pagination.count || 0
            
            let hasNext = false
            if (pagination.has_next !== undefined) {
              hasNext = pagination.has_next === true
            } else if (totalCount > 0 && currentOffset !== undefined && currentLimit !== undefined) {
              // Calculate if there are more items: current offset + limit < total count
              hasNext = (currentOffset + currentLimit) < totalCount
            } else {
              // Fallback: if we got a full page, assume there might be more
              hasNext = transformedGifts.length === query.limit
            }
            this.hasMoreUnclaimedGifts = hasNext
            this.hasLoadedGifts = true
          }
          
          // Update pagination state for claimed gifts
          if (recordType === 'claimed') {
            const pagination = response?.data?.pagination || {}
            // Use the offset we requested (query.offset) when appending, otherwise use pagination offset or 0
            const currentOffset = shouldAppend ? query.offset : (pagination.offset || query.offset || 0)
            const currentLimit = pagination.limit || query.limit
            const totalCount = pagination.count || 0
            
            let hasNext = false
            if (pagination.has_next !== undefined) {
              hasNext = pagination.has_next === true
            } else if (totalCount > 0 && currentOffset !== undefined && currentLimit !== undefined) {
              // Calculate if there are more items: current offset + limit < total count
              hasNext = (currentOffset + currentLimit) < totalCount
            } else {
              // Fallback: if we got a full page, assume there might be more
              hasNext = transformedGifts.length === query.limit
            }
            this.hasMoreClaimedGifts = hasNext
            this.hasLoadedClaimedGifts = true
          }
          
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
          
          return response
        })
        .finally(() => {
          if (done) done()
          this.fetchingGifts = false
        })
    },
    loadMoreUnclaimedGifts() {
      if (this.loadingMoreGifts || !this.hasMoreUnclaimedGifts) {
        return Promise.resolve() // Return early, don't increment page
      }
      
      this.loadingMoreGifts = true
      // Calculate offset: page 1 (first load more) = 10, page 2 = 20, etc.
      // Since initial load uses offset 0, first "load more" should use offset 10
      const offset = this.unclaimedGiftsPage * this.unclaimedGiftsLimit
      const currentPage = this.unclaimedGiftsPage
      const storedCountBefore = Object.keys(this.fetchedGifts).length
      
      return this.fetchGifts(null, {
        recordType: 'unclaimed',
        limit: this.unclaimedGiftsLimit,
        offset: offset,
        append: true
      }).then((response) => {
        const storedCountAfter = Object.keys(this.fetchedGifts).length
        const itemsAdded = storedCountAfter - storedCountBefore
        
        // Only increment page if we actually got new items
        if (itemsAdded > 0 && this.hasMoreUnclaimedGifts) {
          this.unclaimedGiftsPage = currentPage + 1
        }
      }).catch((error) => {
        console.error('[Gifts] Error loading more unclaimed gifts:', error)
        // Don't increment page on error
      }).finally(() => {
        this.loadingMoreGifts = false
        
        // Re-setup IntersectionObserver after items are loaded to ensure it can detect the sentinel
        this.$nextTick(() => {
          if (this.activeTab === 'unclaimed' && this.hasMoreUnclaimedGifts) {
            this.setupUnclaimedIntersectionObserver()
          }
        })
      })
    },
    loadMoreClaimedGifts() {
      if (this.loadingMoreClaimedGifts || !this.hasMoreClaimedGifts) {
        return Promise.resolve() // Return early, don't increment page
      }
      this.loadingMoreClaimedGifts = true
      // Calculate offset: page 1 = 0, page 2 = 10, page 3 = 20, etc.
      const offset = this.claimedGiftsPage * this.claimedGiftsLimit
      const currentPage = this.claimedGiftsPage
      const storedCountBefore = Object.keys(this.fetchedGifts).length
      
      return this.fetchGifts(null, {
        recordType: 'claimed',
        limit: this.claimedGiftsLimit,
        offset: offset,
        append: true
      }).then((response) => {
        // fetchGifts returns the axios response, which has the data nested
        const storedCountAfter = Object.keys(this.fetchedGifts).length
        const itemsAdded = storedCountAfter - storedCountBefore
        // The response from fetchGifts is the axios response object
        const apiReturnedItems = response?.data?.data?.gifts?.length || response?.data?.gifts?.length || 0
        
        // Always increment page if API returned items (even if they were duplicates)
        // This ensures we try the next offset on the next scroll
        if (apiReturnedItems > 0 && this.hasMoreClaimedGifts) {
          this.claimedGiftsPage = currentPage + 1
          this.claimedGiftsNoItemsCount = 0 // Reset counter
        } else if (itemsAdded > 0 && this.hasMoreClaimedGifts) {
          // Fallback: increment if items were added
          this.claimedGiftsPage = currentPage + 1
          this.claimedGiftsNoItemsCount = 0
        } else {
          this.claimedGiftsNoItemsCount++
          
          // If API returned no items at all, only increment after multiple attempts
          if (this.claimedGiftsNoItemsCount >= 2 && this.hasMoreClaimedGifts) {
            this.claimedGiftsPage = currentPage + 1
            this.claimedGiftsNoItemsCount = 0
          }
        }
      }).catch((error) => {
        console.error('[Gifts] Error loading more claimed gifts:', error)
        // Don't increment page on error
      }).finally(() => {
        this.loadingMoreClaimedGifts = false
        
        // Re-setup IntersectionObserver after items are loaded to ensure it can detect the sentinel
        this.$nextTick(() => {
          if (this.activeTab === 'claimed' && this.hasMoreClaimedGifts) {
            this.setupClaimedIntersectionObserver()
          }
        })
      })
    },
    onUnclaimedGiftsScroll(event) {
      // Debounce scroll handler to prevent multiple rapid calls
      if (this.unclaimedScrollTimer) {
        clearTimeout(this.unclaimedScrollTimer)
      }
      
      this.unclaimedScrollTimer = setTimeout(() => {
        const element = event.target
        const scrollTop = element.scrollTop
        const scrollHeight = element.scrollHeight
        const clientHeight = element.clientHeight
        const scrollBottom = scrollHeight - scrollTop - clientHeight
        
        // Load more when user is near the bottom (within 300px, matching transactions)
        // This ensures we load before reaching the absolute bottom
        if (scrollBottom < 300 && this.hasMoreUnclaimedGifts && !this.loadingMoreGifts && this.activeTab === 'unclaimed') {
          this.loadMoreUnclaimedGifts()
        }
      }, 100) // 100ms debounce
    },
    onClaimedGiftsScroll(event) {
      // Debounce scroll handler to prevent multiple rapid calls
      if (this.claimedScrollTimer) {
        clearTimeout(this.claimedScrollTimer)
      }
      
      this.claimedScrollTimer = setTimeout(() => {
        const element = event.target
        const scrollTop = element.scrollTop
        const scrollHeight = element.scrollHeight
        const clientHeight = element.clientHeight
        const scrollBottom = scrollHeight - scrollTop - clientHeight
        
        // Load more when user is near the bottom (within 300px, matching transactions)
        // This ensures we load before reaching the absolute bottom
        if (scrollBottom < 300 && this.hasMoreClaimedGifts && !this.loadingMoreClaimedGifts && this.activeTab === 'claimed') {
          this.loadMoreClaimedGifts()
        }
      }, 100) // 100ms debounce
    },
    setupUnclaimedIntersectionObserver() {
      // Clean up existing observer first
      if (this.unclaimedIntersectionObserver) {
        this.unclaimedIntersectionObserver.disconnect()
        this.unclaimedIntersectionObserver = null
      }
      
      if (!this.$refs.unclaimedGiftsList || !this.$refs.scrollSentinel) {
        return
      }
      
      const options = {
        root: this.$refs.unclaimedGiftsList,
        rootMargin: '200px',
        threshold: 0.1
      }

      this.unclaimedIntersectionObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && this.hasMoreUnclaimedGifts && !this.loadingMoreGifts && this.activeTab === 'unclaimed') {
            this.loadMoreUnclaimedGifts()
          }
        })
      }, options)

      this.$nextTick(() => {
        if (this.$refs.scrollSentinel) {
          this.unclaimedIntersectionObserver.observe(this.$refs.scrollSentinel)
        }
      })
    },
    setupClaimedIntersectionObserver() {
      // Clean up existing observer first
      if (this.claimedIntersectionObserver) {
        this.claimedIntersectionObserver.disconnect()
        this.claimedIntersectionObserver = null
      }
      
      if (!this.$refs.claimedGiftsList || !this.$refs.claimedScrollSentinel) {
        return
      }
      
      const options = {
        root: this.$refs.claimedGiftsList,
        rootMargin: '200px',
        threshold: 0.1
      }

      this.claimedIntersectionObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && this.hasMoreClaimedGifts && !this.loadingMoreClaimedGifts && this.activeTab === 'claimed') {
            this.loadMoreClaimedGifts()
          }
        })
      }, options)

      this.$nextTick(() => {
        if (this.$refs.claimedScrollSentinel) {
          this.claimedIntersectionObserver.observe(this.$refs.claimedScrollSentinel)
        }
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
      // If a dialog is already open, close it first
      if (this.isGiftDialogOpen && this.currentGiftDialog) {
        this.currentGiftDialog.hide()
        this.currentGiftDialog = null
        this.isGiftDialogOpen = false
      }
      
      // Mark dialog as open
      this.isGiftDialogOpen = true
      
      // Open dialog and store reference (info-only, no QR)
      this.currentGiftDialog = this.$q.dialog({
        component: GiftDialog,
        componentProps: { gift: gift, showQr: false },
        persistent: false
      })
      
      this.currentGiftDialog.onDismiss(() => {
        // Clear flag and reference when dialog is dismissed
        this.isGiftDialogOpen = false
        this.currentGiftDialog = null
      })
    },
    displayGiftQr(gift) {
      // Safety check: don't show dialog if gift.qr is not available (decryption failed)
      if (!gift.qr) {
        return
      }
      
      // If a dialog is already open, close it first
      if (this.isGiftDialogOpen && this.currentGiftDialog) {
        this.currentGiftDialog.hide()
        this.currentGiftDialog = null
        this.isGiftDialogOpen = false
      }
      
      // Mark dialog as open
      this.isGiftDialogOpen = true
      
      // Open dialog with QR code display
      this.currentGiftDialog = this.$q.dialog({
        component: GiftDialog,
        componentProps: { gift: gift, showQr: true },
        persistent: false
      })
      
      this.currentGiftDialog.onDismiss(() => {
        // Clear flag and reference when dialog is dismissed
        this.isGiftDialogOpen = false
        this.currentGiftDialog = null
      })
    },
    getQrShare (giftCodeHash) {
      return this.fetchedGifts[giftCodeHash]?.giftCode || null
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
    async recoverGift (giftCodeHash) {
      const gift = this.fetchedGifts[giftCodeHash]
      if (!gift?.encrypted_gift_code) {
        this.$q.notify({
          message: this.$t('GiftNotFound') || 'Gift not found or missing encrypted gift code',
          color: 'negative',
          timeout: 3000
        })
        return
      }
      try {
        const keypair = await ensureKeypair()
        const giftCode = await decryptMemo(keypair.privkey, gift.encrypted_gift_code)
        // decryptMemo returns null on failure rather than throwing an exception
        if (!giftCode) {
          console.error('Failed to decrypt gift code for recovery: decryptMemo returned null')
          this.$q.notify({
            message: this.$t('FailedToDecryptGiftCode') || 'Failed to decrypt gift code',
            color: 'negative',
            timeout: 3000
          })
          return
        }
        this.$router.push({
          name: 'claim-gift',
          query: {
            actionProp: 'Recover',
            giftCodeHash: giftCodeHash,
            localShare: giftCode
          }
        })
      } catch (error) {
        console.error('Failed to decrypt gift code for recovery:', error)
        this.$q.notify({
          message: this.$t('FailedToDecryptGiftCode') || 'Failed to decrypt gift code',
          color: 'negative',
          timeout: 3000
        })
      }
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
            this.$q.notify({
              message: this.$t('Success'),
              color: 'positive'
            })
          } else {
            this.$q.notify({
              message: this.$t('GiftCreatedButTransactionPending'),
              color: 'warning'
            })
          }
        }
      } catch (error) {
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
      // Clean up existing observers
      if (this.unclaimedIntersectionObserver) {
        this.unclaimedIntersectionObserver.disconnect()
        this.unclaimedIntersectionObserver = null
      }
      if (this.claimedIntersectionObserver) {
        this.claimedIntersectionObserver.disconnect()
        this.claimedIntersectionObserver = null
      }
      
      this.activeTab = tab
      if (tab === 'unclaimed') {
        // Reset infinite scroll state for unclaimed tab
        this.unclaimedGiftsPage = 1
        this.hasMoreUnclaimedGifts = true
        this.hasLoadedGifts = false
        this.fetchGifts(null, { recordType: tab, limit: this.unclaimedGiftsLimit, offset: 0 })
        // Setup observer after DOM updates
        this.$nextTick(() => {
          this.setupUnclaimedIntersectionObserver()
        })
      } else if (tab === 'claimed') {
        // Reset infinite scroll state for claimed tab
        this.claimedGiftsPage = 1
        this.hasMoreClaimedGifts = true
        this.hasLoadedClaimedGifts = false
        this.fetchGifts(null, { recordType: tab, limit: this.claimedGiftsLimit, offset: 0 })
        // Setup observer after DOM updates
        this.$nextTick(() => {
          this.setupClaimedIntersectionObserver()
        })
      } else {
        this.fetchGifts(null, { recordType: tab, limit: 10, offset: 0 })
      }
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
    },
    async handleCreateGiftClick() {
      // Check subscription status before checking limit
      await this.$store.dispatch('subscription/checkSubscriptionStatus')
      
      // Check if unclaimed gifts limit is reached using local computed property
      if (this.isUnclaimedGiftsLimitReached) {
        this.$q.dialog({
          component: UpgradePromptDialog,
          componentProps: {
            darkMode: this.darkMode,
            limitType: 'unclaimedGifts'
          }
        })
        return
      }
      
      // Limit not reached, proceed to create gift
      this.$router.push({ name: 'create-gift' })
    }
  },
  async mounted() {
    const mnemonic = await getMnemonic(this.$store.getters['global/getWalletIndex'])
    this.wallet = new Wallet(mnemonic)
    if (this.activeTab === 'unclaimed') {
      this.fetchGifts(null, { recordType: this.activeTab, limit: this.unclaimedGiftsLimit, offset: 0 })
    } else if (this.activeTab === 'claimed') {
      this.fetchGifts(null, { recordType: this.activeTab, limit: this.claimedGiftsLimit, offset: 0 })
    } else {
      this.fetchGifts(null, { recordType: this.activeTab, limit: 10, offset: 0 })
    }
    
    // Setup IntersectionObserver for infinite scroll (backup to scroll handler)
    this.$nextTick(() => {
      this.setupUnclaimedIntersectionObserver()
      this.setupClaimedIntersectionObserver()
    })
  },
  beforeUnmount() {
    // Clean up any open dialog
    if (this.currentGiftDialog) {
      this.currentGiftDialog.hide()
      this.currentGiftDialog = null
      this.isGiftDialogOpen = false
    }
    // Clean up IntersectionObservers
    if (this.unclaimedIntersectionObserver) {
      this.unclaimedIntersectionObserver.disconnect()
    }
    if (this.claimedIntersectionObserver) {
      this.claimedIntersectionObserver.disconnect()
    }
    // Clean up scroll timers
    if (this.unclaimedScrollTimer) {
      clearTimeout(this.unclaimedScrollTimer)
    }
    if (this.claimedScrollTimer) {
      clearTimeout(this.claimedScrollTimer)
    }
  },
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

// Gifts List (for unclaimed - infinite scroll)
.gifts-list {
  max-height: calc(100vh - 200px);
  overflow-y: auto;
  animation: fadeIn 0.6s ease-out;
}

.gift-item {
  cursor: pointer;
  transition: all 0.2s ease;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  position: relative;
  user-select: none;
  
  &:hover {
    background-color: rgba(0, 0, 0, 0.02);
  }
  
  &:active {
    background-color: rgba(0, 0, 0, 0.04);
  }
  
  &.dark {
    border-bottom-color: rgba(255, 255, 255, 0.08);
    
    &:hover {
      background-color: rgba(255, 255, 255, 0.03);
    }
    
    &:active {
      background-color: rgba(255, 255, 255, 0.05);
    }
  }
  
  &:last-child {
    border-bottom: none;
  }
}

.gift-item-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.gift-item-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.gift-item-type {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.gift-item-type .gift-date {
  margin-left: auto;
  font-size: 14px;
  opacity: 0.6;
  flex-shrink: 0;
  
  &.dark {
    color: #a6acaf;
  }
  
  &.light {
    color: rgba(0, 0, 0, 0.6);
  }
}

.type-text {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.3px;
  
  &.dark {
    color: #e0e2e5;
  }
  
  &.light {
    color: rgba(0, 0, 0, 0.87);
  }
}

.gift-item-amount {
  text-align: right;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.amount-primary {
  font-size: 16px;
  font-weight: 600;
  line-height: 1.4;
}

.gift-item-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.gift-item-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.gift-date-footer {
  font-size: 14px;
  opacity: 0.6;
  flex-shrink: 0;
  
  &.dark {
    color: #a6acaf;
  }
  
  &.light {
    color: rgba(0, 0, 0, 0.6);
  }
}

.gift-campaign-name {
  font-size: 14px;
  opacity: 0.7;
  font-weight: 500;
  margin-left: 4px;
  
  &.dark {
    color: #e0e2e5;
  }
  
  &.light {
    color: rgba(0, 0, 0, 0.7);
  }
}


.gift-item-actions {
  display: flex;
  gap: 4px;
}

.loading-more,
.end-of-list {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 20px;
}

.loading-text,
.end-text {
  font-size: 14px;
  opacity: 0.7;
  
  &.dark {
    color: #a6acaf;
  }
  
  &.light {
    color: rgba(0, 0, 0, 0.6);
  }
}

.scroll-sentinel {
  height: 1px;
  width: 100%;
}

// Gifts Grid (kept for backward compatibility if needed)
.gifts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
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
  padding: 12px;
  border-radius: 12px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: default;
  position: relative;
  overflow: hidden;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.12);
  }

  &.gift-card-claimed {
    opacity: 0.85;

    &:hover {
      opacity: 1;
    }
  }
}

.gift-card-skeleton {
  padding: 12px;
  border-radius: 12px;
  min-height: 160px;
}

// Gift Header
.gift-header {
  text-align: center;
}

.gift-icon-wrapper {
  margin-bottom: 8px;
  display: inline-block;
  padding: 8px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  
  .dark & {
    background: rgba(255, 255, 255, 0.05);
  }
}

.gift-amount {
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 2px;
  letter-spacing: -0.3px;
}

.gift-date {
  opacity: 0.7;
  font-size: 11px;
}

// Status Section
.gift-status-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.status-badge {
  padding: 5px 12px;
  border-radius: 12px;
  font-weight: 600;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
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
  gap: 8px;
  padding-top: 6px;
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

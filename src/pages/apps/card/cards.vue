<template>
  <q-layout view="lHh Lpr lFf" :class="$q.dark.isActive ? 'bg-dark' : 'bg-grey-1'">
    <q-page-container>

      <!-- Skeleton loading state -->
      <div v-if="!isLoaded" class="full-width">
        <div class="q-px-md q-mt-md">
          <q-skeleton type="text" width="120px" height="28px" />
        </div>
        <div class="flex flex-center full-width q-mt-lg">
          <div class="wallet-container" style="position: relative; height: 520px;">
            <div
              v-for="n in 3"
              :key="n"
              class="skeleton-card"
              :style="getSkeletonCardStyle(n-1)"
            ></div>
          </div>
        </div>
      </div>

      <!-- Loaded state -->
      <div v-else class="full-width">
        <div class="flex flex-center full-width q-mt-sm">
          <div class="cards-area">
            <div class="wallet-container" @wheel="onWheel">
              <div class="new-card-btn-container">
                <div class="header-row">
                  <div :style="{ fontSize: '20px', fontWeight: '500', color: $q.dark.isActive ? '#ffffff' : '#1a1a2e' }">
                    My Cards{{ displayedCards.length > 0 ? ' (' + displayedCards.length + ')' : '' }}
                  </div>
                  <div class="plus-btn-circle">
                    <q-btn
                      dense
                      round
                      flat
                      :color="$q.dark.isActive ? 'white' : 'dark'"
                      icon="add"
                      size="md"
                      @click="onOpenCreateCardForm"
                    />
                  </div>
                </div>
                <div v-if="totalBchBalance && !balancesLoading" :style="{ fontSize: '11px', fontWeight: '400', color: $q.dark.isActive ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)' }">
                  {{ totalBchBalance }} BCH total
                </div>
              </div>

              <div class="cards-stack-area">
                <div
                  v-for="(card, index) in displayedCards"
                :key="card.id"
                class="stacked-card"
                :class="{ 'is-dragging': currentCardId === card.id }"
                :style="getCardStyle(index)"
                @mousedown="onPointerDown($event, card)"
                @touchstart="onPointerDown($event, card)"
                @keyup.right="goToCardDetails(card)"
                tabindex="0"
              >
                <!-- Top-left: Card name with status -->
                <div class="card-name-container">
                  <div class="text-weight-medium ellipsis" style="font-size: 20px; max-width: 130px;">
                    {{ getCardDisplayName(card) }}
                  </div>
                  <q-badge
                    rounded
                    :color="card?.isLocked ? 'negative' : 'positive'"
                    size="xs"
                    class="card-status-badge cursor-pointer blink-badge"
                  >
                    <q-tooltip>{{ card?.isLocked ? 'Locked' : 'Active' }}</q-tooltip>
                  </q-badge>
                </div>

                <!-- Bottom-left: Balance -->
                <div class="card-balance-container">
                  <div v-if="balancesLoading">
                    <q-skeleton type="text" width="70px" height="16px" />
                  </div>
                  <div v-else>
                    <div :style="{ fontSize: '10px', opacity: '0.6', fontWeight: '400', letterSpacing: '0.5px' }">BALANCE</div>
                    <div class="row items-center no-wrap" style="gap: 6px;">
                      <div class="text-weight-medium" style="font-size: 22px; line-height: 1.2;">
                        {{ satoshiToBch(getCardBalance(card.id)?.bch) }}
                      </div>
                      <div class="row items-center justify-center" style="width: 24px; height: 24px; border-radius: 6px; background: rgba(255,255,255,0.15);">
                        <q-img src="~assets/bch-logo.png" style="width: 14px; height: 14px;" fit="contain" />
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Top-right: Contract address -->
                <div class="card-contract-container">
                  {{ formatContractAddress(card.cashAddress) }}
                </div>

                <!-- Bottom-right: Logo -->
                <div class="card-logo-container">
                  <q-img src="~assets/paytaca_logo.png" style="width: 36px;" fit="contain" />
                </div>
              </div>

              <!-- Vertical dot indicators -->
              <div v-if="displayedCards.length > 1" class="dot-indicators">
                <div
                  v-for="(_, i) in displayedCards"
                  :key="i"
                  class="dot"
                  :class="{ 'dot-active': i === carouselIndex }"
                ></div>
              </div>
            </div>
            </div>
          </div>

          <div
            v-if="showSwipeHint && displayedCards.length > 0"
            class="swipe-overlay"
            @click="dismissSwipeHint"
          >
            <div class="swipe-overlay-content">
              <div class="swipe-hint-label">GESTURES</div>
              <div class="swipe-hint-row">
                <div class="swipe-arrow-circle carousel-arrows">
                  <q-icon name="expand_less" size="20px" class="arrow-up" />
                  <q-icon name="expand_more" size="20px" class="arrow-down" />
                </div>
                <div>
                  <div class="swipe-hint-title">Browse cards</div>
                  <div class="swipe-hint-sub">Swipe up or down</div>
                </div>
              </div>
              <div class="swipe-hint-row">
                <div class="swipe-arrow-circle swipe-right-circle">
                  <q-icon name="chevron_right" size="24px" class="arrow-right" />
                </div>
                <div>
                  <div class="swipe-hint-title">View details</div>
                  <div class="swipe-hint-sub">Swipe right</div>
                </div>
              </div>
              <div class="swipe-hint-dismiss">Tap anywhere to dismiss</div>
            </div>
          </div>
        </div>
      </div>
       
      <!-- Create Card Dialog -->
      <CreateCardForm v-if="showCreateCardForm" @onClose="onCloseCreateCardForm" :idempotencyKey="idempotencyKey"/>
      <ResumeCreateCardDialog 
        v-if="showResumeCreateCardDialog" 
        @resumeAttempt="onResumeCardAttempt" 
        @deleteAttempt="onDeleteCardAttempt" 
        @cancelAttempt="onCancelCardAttempt"
        />
    </q-page-container>
  </q-layout>
</template>

<script>
import CreateCardForm from 'src/components/card/CreateCardForm.vue';
import MultiWalletDropdown from 'src/components/transactions/MultiWalletDropdown.vue';
import CardPageHeader from 'src/components/card/CardPageHeader.vue';
import CreateCardAttemptMixin from 'src/mixins/card/create-card-attempt-mixin';
import ResumeCreateCardDialog from 'src/components/card/ResumeCreateCardDialog.vue';
import { loadCardUser } from 'src/services/card/user.js';
import { satoshiToBch } from 'src/exchange';
import { bus } from 'src/wallet/event-bus';
import { CardStorage } from 'src/components/card/createCard.js';

export default {
  mixins: [CreateCardAttemptMixin],
  components : {
    MultiWalletDropdown,
    CardPageHeader,
    CreateCardForm,
    ResumeCreateCardDialog
  },

  data () {
    return {
      swipeStates: {},
      isDragging: false,
      currentCardId: null,
      startX: 0,
      startY: 0,
      currentX: 0,
      verticalDragOffset: 0,
      gestureLock: null,
      carouselIndex: 0,
      wheelAccumulator: 0,
      // showCreateCardDialog: false,
      newCardName: '',
      isMinting: false,
      // Backend data fetching disabled
      // loadingCards: true,
      // backendDataMap: {} // Map of cardId -> backend data
      cardBalances: [],
      // true while card balances are being fetched from backend
      balancesLoading: true,
      isLoaded: false,
      showSwipeHint: true
    }
  },

  computed: {
    subCards () {
      return this.$store.getters['card/cards'] || []
    },

    sortedCards () {
      return [...this.subCards].sort((a, b) => b.id - a.id)
    },

    displayedCards () {
      return this.sortedCards
    },

    textColor () {
      return this.$q.dark.isActive ? 'text-white' : 'text-black'
    },

    totalBchBalance () {
      if (!this.cardBalances || this.cardBalances.length === 0) return null
      const totalSats = this.cardBalances.reduce((sum, b) => sum + (Number(b.bch_balance) || 0), 0)
      return satoshiToBch(totalSats)
    }
  },

  async mounted () {
    await this.loadData()
    this.isLoaded = true
    this.$nextTick(() => {
      window.addEventListener('touchstart', this.dismissSwipeHint, { once: true })
      window.addEventListener('mousedown', this.dismissSwipeHint, { once: true })
    })
  },

  watch: {
    displayedCards (cards) {
      if (cards.length > 0) {
        this.carouselIndex = this.carouselIndex % cards.length
      } else {
        this.carouselIndex = 0
      }
    }
  },

  methods: {
    satoshiToBch,
    dismissSwipeHint () {
      this.showSwipeHint = false
      window.removeEventListener('touchstart', this.dismissSwipeHint)
      window.removeEventListener('mousedown', this.dismissSwipeHint)
    },

    async loadData () {
      await this.loadCardUser()
      await this.checkExistingCreateCardAttempt()
      await this.fetchCards()
      this.fetchCardsBalance()
    },

    async loadCardUser () {
      await loadCardUser().then(user => {
        this.user = user
      }).catch(err => {
        console.error('Error loading card user:', err)
        this.user = null
      })   
    },

    async fetchCards () {
      return this.$store.dispatch('card/fetchCards')
    },

    async fetchCardsBalance () {
      // show skeletons while fetching
      this.balancesLoading = true

      if (!this.user || this.subCards.length === 0) {
        this.balancesLoading = false
        return
      }

      try {
        this.cardBalances = (await this.user.fetchCardsBalance()).results
      } catch (err) {
        console.error('Error fetching card balances:', err)
      } finally {
        this.balancesLoading = false
      }
    },

    getCardBalance (cardId) {
      const card = this.cardBalances?.find(card => {
        return card.id === cardId
      })
      const temp = {
        bch: card?.bch_balance ?? '0',
        cashtoken: card?.ct_balance ?? []
      }
      return temp
    },
    /*
    async fetchCardsBackendData () {
      if (this.subCards.length === 0) {
        this.loadingCards = false
        return
      }
      
      this.loadingCards = true
      
      try {
        // Fetch backend data for each card
        const promises = this.subCards.map(async (card) => {
          try {
            const cardInstance = await Card.createInitialized({ raw: { id: card.id } })
            const bchUtxos = await cardInstance.getBchUtxos()
            const bchBalanceSats = bchUtxos.reduce((sum, utxo) => sum + BigInt(utxo.satoshis || 0), 0n)
            const bchBalance = (Number(bchBalanceSats) / 100000000).toFixed(8)
            
            this.backendDataMap[card.id] = {
              balance: bchBalance,
              contractAddress: cardInstance.raw?.contract_id
            }
          } catch (error) {
            console.error(`Failed to fetch data for card ${card.id}:`, error)
            this.backendDataMap[card.id] = null
          }
        })
        
        await Promise.all(promises)
      } catch (error) {
        console.error('Failed to fetch cards backend data:', error)
      } finally {
        this.loadingCards = false
      }
    },
    */

    capitalizeFirst (str) {
      if (!str) return ''
      return str.charAt(0).toUpperCase() + str.slice(1)
    },

    /* Get card display name - checks localStorage first for saved name, then falls back to backend alias
     * This ensures edited names persist across the app
     */
    getCardDisplayName (card) {
      if (!card || !card.id) return 'Card'
      
      // Check localStorage for saved name first
      const savedName = CardStorage.getCardProperty(card.id, 'name')
      if (savedName) {
        return this.capitalizeFirst(savedName)
      }
      
      // Fall back to backend alias or name
      return this.capitalizeFirst(card.alias || card.name || 'Card')
    },

    /* NEW: Helper method to get card BCH balance using Card class
     * Uses card.getBchBalance() which returns card.raw.bch_balance from backend
     * Falls back to card.balance from localStorage if method not available
     * 
     * Usage: {{ getCardBchBalance(card) }} in template
     * 
     * getCardBchBalance (card) {
     *   if (!card) return '0.00'
     *   try {
     *     // Use getBchBalance() from Card class
     *     const balance = card.getBchBalance?.() ?? card.balance
     *     return typeof balance === 'number' ? balance.toFixed(2) : (balance || '0.00')
     *   } catch (error) {
     *     console.error('Error getting card balance:', error)
     *     return card?.balance || '0.00'
     *   }
     * },
     */

    getCardStyle (index) {
      const card = this.displayedCards[index]
      const cardId = card?.id
      const translateX = this.swipeStates[cardId] || 0
      const isDraggingThisCard = this.currentCardId === cardId
      const total = this.displayedCards.length
      const isFrontCard = index === this.carouselIndex
      const offset = total > 1 ? (index - this.carouselIndex + total) % total : 0

      const cardSpacing = 85
      const buttonHeight = 280
      const cardHeight = 220
      const visibleArea = 70
      const hiddenArea = cardHeight - visibleArea
      const containerHeight = 520
      const headerArea = 60
      let baseOffset = buttonHeight - hiddenArea

      if (total > 1) {
        const maxOffset = total - 1
        const maxBottom = containerHeight - headerArea - cardHeight
        const requiredBottom = baseOffset + maxOffset * cardSpacing
        if (requiredBottom > maxBottom) {
          baseOffset = Math.max(0, maxBottom - maxOffset * cardSpacing)
        }
      }

      const depthFactor = Math.max(0, 1 - offset * 0.3)
      const dragOffset = isFrontCard ? (this.verticalDragOffset || 0) : (this.verticalDragOffset || 0) * depthFactor * 0.25
      const bottomOffset = baseOffset + offset * cardSpacing + dragOffset

      const scale = Math.max(0.88, 1 - offset * 0.04)
      const tx = isFrontCard ? translateX : 0
      const gapCompensation = offset * cardSpacing * (1 - scale) * 0.5

      return {
        bottom: `${bottomOffset - gapCompensation}px`,
        zIndex: total - offset,
        position: 'absolute',
        width: '90%',
        left: '5%',
        transform: `translateX(${tx}px) scale(${scale})`,
        transformOrigin: 'center bottom',
        background: this.$q.dark.isActive 
          ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' 
          : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '15px',
        height: '220px',
        boxShadow: isFrontCard
          ? '0 16px 48px rgba(0,0,0,0.3), 0 6px 16px rgba(0,0,0,0.2), 0 2px 4px rgba(0,0,0,0.1)'
          : `0 ${4 + offset * 2}px ${12 + offset * 6}px rgba(0,0,0,${0.1 + offset * 0.04}), 0 1px 4px rgba(0,0,0,0.08)`,
        touchAction: 'none',
        userSelect: 'none',
        pointerEvents: 'auto',
        cursor: isDraggingThisCard ? 'grabbing' : 'grab',
        color: 'white',

        transitionProperty: 'bottom, transform, box-shadow',
        transitionDuration: this.isDragging ? '0.02s, 0.02s, 0.02s' : '0.4s, 0.45s, 0.35s',
        transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1), cubic-bezier(0.34, 1.56, 0.64, 1), ease',

        filter: `brightness(${Math.max(0.6, 1 - offset * 0.1)})`,
        opacity: Math.max(0.5, 1 - offset * 0.15)
      }
    },

    getSkeletonCardStyle (index) {
      const cardSpacing = 85
      const buttonHeight = 280
      const cardHeight = 220
      const visibleArea = 70
      const hiddenArea = cardHeight - visibleArea
      const containerHeight = 520
      const headerArea = 60
      let baseOffset = buttonHeight - hiddenArea

      const total = 3
      if (total > 1) {
        const maxOffset = total - 1
        const maxBottom = containerHeight - headerArea - cardHeight
        const requiredBottom = baseOffset + maxOffset * cardSpacing
        if (requiredBottom > maxBottom) {
          baseOffset = Math.max(0, maxBottom - maxOffset * cardSpacing)
        }
      }
      const bottomOffset = baseOffset + index * cardSpacing

      return {
        bottom: `${bottomOffset}px`,
        zIndex: 10 - index,
        position: 'absolute',
        width: '90%',
        left: '5%',
        background: this.$q.dark.isActive 
          ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' 
          : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '15px',
        height: '220px',
        pointerEvents: 'none'
      }
    },

    onPointerDown (evt, card) {
      const cardId = card?.id
      if (!cardId) return

      this.isDragging = true
      this.currentCardId = cardId
      this.gestureLock = null
      this.verticalDragOffset = 0

      const pos = evt.touches ? evt.touches[0] : evt
      this.startX = pos.clientX
      this.startY = pos.clientY
      this.currentX = this.swipeStates[cardId] || 0

      const moveHandler = (e) => {
        if (!this.isDragging) return
        e.preventDefault()
        const p = e.touches ? e.touches[0] : e
        const deltaX = p.clientX - this.startX
        const deltaY = p.clientY - this.startY
        const absX = Math.abs(deltaX)
        const absY = Math.abs(deltaY)

        if (!this.gestureLock) {
          if (absX > 10 || absY > 10) {
            this.gestureLock = absX > absY * 2 ? 'horizontal' : 'vertical'
          }
        }

        if (this.gestureLock === 'horizontal') {
          const isFront = this.displayedCards.findIndex(c => c.id === cardId) === this.carouselIndex
          if (isFront) {
            this.swipeStates[cardId] = Math.max(0, this.currentX + deltaX)
          }
        } else if (this.gestureLock === 'vertical') {
          const adjusted = -deltaY
          this.verticalDragOffset = Math.max(Math.min(adjusted, 110), -110)
        }
      }

      const endHandler = () => {
        document.removeEventListener('mousemove', moveHandler)
        document.removeEventListener('mouseup', endHandler)
        document.removeEventListener('touchmove', moveHandler)
        document.removeEventListener('touchend', endHandler)

        const vOff = this.verticalDragOffset || 0
        const isV = this.gestureLock === 'vertical'
        const isH = this.gestureLock === 'horizontal'

        this.gestureLock = null
        this.currentCardId = null
        this.isDragging = false

        if (isV) {
          const total = this.displayedCards.length
          if (vOff < 0) {
            this.carouselIndex = (this.carouselIndex + 1) % total
          } else if (vOff > 0) {
            this.carouselIndex = (this.carouselIndex - 1 + total) % total
          }
          this.verticalDragOffset = 0
        } else if (isH) {
          const swipeX = this.swipeStates[cardId] || 0
          if (swipeX > 150) {
            const c = this.displayedCards.find(c => c.id === cardId)
            if (c) this.goToCardDetails(c)
          } else {
            this.swipeStates[cardId] = 0
          }
        } else {
          this.verticalDragOffset = 0
        }
      }

      document.addEventListener('mousemove', moveHandler)
      document.addEventListener('mouseup', endHandler)
      document.addEventListener('touchmove', moveHandler, { passive: false })
      document.addEventListener('touchend', endHandler)
    },

    onWheel (evt) {
      evt.preventDefault()

      this.wheelAccumulator += evt.deltaY

      if (this._wheelTimeout) clearTimeout(this._wheelTimeout)
      this._wheelTimeout = setTimeout(() => {
        this.wheelAccumulator = 0
      }, 200)

      if (Math.abs(this.wheelAccumulator) > 60) {
        const total = this.displayedCards.length
        if (this.wheelAccumulator > 0) {
          this.carouselIndex = (this.carouselIndex + 1) % total
        } else {
          this.carouselIndex = (this.carouselIndex - 1 + total) % total
        }
        this.wheelAccumulator = 0
      }
    },

    formatContractAddress (address) {
      if (!address) return ''
      const addr = typeof address === 'object' ? address.contractAddress : address
      if (!addr) return ''
      const str = String(addr)
      if (str.length <= 9) return str
      return str.slice(0, 16) + '...' + str.slice(-5)
    },

    goToCardDetails (card) {
      console.log('goToCardDetails called with card:', card)
      if (card && card.id) {
        console.log('Navigating to card-details with id:', card.id)
        this.$router.push({ name: 'card-details', params: {id: card.id} })
          .then(() => console.log('Navigation to card-details successful'))
          .catch(err => console.error('Navigation to card-details failed:', err))
      } else {
        console.warn('goToCardDetails: card or card.id is missing')
      }
    },

    closeDialog () {
      this.showCreateCardDialog = false
      this.newCardName = ''
      this.isMinting = false
    },

    async createCard () {
      if (!this.newCardName || !this.newCardName.trim()) {
        this.notifyError('Please enter a card name')
        return
      }

      // Show minting state
      this.isMinting = true

      // Simulate minting delay (2 seconds)
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Create new card with 0 balance
      const newCard = {
        id: Date.now(),
        name: this.newCardName.trim(),  // Add name property for display
        raw: { alias: this.newCardName.trim() },
        balance: '0.0000', // New card has 0 BCH balance
        status: 'Active',
        contractAddress: this.contractAddress || 'bitcoincash:qz6zvkmuawgkp9c0flg6n6pycxm2v4gksgxlqefvjw',
        // TODO: Replace with card_instance.raw.cash_address or card_instance.raw.token_address from Card class
        isLocked: false,
        cardReplacementStatus: 'none'
      }

      // Save to localStorage using CardStorage
      const createdCard = this.CardStorage.createCard(newCard);

      // Update the displayed cards
      this.subCards = this.CardStorage.getCards();

      // Reset dialog state
      this.closeDialog()

      // Show success notification
      this.$q.notify({
        message: 'Card created successfully!',
        color: 'positive',
        icon: 'check_circle',
        position: 'top',
        timeout: 1500
      })
    }
  }
}
</script>

<style lang="scss" scoped>
  @import "src/css/app-card.scss";
</style>
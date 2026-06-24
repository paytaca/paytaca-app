<template>
<div v-if="activeCard" class="full-width">
  <div class="settings-section q-mb-md">
  <div class="settings-list">
      <div class="settings-item">
        <div class="settings-item-content">
          <q-icon 
            :name="activeCard?.isLocked ? 'lock_open' : 'lock'" 
            :color="activeCard?.isLocked ? 'positive' : 'warning'"
            size="24px"
          />
          <div class="q-ml-md">
            <div 
              class="text-subtitle2"
              :class="textColor"
            >
              <!-- SKELETON LOADER for lock status: <q-skeleton v-if="loadingLockStatus" type="text" width="120px" /> -->
              {{ activeCard?.isLocked ? 'Unlock Card' : 'Temporary Lock Card' }}
            </div>
            <div 
              class="text-caption"
              :class="$q.dark.isActive ? 'text-grey-5' : 'text-grey'"
            >
              {{ activeCard?.isLocked ? 'Card is currently locked' : 'Temporarily disable all transactions' }}
            </div>
          </div>
        </div>
        <q-toggle 
          v-model="isLocked"
          color="warning"
          :disable="isLocking"
          @update:model-value="onCardLockToggle"
        />
        <!-- BACKEND: Disable toggle during API call -->
      </div>

      <q-separator color="primary" />

      <div class="settings-item">
        <div class="settings-item-content">
          <q-icon 
            name="notifications" 
            :color="activeCard?.isAlertsEnabled ? 'primary' : 'grey'"
            size="24px"
          />
          <div class="q-ml-md">
            <div class="text-subtitle2"
              :class="textColor">
              Transaction Alerts
            </div>
            <div 
              class="text-caption"
              :class="$q.dark.isActive ? 'text-grey-5' : 'text-grey'">
              Get notified for every transaction
            </div>
          </div>
        </div>
        <q-toggle 
          v-model="isAlertsEnabled"
          color="primary"
          @update:model-value="onAlertsToggle"
        />
      </div>

      <q-separator color="primary" />

      <div class="settings-item clickable" :class="{ 'cursor-not-allowed': hasCardBalance, 'opacity-50': hasCardBalance }" @click="handleCardReplacementToggle">
        <div class="settings-item-content">
          <q-icon name="autorenew" color="primary" size="24px" />
          <div class="q-ml-md">
            <div class="text-subtitle2" :class="textColor">Card Replacement</div>
            <div class="text-caption" :class="$q.dark.isActive ? 'text-grey-5' : 'text-grey'">Request a replacement card</div>
          </div>
        </div>
        <q-icon :name="showCardReplacement ? 'expand_less' : 'expand_more'" :color="$q.dark.isActive ? 'grey-5' : 'grey-7'" />
        <q-tooltip v-if="hasCardBalance && !showCardReplacement" anchor="top middle" self="bottom middle">Please sweep balance first before card replacement</q-tooltip>
      </div>

      <template v-if="showCardReplacement">
      <div class="q-pa-md full-width">
        <!-- PENDING: Request Under Review -->
        <div v-if="cardReplacementStatus === 'pending'" class="card-replacement-status text-center q-pa-xl">
          <q-icon name="schedule" size="80px" color="warning" class="q-mb-lg" />
          <div class="text-h5 text-weight-bold q-mb-md" :class="textColor">Request Under Review</div>
          <div class="text-subtitle1 q-mb-lg" :class="textColorGrey" style="max-width: 400px; margin: 0 auto;">We're reviewing your card replacement request. This typically takes 1-2 business days. You'll receive a notification once your request is approved.</div>
          <div class="q-mt-md">
            <q-btn flat :color="$q.dark.isActive ? 'grey-5' : 'grey-7'" icon="refresh" label="Simulate Progress (Testing)" @click="simulateStatusProgression" class="q-mr-sm" />
          </div>
        </div>

        <!-- PROCESSING: Card Being Produced -->
        <div v-else-if="cardReplacementStatus === 'processing'" class="card-replacement-status text-center q-pa-xl">
          <q-icon name="precision_manufacturing" size="80px" color="info" class="q-mb-lg" />
          <div class="text-h5 text-weight-bold q-mb-md" :class="textColor">Processing Your Card</div>
          <div class="text-subtitle1 q-mb-lg" :class="textColorGrey" style="max-width: 400px; margin: 0 auto;">We're now processing your card replacement request. Your new card is being produced and personalized. Expect to receive your card within 7-10 business days.</div>
          <div class="q-mt-md">
            <q-btn flat :color="$q.dark.isActive ? 'grey-5' : 'grey-7'" icon="refresh" label="Simulate Progress (Testing)" @click="simulateStatusProgression" class="q-mr-sm" />
          </div>
        </div>

        <!-- SHIPPED: Card on the Way -->
        <div v-else-if="cardReplacementStatus === 'shipped'" class="card-replacement-status text-center q-pa-xl">
          <q-icon name="local_shipping" size="80px" color="positive" class="q-mb-lg" />
          <div class="text-h5 text-weight-bold q-mb-md" :class="textColor">Your New Card is on the Way!</div>
          <div class="text-subtitle1 q-mb-lg" :class="textColorGrey" style="max-width: 400px; margin: 0 auto;">Welcome your new card! Your replacement card has been shipped and is on its way to you. You should receive it within 2-3 business days. Please activate it upon arrival.</div>
          <div class="q-mt-md">
            <q-btn flat :color="$q.dark.isActive ? 'grey-5' : 'grey-7'" icon="refresh" label="Simulate Progress (Testing)" @click="simulateStatusProgression" class="q-mr-sm" />
          </div>
        </div>

        <!-- Order Form -->
        <div v-else-if="showReplacementLocationForm" class="order-physical-card-form">
          <div class="row items-center justify-between q-mb-md" :class="bgColor" style="border-radius: 16px; padding: 16px;">
            <div class="text-subtitle1 text-bold text-primary">Update Shipping Details</div>
            <q-btn icon="close" flat round dense :color="$q.dark.isActive ? 'grey-4' : 'grey-7'" @click="resetReplacementFlow" />
          </div>
          <q-form @submit="handleCardReplacement" class="q-col-gutter-md">
            <q-input outlined dense v-model="orderPhysicalCardData.fullName" label="Full Name *" :dark="$q.dark.isActive" :rules="[val => !!val || 'Full name is required']" lazy-rules />
            <div class="row q-col-gutter-md">
              <div class="col-6"><q-input outlined dense v-model="orderPhysicalCardData.city" label="City *" :dark="$q.dark.isActive" :rules="[val => !!val || 'City is required']" lazy-rules /></div>
              <div class="col-6"><q-input outlined dense v-model="orderPhysicalCardData.state" label="State *" :dark="$q.dark.isActive" :rules="[val => !!val || 'State is required']" lazy-rules /></div>
              <div class="col-6"><q-input outlined dense v-model="orderPhysicalCardData.zip" label="Zip *" :dark="$q.dark.isActive" :rules="[val => !!val || 'Zip code is required']" lazy-rules /></div>
              <div class="col-6"><q-input outlined dense v-model="orderPhysicalCardData.country" label="Country *" :dark="$q.dark.isActive" :rules="[val => !!val || 'Country is required']" lazy-rules /></div>
            </div>
            <div class="text-caption q-mt-sm" :class="textColorGrey"><q-icon name="place" color="primary"/> Click or drag the marker to your location to auto-fill address fields.</div>
            <div ref="replacementMapContainer" class="q-mt-md order-form-map" style="height: 300px; width: 100%; border-radius: 8px; border: 1px solid;" :style="$q.dark.isActive ? 'border-color: #424242;' : 'border-color: #ddd;'"></div>
            <div class="row justify-center q-mt-lg q-gutter-md">
              <q-btn label="Back" :color="$q.dark.isActive ? 'grey-5' : 'grey-7'" class="q-px-xl" unelevated rounded @click="resetReplacementFlow" />
              <q-btn label="Replace Card" color="primary" class="q-px-xl" unelevated rounded type="submit" :disable="hasCardBalance" />
              <q-tooltip v-if="hasCardBalance" anchor="top middle" self="bottom middle">Please sweep all funds before replacing your card</q-tooltip>
            </div>
          </q-form>
        </div>

        <!-- Confirmation Screen -->
        <div v-else-if="locationSame !== null && !showReplacementLocationForm" class="card-replacement-confirm text-center q-pa-lg">
          <div class="text-h5 text-weight-bold q-mb-md" :class="textColor">Ready to Replace Your Card</div>
          <div class="text-subtitle1 q-mb-lg" :class="textColorGrey">Reason: <span class="text-capitalize">{{ replacementReason }}</span></div>
          <div class="text-caption q-mb-lg" :class="$q.dark.isActive ? 'text-grey-5' : 'text-grey'">Shipping to: {{ activeCard?.shippingAddress?.city || 'Original address on file' }}</div>
          <div class="row justify-center q-mt-lg q-gutter-md">
            <q-btn label="Go Back" flat :color="$q.dark.isActive ? 'grey-5' : 'grey-7'" class="q-px-xl" unelevated rounded @click="resetReplacementFlow" />
            <q-btn label="Confirm Replacement" color="primary" class="q-px-xl" unelevated rounded @click="confirmCardReplacement" :disable="hasCardBalance" />
            <q-tooltip v-if="hasCardBalance" anchor="top middle" self="bottom middle">Please sweep all funds before replacing your card</q-tooltip>
          </div>
        </div>

        <!-- Combined Questions (default view) -->
        <div v-else class="card-replacement-container text-center q-pa-lg">
          <div class="q-mb-xl">
            <div class="text-h5 text-weight-bold q-mb-md" :class="textColor">Why do you want to replace your card?</div>
            <div class="replacement-options q-gutter-sm">
              <q-btn v-for="option in replacementReasons" :key="option.value" :label="option.label" :outline="replacementReason !== option.value" :color="replacementReason === option.value ? 'primary' : ($q.dark.isActive ? 'grey-9' : 'grey-3')" text-color="primary" class="q-ma-sm" unelevated rounded :disable="hasCardBalance" @click="selectReplacementReason(option.value)" />
              <q-tooltip v-if="hasCardBalance" anchor="top middle" self="bottom middle">Please sweep all funds before replacing your card</q-tooltip>
            </div>
          </div>
          <div class="q-mb-xl" :class="{ 'disabled-section': !replacementReason }">
            <div class="text-h5 text-weight-bold q-mb-md" :class="textColor">Is your shipping location still the same?</div>
            <div class="location-options">
              <q-btn label="Yes, proceed" :disable="!replacementReason || hasCardBalance" :outline="locationSame !== true" :color="locationSame === true ? 'primary' : ($q.dark.isActive ? 'grey-9' : 'grey-3')" text-color="primary" class="q-ma-sm q-px-xl" unelevated rounded @click="handleLocationSame(true)" />
              <q-btn label="No, I need to update" :disable="!replacementReason || hasCardBalance" :outline="locationSame !== false" :color="locationSame === false ? 'primary' : ($q.dark.isActive ? 'grey-9' : 'grey-3')" text-color="primary" class="q-ma-sm q-px-xl" unelevated rounded @click="handleLocationSame(false)" />
              <q-tooltip v-if="hasCardBalance" anchor="top middle" self="bottom middle">Please sweep all funds before replacing your card</q-tooltip>
            </div>
          </div>
          <div v-if="replacementReason || locationSame !== null">
            <q-btn label="Reset" flat :color="$q.dark.isActive ? 'grey-5' : 'grey-7'" icon="refresh" @click="resetReplacementFlow" />
          </div>
        </div>
      </div>
      </template>

      <q-separator color="primary" />
    </div>
  </div>

  <div 
    class="settings-section q-mb-md"
  >
    <div class="settings-header q-pa-md">
      <div 
        class="text-subtitle1 text-weight-bold"
        :class="textColor"
      >
        Funds Management
      </div>
    </div>

    <q-separator color="primary" />

    <div class="settings-list">
      <div class="settings-item clickable" @click="showSweepFunds = !showSweepFunds">
        <div class="settings-item-content">
          <q-icon name="swap_horiz" color="info" size="24px" />
          <div class="q-ml-md">
            <div 
              class="text-subtitle2"
              :class="textColor"
            >
              Sweep Funds
            </div>
            <div 
              class="text-caption"
              :class="$q.dark.isActive ? 'text-grey-5' : 'text-grey'"
            >
              Transfer all funds back to wallet
            </div>
          </div>
        </div>
        <q-icon :name="showSweepFunds ? 'expand_less' : 'expand_more'" :color="$q.dark.isActive ? 'grey-5' : 'grey-7'" />
      </div>

      <template v-if="showSweepFunds">
        <div class="q-pa-md full-width">
          <div class="text-caption q-mb-md" :class="$q.dark.isActive ? 'text-grey-5' : 'text-grey'">
            This will transfer all funds ({{ activeCard?.balance || 0 }} BCH) from your card back to your wallet.
          </div>
          <div class="row justify-center">
            <q-btn
              label="Sweep Funds"
              color="info"
              class="q-px-xl"
              unelevated
              rounded
              :disable="!hasCardBalance"
              @click="showSweepFundsDialog = true"
            />
            <q-tooltip v-if="!hasCardBalance" anchor="top middle" self="bottom middle">
              No funds to sweep
            </q-tooltip>
          </div>
        </div>
      </template>
    </div>

    <q-dialog v-model="showSweepFundsDialog" persistent>
      <q-card style="min-width: 320px">
        <q-card-section>
          <div class="text-h6" :class="textColor">Sweep Funds</div>
        </q-card-section>
        <q-card-section class="q-pt-none">
          <div class="q-mb-md" :class="textColorGrey">
            This will transfer all funds ({{ activeCard?.balance || 0 }} BCH) from your card back to your wallet.
          </div>
          <div class="text-caption" :class="$q.dark.isActive ? 'text-grey-5' : 'text-grey'">
            Are you sure you want to sweep all funds?
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" color="primary" @click="showSweepFundsDialog = false" />
          <q-btn flat label="Sweep Funds" color="info" @click="handleSweepFunds" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>

  <div 
    class="settings-section"
  >
    <div class="settings-header q-pa-md">
      <div 
        class="text-subtitle1 text-weight-bold"
        :class="textColor"
      >
        Danger Zone
      </div>
    </div>

    <q-separator color="primary" />

    <div class="settings-list">
      <div 
        class="settings-item" 
        :class="{ 'clickable': !hasCardBalance, 'disabled-item': hasCardBalance }"
        @click="showDeleteCard = !showDeleteCard"
      >
        <div class="settings-item-content">
          <q-icon name="delete" :color="hasCardBalance ? 'grey-5' : 'negative'" size="24px" />
          <div class="q-ml-md">
            <div :class="hasCardBalance ? 'text-grey-5' : 'text-subtitle2 text-negative'">Delete Card</div>
            <div 
              class="text-caption"
              :class="$q.dark.isActive ? 'text-grey-5' : 'text-grey'"
            >
              Permanently remove this card
            </div>
          </div>
        </div>
        <q-icon :name="showDeleteCard ? 'expand_less' : 'expand_more'" :color="$q.dark.isActive ? 'grey-5' : 'grey-7'" />
        <q-tooltip v-if="hasCardBalance" anchor="top middle" self="bottom middle">
          Please sweep all funds before deleting your card
        </q-tooltip>
      </div>

      <template v-if="showDeleteCard">
        <div class="q-pa-md full-width">
          <div class="text-caption q-mb-md" :class="$q.dark.isActive ? 'text-grey-5' : 'text-grey'">
            Are you sure you want to delete this card? This action cannot be undone.
          </div>
          <div class="text-caption text-negative q-mb-md">
            Warning: Any remaining funds will be lost.
          </div>
          <div class="row justify-center">
            <q-btn
              label="Delete Card"
              color="negative"
              class="q-px-xl"
              unelevated
              rounded
              :disable="hasCardBalance"
              @click="showDeleteCardDialog = true"
            />
            <q-tooltip v-if="hasCardBalance" anchor="top middle" self="bottom middle">
              Please sweep all funds before deleting your card
            </q-tooltip>
          </div>
        </div>
      </template>
    </div>

    <q-dialog v-model="showDeleteCardDialog" persistent>
      <q-card style="min-width: 320px">
        <q-card-section>
          <div class="text-h6 text-negative">Delete Card</div>
        </q-card-section>
        <q-card-section class="q-pt-none">
          <div class="q-mb-md" :class="textColorGrey">
            Are you sure you want to delete this card? This action cannot be undone.
          </div>
          <div class="text-caption text-negative">
            Warning: Any remaining funds will be lost.
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" color="primary" @click="showDeleteCardDialog = false" />
          <q-btn flat label="Delete Card" color="negative" @click="handleDeleteCard" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>

</div>
</template>
<script>
import CardMixin from 'src/mixins/card/card-mixin';
import L from 'leaflet'
import { CardStorage } from 'src/components/card/createCard'

export default {
  name: 'CardSettings',
  mixins: [CardMixin],
  props: {
    activeCard: {
      type: Object,
      required: true
    },
  },
  data() {
    return {
      isLocked: this.activeCard?.isLocked || false,
      isAlertsEnabled: this.activeCard?.isAlertsEnabled || false,
      isLocking: false,
      replacementReason: null,
      locationSame: null,
      showReplacementLocationForm: false,
      cardReplacementStatus: 'none',
      showCardReplacement: false,
      showSweepFunds: false,
      showSweepFundsDialog: false,
      showDeleteCard: false,
      showDeleteCardDialog: false,
      cardBalance: 0,
      replacementMap: null,
      replacementMarker: null,
      orderPhysicalCardData: {
        fullName: '',
        city: '',
        state: '',
        zip: '',
        country: ''
      }
    }
  },
  computed: {
    hasCardBalance() {
      return parseFloat(this.cardBalance) > 0
    },
    replacementReasons () {
      return [
        { value: 'lost', label: 'Card Lost' },
        { value: 'stolen', label: 'Card Stolen' },
        { value: 'damaged', label: 'Card Damaged' },
        { value: 'fraud', label: 'Suspected Fraud' },
        { value: 'other', label: 'Other' }
      ]
    }
  },
  async mounted () {
    this.cardBalance = await this.activeCard?.getBchBalance() || 0
    this.loadCardReplacementStatus()
  },
  beforeUnmount () {
    this.destroyReplacementMap()
  },
  methods: {
    async onCardLockToggle(isLocked) {
      this.isLocking = true;
      try {
        // Call API to update lock status
        const card = await this.$store.dispatch('card/updateCardLockStatus', {
          cardId: this.activeCard.id,
          isLocked
        });
        console.log('Updated card lock status:', card);
        // Optionally show a success message
        this.$q.notify({
          type: 'positive',
          message: `Card has been ${isLocked ? 'locked' : 'unlocked'} successfully!`
        });
      } catch (error) {
        // Revert toggle state on error
        this.isLocked = !isLocked;
        // Show error message
        this.$q.notify({
          type: 'negative',
          message: `Failed to ${isLocked ? 'lock' : 'unlock'} the card. Please try again.`
        });
      } finally {
        this.isLocking = false;
      }
    },
    async onAlertsToggle(isAlertsEnabled) {
      try {
        // Call API to update alerts status
        await this.$store.dispatch('card/updateCardAlertsStatus', {
          cardId: this.activeCard.id,
          isAlertsEnabled
        });
        // Optionally show a success message
        this.$q.notify({
          type: 'positive',
          message: `Transaction alerts have been ${isAlertsEnabled ? 'enabled' : 'disabled'} successfully!`
        });
      } catch (error) {
        // Revert toggle state on error
        this.isAlertsEnabled = !isAlertsEnabled;
        // Show error message
        this.$q.notify({
          type: 'negative',
          message: `Failed to update transaction alerts. Please try again.`
        });
      }
    },
    async handleSweepFunds () {
      console.log('Initiating sweep funds process...')
      if (!this.activeCard) return

      this.$q.loading.show({
        message: 'Sweeping funds, please wait...',
        spinner: 'dots',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        delay: 200
      })

      const balance = parseFloat(await this.activeCard?.getBchBalance()) || 0
      
      if (balance <= 0) {
        this.$q.notify({
          message: 'No funds to sweep',
          color: 'warning',
          position: 'top',
          timeout: 1500
        })
        this.showSweepFundsDialog = false
        return
      }

      await this.activeCard.sweep({ broadcast: true }).then(result => {
        console.log('Sweep successful:', result)
        this.$q.notify({
          message: `Successfully swept ${balance} BCH to your wallet`,
          color: 'positive',
          icon: 'check_circle',
          position: 'top'
        })
      }).catch((error) => {
        console.error('Error sweeping funds:', error)
        this.$q.notify({
          message: 'Failed to sweep funds. Please try again.',
          color: 'negative',
          position: 'top',
          timeout: 2000
        })
      })

      this.$q.loading.hide()
      this.showSweepFundsDialog = false
    },
    handleDeleteCard () {
      if (!this.activeCard) return

      const deleted = CardStorage.deleteCard(this.activeCard.id)

      if (deleted) {
        this.$q.notify({
          message: 'Card has been deleted',
          color: 'positive',
          icon: 'delete',
          position: 'top',
          timeout: 2000
        })
      }

      this.showDeleteCardDialog = false
      this.$router.push({ name: 'card-list' })
    },
    handleCardReplacementToggle () {
      if (this.hasCardBalance && !this.showCardReplacement) return
      this.showCardReplacement = !this.showCardReplacement
    },
    selectReplacementReason (reason) {
      this.replacementReason = reason
    },

    handleLocationSame (same) {
      this.locationSame = same
      if (same) {
        this.loadShippingAddress()
      } else {
        this.showReplacementLocationForm = true
        this.$nextTick(() => {
          this.initReplacementMap()
        })
      }
    },

    loadShippingAddress () {
      if (this.activeCard?.shippingAddress) {
        this.orderPhysicalCardData = {
          fullName: this.activeCard.shippingAddress.fullName || '',
          city: this.activeCard.shippingAddress.city || '',
          state: this.activeCard.shippingAddress.state || '',
          zip: this.activeCard.shippingAddress.zip || '',
          country: this.activeCard.shippingAddress.country || ''
        }
      }
    },

    resetReplacementFlow () {
      this.replacementReason = null
      this.locationSame = null
      this.showReplacementLocationForm = false
      this.cardReplacementStatus = 'none'
      this.destroyReplacementMap()
      this.orderPhysicalCardData = {
        fullName: '',
        city: '',
        state: '',
        zip: '',
        country: ''
      }
      this.saveCardReplacementStatus()
    },

    initReplacementMap () {
      if (!this.$refs.replacementMapContainer) return

      if (this.replacementMap) {
        this.replacementMap.remove()
      }

      this.replacementMap = L.map(this.$refs.replacementMapContainer).setView([7.123, 124.845], 13)

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(this.replacementMap)

      this.replacementMarker = L.marker([7.123, 124.845], {draggable: true}).addTo(this.replacementMap)

      this.replacementMarker.on('dragend', (event) => {
        const { lat, lng } = event.target.getLatLng()
        this.reverseGeocodeReplacement(lat, lng)
      })

      this.replacementMap.on('click', (e) => {
        const { lat, lng } = e.latlng
        this.replacementMarker.setLatLng([lat, lng])
        this.reverseGeocodeReplacement(lat, lng)
      })
    },

    async reverseGeocodeReplacement (lat, lng) {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`
        )
        const data = await response.json()
        const addr = data.address

        this.orderPhysicalCardData = {
          ...this.orderPhysicalCardData,
          city: addr.city || addr.town || addr.village || addr.municipality || addr.county || '',
          state: addr.state || addr.region || addr.province || '',
          zip: addr.zip || addr.postcode || '',
          country: addr.country || '',
        }
        
        this.$q.notify({
          message: `Location set to ${this.orderPhysicalCardData.city || this.orderPhysicalCardData.state || 'Unknown'}`,
          icon: 'check', 
          color: 'positive',
          timeout: 1500
        })
      }
      catch (error) {
        this.$q.notify({ type: 'negative', message: 'Geocoding failed' })
      }
    },

    destroyReplacementMap () {
      if (this.replacementMap) {
        this.replacementMap.remove()
        this.replacementMap = null
        this.replacementMarker = null
      }
    },

    handleCardReplacement () {
      this.saveShippingAddress()
      this.confirmCardReplacement()
    },

    saveShippingAddress () {
      if (this.activeCard) {
        const updatedCard = CardStorage.setCardProperty(this.activeCard.id, 'shippingAddress', { ...this.orderPhysicalCardData })
        if (updatedCard) {
          this.activeCard.shippingAddress = updatedCard.shippingAddress
        }
      }
    },

    confirmCardReplacement () {
      this.notifySuccess('Card replacement order submitted successfully!', { icon: 'check_circle' })
      this.cardReplacementStatus = 'pending'
      this.saveCardReplacementStatus()
      this.$router.push({ name: 'app-card' })
    },

    saveCardReplacementStatus () {
      if (this.activeCard) {
        const updatedCard = CardStorage.setCardProperty(this.activeCard.id, 'cardReplacementStatus', this.cardReplacementStatus)
        if (updatedCard) {
          this.activeCard.cardReplacementStatus = updatedCard.cardReplacementStatus
        }
      }
    },

    loadCardReplacementStatus () {
      if (this.activeCard?.cardReplacementStatus) {
        this.cardReplacementStatus = this.activeCard.cardReplacementStatus
      }
    },

    simulateStatusProgression () {
      const statusFlow = { 'pending': 'processing', 'processing': 'shipped', 'shipped': 'none' }
      const nextStatus = statusFlow[this.cardReplacementStatus] || 'none'
      this.cardReplacementStatus = nextStatus
      this.saveCardReplacementStatus()
      this.$q.notify({
        message: `Status updated to: ${nextStatus}`,
        color: 'info',
        icon: 'update',
        timeout: 1500
      })
    },

    saveCardSettings() {
      // Emit event to save other card settings like transaction alerts
      this.$emit('save-card-settings', this.activeCard);
    }
  }
}
</script>
<style lang="scss" scoped>
  @import "src/css/app-card.scss";
</style>
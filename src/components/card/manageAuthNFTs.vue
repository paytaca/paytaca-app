<template>
  <div class="full-width">
    <!-- Location Info - clickable to open map popup -->
    <GeolocateBtn silent-on-error silent-on-deny @geolocate="onGeolocated" @denied="onLocationDenied">
      <template #default="{ attemptGeolocate }">
        <div
          v-if="userLocation"
          class="row items-center q-mb-md q-px-sm cursor-pointer location-info"
          :class="$q.dark.isActive ? 'text-grey-4' : 'text-grey-7'"
          @click="() => attemptGeolocate().catch(console.error).then(() => openLocationMapDialog())"
        >
          <q-icon name="location_on" size="1.2rem" class="q-mr-xs" color="primary" />
          <span class="text-caption ellipsis">
            {{ fullUserLocation || 'Using current location' }}
          </span>
          <q-icon name="edit" size="0.9rem" class="q-ml-xs" color="primary" />
          <q-tooltip>Click to update your location</q-tooltip>
        </div>
        <div
          v-else
          class="row items-center q-mb-md q-px-sm cursor-pointer location-info"
          :class="$q.dark.isActive ? 'text-grey-5' : 'text-grey'"
          @click="() => attemptGeolocate().catch(console.error).then(() => openLocationMapDialog())"
        >
          <q-icon name="location_off" size="1.2rem" class="q-mr-xs" />
          <span class="text-caption">Detecting your location... (click to set manually)</span>
          <q-icon name="edit" size="0.9rem" class="q-ml-xs" />
          <q-tooltip>Click to set your location</q-tooltip>
        </div>
      </template>
    </GeolocateBtn>

    <!-- Distance Filter -->
    <div 
      class="row items-center q-mb-md q-px-sm text-caption cursor-pointer"
      :class="$q.dark.isActive ? 'text-grey-4' : 'text-black'"
      @click="openDistanceDialog"
    >
      <span class="text-weight-medium">Proximity</span>
      <q-icon name="near_me" size="1rem" class="q-mx-xs" color="primary" />
      <span class="text-weight-bold">{{ radius }} km</span>
    </div>

    <!-- Search bar and Select Multiple Toggle -->
    <div class="row items-center q-mb-md q-gutter-x-sm">
      <div class="col">
        <q-input 
          v-model="search" 
          placeholder="Search merchants..." 
          dense
          borderless
          input-class="search-input-field"
          :dark="$q.dark.isActive"
          clearable
          class="search-input-wrapper"
        >
          <template v-slot:prepend>
            <q-icon name="search" size="1.1rem" color="primary" />
          </template>
        </q-input>
      </div>
      <q-btn
        v-if="merchants.some(m => m.isEnabled)"
        :color="selectMultipleMode ? 'secondary' : 'primary'"
        :icon="selectMultipleMode ? 'checklist' : 'checklist_rtl'"
        dense
        unelevated
        round
        @click="toggleSelectMultipleMode"
      >
        <q-tooltip>{{ selectMultipleMode ? 'Done selecting' : 'Select multiple' }}</q-tooltip>
      </q-btn>
    </div>

    <!-- Batch Action Bar (shown when in select multiple mode and items selected) -->
    <div 
      v-if="selectMultipleMode && selectedMerchants.size > 0"
      class="row items-center justify-between q-pa-md br-10 q-mb-md manage-auth-batch-bar"
      :class="$q.dark.isActive ? 'glassmorphic-batch-bar-dark' : 'glassmorphic-batch-bar-light'"
    >
      <div class="row items-center q-gutter-x-sm">
        <q-checkbox 
          v-model="allSelected" 
          :dark="$q.dark.isActive"
          @update:model-value="toggleSelectAll"
          color="primary"
        />
        <span class="text-subtitle2 text-weight-medium" :class="textColor">
          {{ selectedMerchants.size }} selected
        </span>
      </div>
      <q-btn
        color="primary"
        icon="token"
        label="Mint Selected"
        dense
        no-caps
        unelevated
        :loading="batchMinting"
        @click="mintSelectedMerchants"
        class="manage-auth-btn"
      />
    </div>

    <!-- Generic Auth NFT Toggle -->
    <div 
      class="row items-center justify-between q-pa-md br-10 q-mb-md manage-auth-generic-toggle"
      :class="$q.dark.isActive ? 'glassmorphic-generic-toggle-dark' : 'glassmorphic-generic-toggle-light'"
    >
      <div class="text-subtitle2 text-weight-bold text-primary">{{ $t('AllowAllMerchantsDialogTitle') }}</div>
      <q-toggle 
        :model-value="genericAuthEnabled"
        color="primary"
        @update:model-value="onGenericAuthToggle"
      />
    </div>

    <!-- Global Spend Limit Display (shown when Generic Auth NFT is enabled) -->
    <div 
      v-if="genericAuthEnabled"
      class="q-pa-md br-10 q-mb-md"
      :class="$q.dark.isActive ? 'glassmorphic-dark' : 'glassmorphic-light'"
    >
      <div class="row items-center q-mb-sm q-gutter-x-sm">
        <q-icon name="savings" color="primary" size="1.1rem" />
        <div class="text-subtitle2 text-weight-bold" :class="$q.dark.isActive ? 'text-primary' : 'text-primary'">{{ $t('GlobalSpendLimit') }}</div>
      </div>
      <div class="row items-center">
        <div class="text-body2" :class="textColor">
          <span class="text-weight-bold">{{ formatSpendLimit(GLOBAL_SPEND_LIMIT_BCH) }} BCH</span>
          <span class="text-caption q-ml-sm" :class="$q.dark.isActive ? 'text-grey-5' : 'text-grey-7'">(~500 PHP)</span>
        </div>
      </div>
      <div class="text-caption q-mt-xs" :class="$q.dark.isActive ? 'text-grey-5' : 'text-grey-7'">
        {{ $t('GlobalSpendLimitDescription') }}
      </div>
    </div>

    <q-separator class="q-mb-sm" :dark="$q.dark.isActive" />

    <!-- Merchants List -->
    <div class="text-subtitle2 q-mb-sm" :class="textColor">
      Nearby Merchants
      <span v-if="merchants.length > 0" class="text-caption text-grey">
        ({{ filteredMerchants.length }})
      </span>
    </div>
    
    <div 
      ref="merchantListContainer"
      class="scroll manage-auth-merchant-list" 
      style="height: 350px; overflow-y: auto;"
      @scroll="handleScroll"
    >
      <!-- Loading State -->
      <div v-if="loading && merchants.length === 0" class="q-pa-md">
        <q-item v-for="n in 3" :key="n" class="q-px-none q-py-sm">
          <q-item-section>
            <q-skeleton type="text" width="150px" class="q-mb-xs" />
            <q-skeleton type="text" width="200px" height="12px" />
          </q-item-section>
          <q-item-section side><q-skeleton type="QToggle" /></q-item-section>
        </q-item>Generic
      </div>

      <!-- Empty State - No Location -->
      <div 
        v-else-if="!userLocationValid" 
        class="text-center q-pa-xl" 
        :class="$q.dark.isActive ? 'text-grey-5' : 'text-grey'"
      >
        <q-icon name="location_off" size="48px" class="q-mb-md" />
        <div>Waiting for GPS location...</div>
        <div class="text-caption q-mt-sm">
          Please enable location services
        </div>
      </div>

      <!-- Empty State - No Merchants -->
      <div 
        v-else-if="filteredMerchants.length === 0 && !loading" 
        class="text-center q-pa-xl" 
        :class="$q.dark.isActive ? 'text-grey-5' : 'text-grey'"
      >
        <q-icon name="storefront" size="48px" class="q-mb-md" />
        <div>No merchants found in your city</div>
        <div class="text-caption q-mt-sm">
          Try changing your location to find merchants in other areas
        </div>
      </div>

      <!-- Merchant List -->
      <div v-else-if="filteredMerchants.length > 0">
        <q-list separator :dark="$q.dark.isActive">
          <q-item 
            v-for="merchant in filteredMerchants" 
            :key="merchant.id" 
            class="q-px-none manage-auth-merchant-item"
            :class="{ 
              'disabled-merchant': genericAuthEnabled,
              'clickable-merchant': merchant.isEnabled && !genericAuthEnabled && !selectMultipleMode,
              'glassmorphic-selected-item-light': selectMultipleMode && selectedMerchants.has(merchant.id) && !$q.dark.isActive,
              'glassmorphic-selected-item-dark': selectMultipleMode && selectedMerchants.has(merchant.id) && $q.dark.isActive
            }"
            :clickable="merchant.isEnabled && !genericAuthEnabled && !selectMultipleMode"
            @click="handleMerchantClick(merchant)"
          >
            <!-- Checkbox for select multiple mode -->
            <q-item-section v-if="selectMultipleMode" side class="q-pr-sm">
              <q-checkbox 
                :model-value="selectedMerchants.has(merchant.id)"
                :dark="$q.dark.isActive"
                @update:model-value="(val) => toggleMerchantSelection(merchant, val)"
              />
            </q-item-section>
            
            <q-item-section>
              <q-tooltip 
                v-if="merchant.isEnabled && !genericAuthEnabled && merchant.spendLimit && !selectMultipleMode" 
                anchor="top middle" 
                self="bottom middle"
              >
                Spend Limit: {{ formatSpendLimit(merchant.spendLimit) }} BCH
              </q-tooltip>
              <div 
                class="text-weight-bold"
                :class="merchant.isEnabled ? textColor : ($q.dark.isActive ? 'text-grey-6' : 'text-grey-7')"
              >
                {{ merchant.name }}
                <span 
                  v-if="merchant.isEnabled && !genericAuthEnabled && merchant.spendLimit && !selectMultipleMode" 
                  class="text-caption text-secondary q-ml-xs"
                >
                  ({{ formatSpendLimit(merchant.spendLimit) }} BCH)
                </span>
              </div>
            </q-item-section>
            <q-item-section side>
              <div class="row items-center q-gutter-x-sm">
                <!-- Loading spinner when minting -->
                <q-spinner
                  v-if="mintingMerchants.has(merchant.id)"
                  color="primary"
                  size="1.2rem"
                />
                <!-- Success message when minting done -->
                <span
                  v-else-if="mintedMerchants.has(merchant.id)"
                  class="text-positive text-caption"
                >
                  minting done
                </span>
                <!-- Toggle (hidden in select multiple mode) -->
                <q-toggle 
                  v-if="!selectMultipleMode"
                  v-model="merchant.isEnabled"
                  :disable="genericAuthEnabled || mintingMerchants.has(merchant.id)"
                  :color="genericAuthEnabled 
                    ? ($q.dark.isActive ? 'grey-6' : 'grey-5') 
                    : 'primary'"
                  @update:model-value="(val) => onMerchantToggle(merchant, val)"
                />
              </div>
            </q-item-section>
          </q-item>
        </q-list>

        <!-- Loading More Indicator -->
        <div v-if="loadingMore" class="text-center q-pa-md">
          <q-spinner color="primary" size="2rem" />
          <div class="text-caption q-mt-sm" :class="textColorGrey">Loading more merchants...</div>
        </div>

        <!-- No More Results -->
        <div 
          v-else-if="!merchantsPagination.hasMore && filteredMerchants.length > 0" 
          class="text-center q-pa-md text-caption"
          :class="$q.dark.isActive ? 'text-grey-6' : 'text-grey'"
        >
          No more merchants
        </div>
      </div>
    </div>

    <!-- Status message -->
    <div 
      class="text-caption q-mt-sm text-center"
      :class="$q.dark.isActive ? 'text-grey-5' : 'text-grey'"
    >
      {{ genericAuthEnabled ? 'Generic Auth NFT is enabled - all merchants are authorized' : 'Select specific merchants to authorize' }}
    </div>

    <!-- Allow All Merchants Confirmation Dialog -->
    <q-dialog v-model="showAllowAllMerchantsDialog" persistent>
      <q-card style="min-width: 320px">
        <q-card-section>
          <div class="text-h6" :class="textColor">
            {{ $t('AllowAllMerchantsDialogTitle') }}
          </div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <div :class="textColor">
            {{ $t('AllowAllMerchantsDialogMessage', { amount: formatSpendLimit(GLOBAL_SPEND_LIMIT_BCH) }) }}
          </div>
          <div class="q-mt-md text-caption" :class="$q.dark.isActive ? 'text-grey-4' : 'text-grey-7'">
            {{ $t('AllowAllMerchantsDialogSubtext') }}
          </div>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat :label="$t('AllowAllMerchantsCancel')" color="primary" @click="cancelAllowAllMerchants" />
          <q-btn flat :label="$t('AllowAllMerchantsEnable')" color="primary" @click="confirmAllowAllMerchants" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Spend Limit Dialog -->
    <q-dialog v-model="showSpendLimitDialog" persistent>
      <q-card style="min-width: 320px">
        <q-card-section>
          <div class="text-h6" :class="textColor">
            Set Spend Limit
          </div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <div 
            class="q-mb-sm"
            :class="textColor"
          >
            Merchant: <span class="text-weight-bold">{{ selectedMerchant?.name }}</span>
          </div>
          <div 
            class="q-mb-md text-caption"
            :class="$q.dark.isActive ? 'text-grey-4' : 'text-grey'"
          >
            Available Balance: {{ formatBalance(card?.balance) }} BCH
          </div>
          <q-input
            v-model="spendLimitInput"
            type="number"
            filled
            :dark="$q.dark.isActive"
            label="Spend Limit (BCH)"
            step="0.00000001"
            min="0"
            :error="!!spendLimitError"
            :error-message="spendLimitError"
            lazy-rules
          />
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancel" color="primary" @click="closeSpendLimitDialog" />
          <q-btn flat label="Save" color="primary" @click="saveSpendLimit" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Location Map Dialog -->
    <q-dialog v-model="showLocationMapDialog" persistent maximized>
      <q-card :class="$q.dark.isActive ? 'bg-dark' : 'bg-white'">
        <q-card-section class="row items-center justify-between q-pa-sm">
          <div class="text-h6" :class="textColor">
            <q-icon name="location_on" color="primary" class="q-mr-sm" />
            Update Your Location
          </div>
          <q-btn icon="close" flat round dense v-close-popup :color="$q.dark.isActive ? 'grey-4' : 'grey-7'" />
        </q-card-section>

        <q-card-section class="q-pa-none" style="height: calc(100vh - 140px);">
          <div ref="locationMap" class="full-width full-height"></div>
          
          <!-- Location Search Input -->
          <div class="absolute-top q-pa-md" style="z-index: 1000;">
            <q-input
              v-model="locationSearchQuery"
              filled
              :dark="$q.dark.isActive"
              placeholder="Search location..."
              class="location-search"
              @keyup.enter="searchLocation"
            >
              <template v-slot:append>
                <q-btn round dense flat icon="search" color="primary" @click="searchLocation" />
              </template>
            </q-input>
          </div>
        </q-card-section>

        <q-card-section class="q-pa-md">
          <div class="row items-center justify-between">
            <div :class="textColorGrey" class="text-caption">
              <q-icon name="info" size="1rem" class="q-mr-xs" />
              Drag the marker or click on the map to set your location
            </div>
            <q-btn 
              color="primary" 
              icon="check" 
              label="Confirm Location" 
              unelevated
              style="border-radius: 24px"
              @click="confirmLocationUpdate"
            />
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>

  </div>
</template>

<script>
import { createCardLogic, CardStorage } from './createCard.js'
import { getMerchantList, getMerchantsByCity } from 'src/services/card/merchants'
import { geolocationManager } from 'src/boot/geolocation'
import GeolocateBtn from 'src/components/GeolocateBtn.vue'
import PinLocationDialog from 'src/components/PinLocationDialog.vue';
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils.js';
import { markRaw } from 'vue';
import { init } from 'src/store/wizardconnect/actions.js';
import { backend } from 'src/exchange/backend.js';
import { backend as cardBackend } from 'src/services/card/backend.js';

export default {
  name: 'ManageAuthNFTs',
  mixins: [createCardLogic],
  components: { GeolocateBtn },
  props: {
    card: { type: Object, required: true }
  },
  data() {
    return {
      search: '',
      genericAuthEnabled: false,
      // Hardcoded global spend limit: ~500 PHP worth of BCH (approximately 0.0017 BCH)
      GLOBAL_SPEND_LIMIT_BCH: '0.0017',
      merchants: [],
      showAllowAllMerchantsDialog: false,
      showSpendLimitDialog: false,
      showLocationMapDialog: false,
      selectedMerchant: null,
      spendLimitInput: '1',
      spendLimitError: '',
      loading: false,
      loadingMore: false,
      mintingMerchants: new Set(), // Track merchants currently being minted
      mintedMerchants: new Set(), // Track merchants that just finished minting
      merchantsPagination: {
        count: 0,
        limit: 50, // Load 50 merchants per request to ensure enough after filtering
        offset: 0,
        hasMore: false
      },
      radius: 10, // Default search radius in km - user can adjust this
      selectMultipleMode: false, // Toggle for select multiple mode
      selectedMerchants: new Set(), // Track selected merchants in batch mode
      batchMinting: false, // Track batch minting state
      // Location map
      locationMap: null,
      locationMarker: null,
      mapCoordinates: { lat: null, lng: null },
      locationSearchQuery: '',
      // Local display location - updates immediately when user changes location
      displayLocation: null,
      // Debounce timer for saving merchants
      saveDebounceTimer: null,
      // Flag to prevent saving during initialization
      isInitializing: false,
      lastGeolocatePosition: null,
      darkMode: this.$store.getters['darkmode/getStatus'],
    }
  },
  computed: {
    userLocation() {
      return this.$store.getters['card/userLocation']
    },
    fullUserLocation() {
      const loc = this.userLocation
      if (!loc) return null
      const parts = [loc.formatted, loc.street, loc.city, loc.country].filter(Boolean)
      return parts.join(', ')
    },
    userLocationValid() {
      const coords = this.userLocation
      return Number.isFinite(coords?.latitude) && Number.isFinite(coords?.longitude)
    },
    filteredMerchants() {
      let list = [...this.merchants];
      if (this.search) {
        const s = this.search.toLowerCase();
        list = list.filter(m => m.name.toLowerCase().includes(s));
      }
      return list;
    },
    textColor() {
      return this.$q.dark.isActive ? 'text-white' : 'text-grey-10'
    },
    textColorGrey() {
      return this.$q.dark.isActive ? 'text-grey-4' : 'text-grey-7'
    },
    allSelected: {
      get() {
        return this.filteredMerchants.length > 0 && this.filteredMerchants.every(m => this.selectedMerchants.has(m.id))
      },
      set(val) {
        this.toggleSelectAll(val)
      }
    },
    mapUid() {
      return `leaflet-map-${this.$.uid}`
    }
  },
  async mounted() {
    console.log('ManageAuthNFTs MOUNTED, card:', this.card)
    await geolocationManager.getOrUpdateGeoIp()
    const geoip = geolocationManager.geoip.value
    if (geoip?.latitude && geoip?.longitude && !this.userLocation) {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${geoip.latitude}&lon=${geoip.longitude}`
        )
        const data = await response.json()
        const address = data?.address || {}
        this.$store.commit('card/setUserLocation', {
          latitude: geoip.latitude,
          longitude: geoip.longitude,
          formatted: data.display_name || '',
          location: address.suburb || address.city_district || address.town || '',
          landmark: address.suburb || '',
          street: address.road || address.street || '',
          city: address.city || address.town || address.village || address.county || '',
          country: address.country || ''
        })
      } catch (error) {
        console.error('Reverse geocoding on mount failed:', error)
      }
    }
    this.loadMerchantList()
  },

  methods: {
    // Initialize component - called on mount and when card changes
    getDarkModeClass,
    async initializeComponent() {
      this.isInitializing = true
      
      // Reset state first
      this.merchants = []
      this.displayLocation = null
      
      // Load saved data for this card
      console.log('Loading saved location...')
      this.loadSavedLocation()
      console.log('After loadSavedLocation, displayLocation:', this.displayLocation)
      
      console.log('Loading saved radius...')
      const oldRadius = this.radius
      this.loadSavedRadius()
      console.log('After loadSavedRadius, radius changed from', oldRadius, 'to', this.radius)
      
      // // Initialize display location from store if no saved location
      // if (!this.displayLocation) {
      //   const storeLocation = this.$store.getters['marketplace/sessionLocation']
      //   console.log('Store location:', storeLocation)
      //   if (storeLocation) {
      //     this.displayLocation = { ...storeLocation }
      //     console.log('Set displayLocation from store')
      //   }
      // }
      
      // Load saved merchants from card storage
      console.log('Loading saved merchants...')
      this.loadSavedMerchants()
      console.log('After loadSavedMerchants, merchants count:', this.merchants.length)
      
      // Load merchants if we have no saved merchants or they're expired
      if (this.merchants.length === 0) {
        console.log('No saved merchants, loading from API...')
        await this.loadMerchantList({ reset: true })
        // Save merchants after loading
        this.saveMerchantsToCard()
      }
      
      // Load merchant spend limits from card if available
      if (this.card && this.card.merchantSpendLimits) {
        this.merchants.forEach(merchant => {
          if (this.card.merchantSpendLimits[merchant.id]) {
            merchant.spendLimit = this.card.merchantSpendLimits[merchant.id];
          }
        });
      }
      
      // Mark initialization complete
      this.$nextTick(() => {
        this.isInitializing = false
        console.log('Initialization complete. Location:', this.displayLocation?.formatted?.substring(0, 50), 'Radius:', this.radius, 'Merchants:', this.merchants.length)
      })
    },

    async getInitialSelectCoordinatePosition() {
      const initLocation = { 
        latitude: this.userLocation?.latitude || null, 
        longitude: this.userLocation?.longitude || null, 
        zoom: 18 
      }

      if (initLocation.latitude && initLocation.longitude) {
        return initLocation
      }

      // Use position from GeolocateBtn if available (set when user clicks the location area)
      const geolocated = this.lastGeolocatePosition
      if (geolocated?.latitude && geolocated?.longitude) {
        return { latitude: geolocated.latitude, longitude: geolocated.longitude, zoom: 16 }
      }

      // Fall back to GeoIP
      const geoip = geolocationManager.geoip.value
      if (geoip?.latitude && geoip?.longitude) {
        initLocation.latitude = geoip.latitude
        initLocation.longitude = geoip.longitude
        initLocation.zoom = 11
      }

      return initLocation
    },

    async onGeolocated(position) {
      const coords = position?.coords
      if (!coords) return

      this.lastGeolocatePosition = coords
      console.log('onGeolocated fired:', coords.latitude, coords.longitude)

      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${coords.latitude}&lon=${coords.longitude}`
        )
        const data = await response.json()
        const address = data?.address || {}
        console.log('Reverse geocode result:', data.display_name)
        this.$store.commit('card/setUserLocation', {
          latitude: coords.latitude,
          longitude: coords.longitude,
          formatted: data.display_name || '',
          location: address.suburb || address.city_district || address.town || '',
          landmark: address.suburb || '',
          street: address.road || address.street || '',
          city: address.city || address.town || address.village || address.county || '',
          country: address.country || ''
        })
      } catch (error) {
        console.error('Reverse geocoding failed:', error)
      }
    },

    onLocationDenied() {
      this.$q.notify({
        message: this.$t('EnableLocationInBrowser', {}, 'Location access is blocked. To allow it, go to your browser\'s site settings and enable location access for this site.'),
        caption: this.$t('UsingApproximateLocation', {}, 'Showing approximate location based on your IP address'),
        icon: 'location_disabled',
        color: 'warning',
        position: 'top',
        textColor: 'black',
        timeout: 6000,
      })
    },

    // Location Map Methods
    async openLocationMapDialog(opts={ autoFocusSearch: false }) {
      const initLocation = await this.getInitialSelectCoordinatePosition();
      this.$q.dialog({
        component: PinLocationDialog,
        componentProps: {
          disableGeolocate: true,
          rounded: true,
          search: {
            enable: true,
            autofocus: opts?.autoFocusSearch,
            forceResults: true,
          },
          initLocation: initLocation,
        }
      }) .onOk(async coordinates => {
        const userLocationComponents = { ...this.userLocation } || {}
        userLocationComponents.longitude = coordinates.lng
        userLocationComponents.latitude = coordinates.lat

        if (coordinates?.components) {
          const components = coordinates.components
          userLocationComponents.location = components.address1
          userLocationComponents.landmark = components.address2
          userLocationComponents.street = components.street
          userLocationComponents.city = components.city
          userLocationComponents.country = components.country
          this.$store.commit('card/setUserLocation', userLocationComponents)
          this.radius = 10
          this.saveRadius()
          this.loadMerchantList({ reset: true, location: { latitude: coordinates.lat, longitude: coordinates.lng } }).then(() => this.saveMerchantsToCard())
          return
        }

        // No components — reverse geocode to get location name
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${coordinates.lat}&lon=${coordinates.lng}`
          )
          const data = await response.json()
          const address = data?.address || {}
          userLocationComponents.formatted = data.display_name || ''
          userLocationComponents.location = address.suburb || address.city_district || address.town || ''
          userLocationComponents.landmark = address.suburb || ''
          userLocationComponents.street = address.road || address.street || ''
          userLocationComponents.city = address.city || address.town || address.village || address.county || ''
          userLocationComponents.country = address.country || ''
        } catch (error) {
          console.error('Reverse geocoding failed:', error)
          userLocationComponents.formatted = `${coordinates.lat}, ${coordinates.lng}`
        }
        this.$store.commit('card/setUserLocation', userLocationComponents)
        this.radius = 10
        this.saveRadius()
        this.loadMerchantList({ reset: true, location: { latitude: coordinates.lat, longitude: coordinates.lng } }).then(() => this.saveMerchantsToCard())
      })
    },

    async getMerchantsByCity(city, opts = {}) {
      if (!city) {
        this.showFailedToLoadMerchants()
        return
      }
      await cardBackend.get(`/merchants/by-city/${city}`, { 
        params: { limit: opts.limit, page: opts.offset }
      }).then(res => {
        console.log('Merchants by city response:', res.data)
          return res.data.results || []
        }).catch(err => {
          console.error(err.response || err)
          this.showFailedToLoadMerchants()
        })
    },

    showFailedToLoadMerchants() {
      this.$q.notify({
        message: 'Failed to load merchants near your location',
        color: 'red',
        icon: 'error',
        timeout: 4000,
      })
    },

    async loadMerchantList(opts = {}) {
      // Use provided coordinates or fall back to store
      const locationCoords = opts.location || this.userLocation
      console.log('locationCoords for loadMerchantList:', locationCoords)      
      if (!locationCoords || !Number.isFinite(locationCoords.latitude) || !Number.isFinite(locationCoords.longitude)) {
        this.loading = false
        return
      }

      const isReset = opts.reset || false
      
      if (isReset) {
        this.merchants = []
        this.merchantsPagination = {
          count: 0,
          limit: 50,
          offset: 0,
          hasMore: false
        }
      }

      // Don't load more if already loading or no more results
      // if (this.loading || this.loadingMore) return
      // if (!isReset && !this.merchantsPagination.hasMore) return

      if (isReset) {
        this.loading = true
      } else {
        this.loadingMore = true
      }

      try {
        const params = {
          limit: this.merchantsPagination.limit,
          offset: this.merchantsPagination.offset,
          // location: locationCoords,
          // radius: this.radius
        }

        const response = await getMerchantsByCity(locationCoords.city, params)
        console.log('getMerchantsByCity:', response)
        
        // Map new merchants with UI state
        const newMerchants = response.results.map(merchant => ({
          ...merchant,
          isEnabled: false,
          wasEnabledBeforeGeneric: false,
          spendLimit: null
        }))

        // Merge with existing merchants
        if (isReset) {
          this.merchants = newMerchants
        } else {
          // Avoid duplicates
          const existingIds = new Set(this.merchants.map(m => m.id))
          const uniqueNewMerchants = newMerchants.filter(m => !existingIds.has(m.id))
          this.merchants = [...this.merchants, ...uniqueNewMerchants]
        }

        // Update pagination - use the filtered count
        this.merchantsPagination = {
          count: response.count,
          limit: response.limit,
          offset: response.offset + response.results.length,
          hasMore: response.hasMore
        }

        console.log(`Loaded ${newMerchants.length} merchants. Total displayed: ${this.merchants.length}/${response.count}`)
      } catch (error) {
        console.error('Failed to load merchant list:', error);
        this.notifyError('Failed to load merchants near your location');
      } finally {
        this.loading = false
        this.loadingMore = false
      }
    },

    handleScroll(evt) {
      const container = evt.target
      const scrollBottom = container.scrollTop + container.clientHeight
      const threshold = container.scrollHeight - 100 // 100px before bottom

      if (scrollBottom >= threshold && !this.loading && !this.loadingMore && this.merchantsPagination.hasMore) {
        this.loadMerchantList()
      }
    },

    openDistanceDialog() {
      this.$q.dialog({
        title: 'Search Radius',
        message: 'Find merchants within this distance from your location',
        class: this.$q.dark.isActive ? '' : 'bg-white text-black',
        prompt: {
          model: this.radius,
          type: 'number',
          suffix: 'km',
          isValid: val => val > 0 && val <= 500
        }
      })
      .onOk(data => {
        const newRadius = parseFloat(data)
        if (newRadius > 0 && newRadius <= 500) {
          this.radius = newRadius
          // Save radius to card storage
          this.saveRadius()
          this.$q.notify({
            message: `Search radius set to ${newRadius} km`,
            color: 'positive',
            icon: 'check',
            timeout: 1500
          })
        }
      })
    },

    formatSpendLimit(value) {
      if (!value) return '0.0000';
      const num = parseFloat(value);
      if (isNaN(num)) return '0.0000';
      return num.toFixed(4);
    },

    onGenericAuthToggle(enabled) {
      if (enabled) {
        // Show confirmation dialog before enabling
        this.showAllowAllMerchantsDialog = true;
      } else {
        // Disable "Allow All Merchants"
        this.genericAuthEnabled = false;
        this.merchants.forEach(m => {
          m.isEnabled = m.wasEnabledBeforeGeneric || false;
        });
        this.$q.notify({
          message: 'Generic Auth NFT disabled - select specific merchants to authorize',
          color: 'info',
          icon: 'info',
          timeout: 1500
        });
      }
    },

    confirmAllowAllMerchants() {
      this.showAllowAllMerchantsDialog = false;
      this.genericAuthEnabled = true;
      this.merchants.forEach(m => {
        m.wasEnabledBeforeGeneric = m.isEnabled;
        m.isEnabled = true;
      });
      this.notifySuccess('Generic Auth NFT enabled - all merchants are authorized', { icon: 'check_circle' });
    },

    cancelAllowAllMerchants() {
      this.showAllowAllMerchantsDialog = false;
      this.genericAuthEnabled = false;
    },

    async onMerchantToggle(merchant, enabled) {
      console.log('Toggling merchant:', merchant, 'Enabled:', enabled)
      if (enabled) {
        merchant.spendLimit = merchant.spendLimit || '1';
        
        // Start minting process
        this.mintingMerchants.add(merchant.id);
        this.mintingMerchants = new Set(this.mintingMerchants); // Trigger reactivity
        
        // Simulate minting delay (2 seconds)
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Minting complete
        this.mintingMerchants.delete(merchant.id);
        this.mintingMerchants = new Set(this.mintingMerchants);
        
        // Show success message
        this.mintedMerchants.add(merchant.id);
        this.mintedMerchants = new Set(this.mintedMerchants);
        
        // Clear success message after 2 seconds
        setTimeout(() => {
          this.mintedMerchants.delete(merchant.id);
          this.mintedMerchants = new Set(this.mintedMerchants);
        }, 2000);
      }
      
      const action = enabled ? 'enabled' : 'disabled';
      this.$q.notify({
        message: `${merchant.name} ${action}`,
        color: enabled ? 'positive' : 'grey',
        icon: enabled ? 'check' : 'block',
        timeout: 1000
      });
    },

    openSpendLimitDialog(merchant) {
      if (!merchant.isEnabled || this.genericAuthEnabled) return;
      this.selectedMerchant = merchant;
      this.spendLimitInput = merchant.spendLimit || '1';
      this.spendLimitError = '';
      this.showSpendLimitDialog = true;
    },

    closeSpendLimitDialog() {
      this.showSpendLimitDialog = false;
      this.selectedMerchant = null;
      this.spendLimitInput = '1';
      this.spendLimitError = '';
    },

    saveSpendLimit() {
      const spendLimit = parseFloat(this.spendLimitInput);

      if (isNaN(spendLimit) || spendLimit <= 0) {
        this.spendLimitError = 'Please enter a valid amount greater than 0';
        return;
      }

      if (this.selectedMerchant) {
        this.selectedMerchant.spendLimit = spendLimit.toFixed(8);
        
        if (this.card && this.card.id) {
          const card = CardStorage.getCardById(this.card.id);
          if (card) {
            if (!card.merchantSpendLimits) {
              card.merchantSpendLimits = {};
            }
            card.merchantSpendLimits[this.selectedMerchant.id] = this.selectedMerchant.spendLimit;
            CardStorage.updateCard(this.card.id, { merchantSpendLimits: card.merchantSpendLimits });
          }
        }
        
        this.$q.notify({
          message: `Spend limit set to ${this.selectedMerchant.spendLimit} BCH for ${this.selectedMerchant.name}`,
          color: 'positive',
          icon: 'check_circle',
          timeout: 1500
        });
      }

      this.closeSpendLimitDialog();
    },

    // Select Multiple Mode Methods
    toggleSelectMultipleMode() {
      this.selectMultipleMode = !this.selectMultipleMode;
      if (!this.selectMultipleMode) {
        // Clear selections when exiting select mode
        this.selectedMerchants.clear();
        this.selectedMerchants = new Set();
      }
    },

    handleMerchantClick(merchant) {
      console.log('handleMerchantClick:', merchant.name, 'selectMultipleMode:', this.selectMultipleMode)
      if (this.selectMultipleMode) {
        // In select mode, toggle selection
        this.toggleMerchantSelection(merchant, !this.selectedMerchants.has(merchant.id));
      } else {
        // Normal mode, open spend limit dialog
        this.openSpendLimitDialog(merchant);
      }
    },

    toggleMerchantSelection(merchant, selected) {
      if (selected) {
        this.selectedMerchants.add(merchant.id);
      } else {
        this.selectedMerchants.delete(merchant.id);
      }
      // Trigger reactivity
      this.selectedMerchants = new Set(this.selectedMerchants);
    },

    toggleSelectAll(selectAll) {
      if (selectAll) {
        // Select all filtered merchants
        this.filteredMerchants.forEach(merchant => {
          this.selectedMerchants.add(merchant.id);
        });
      } else {
        // Deselect all
        this.selectedMerchants.clear();
      }
      // Trigger reactivity
      this.selectedMerchants = new Set(this.selectedMerchants);
    },

    async mintSelectedMerchants() {
      if (this.selectedMerchants.size === 0) return;

      this.batchMinting = true;
      
      // Get selected merchant objects
      const merchantsToMint = this.merchants.filter(m => this.selectedMerchants.has(m.id));
      
      // Show progress dialog
      const progressDialog = this.$q.dialog({
        title: 'Minting Merchants',
        message: `Processing ${merchantsToMint.length} merchants...`,
        progress: true,
        ok: false,
        cancel: false,
        persistent: true,
        color: 'primary'
      });

      let successCount = 0;
      let failCount = 0;

      // Process each merchant
      for (const merchant of merchantsToMint) {
        try {
          // Add to minting set
          this.mintingMerchants.add(merchant.id);
          this.mintingMerchants = new Set(this.mintingMerchants);
          
          // Set default spend limit if not set
          merchant.spendLimit = merchant.spendLimit || '1';
          merchant.isEnabled = true;
          
          // Simulate minting delay
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          // Remove from minting, add to minted
          this.mintingMerchants.delete(merchant.id);
          this.mintingMerchants = new Set(this.mintingMerchants);
          this.mintedMerchants.add(merchant.id);
          this.mintedMerchants = new Set(this.mintedMerchants);
          
          successCount++;
          
          // Clear success message after delay
          setTimeout(() => {
            this.mintedMerchants.delete(merchant.id);
            this.mintedMerchants = new Set(this.mintedMerchants);
          }, 2000);
          
        } catch (error) {
          console.error(`Failed to mint merchant ${merchant.name}:`, error);
          this.mintingMerchants.delete(merchant.id);
          this.mintingMerchants = new Set(this.mintingMerchants);
          failCount++;
        }
      }

      progressDialog.hide();
      this.batchMinting = false;
      
      // Clear selections
      this.selectedMerchants.clear();
      this.selectedMerchants = new Set();
      
      // Show result notification
      if (successCount > 0) {
        this.$q.notify({
          message: `Successfully minted ${successCount} merchant${successCount > 1 ? 's' : ''}${failCount > 0 ? `, ${failCount} failed` : ''}`,
          color: failCount > 0 ? 'warning' : 'positive',
          icon: failCount > 0 ? 'warning' : 'check_circle',
          timeout: 3000
        });
      } else {
        this.$q.notify({
          message: 'Failed to mint merchants. Please try again.',
          color: 'negative',
          icon: 'error',
          timeout: 3000
        });
      }
      
      // Exit select mode after batch minting
      this.selectMultipleMode = false;
    },

    destroyLocationMap() {
      if (this.locationMap) {
        this.locationMap.remove();
        this.locationMap = null;
        this.locationMarker = null;
      }
    },

    async reverseGeocodeLocation(lat, lng) {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`
        );
        const data = await response.json();
        if (data.display_name) {
          this.mapCoordinates = {
            ...this.mapCoordinates,
            formatted: data.display_name,
            address: data.address
          };
          this.$q.notify({
            message: `Location set: ${data.display_name.substring(0, 50)}...`,
            color: 'positive',
            icon: 'check',
            timeout: 2000
          });
        }
      } catch (error) {
        console.error('Reverse geocoding failed:', error);
      }
    },

    async searchLocation() {
      if (!this.locationSearchQuery.trim()) return;

      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(this.locationSearchQuery)}`
        );
        const results = await response.json();

        if (results && results.length > 0) {
          const result = results[0];
          const lat = parseFloat(result.lat);
          const lng = parseFloat(result.lon);

          // Update map and marker
          this.locationMap.setView([lat, lng], 16);
          this.locationMarker.setLatLng([lat, lng]);

          // Update temp location
          this.mapCoordinates = {
            latitude: lat,
            longitude: lng,
            formatted: result.display_name,
            address: result.address
          };

          this.$q.notify({
            message: `Found: ${result.display_name.substring(0, 50)}...`,
            color: 'positive',
            icon: 'check',
            timeout: 2000
          });
        } else {
          this.$q.notify({
            message: 'Location not found. Try a different search term.',
            color: 'warning',
            icon: 'warning',
            timeout: 3000
          });
        }
      } catch (error) {
        console.error('Location search failed:', error);
        this.$q.notify({
          message: 'Search failed. Please try again.',
          color: 'negative',
          icon: 'error',
          timeout: 3000
        });
      }
    },

    async confirmLocationUpdate() {
      if (!this.mapCoordinates || !this.mapCoordinates.latitude || !this.mapCoordinates.longitude) {
        this.$q.notify({
          message: 'Please select a location first',
          color: 'warning',
          icon: 'warning',
          timeout: 2000
        });
        return;
      }

      this.showLocationMapDialog = false;

      // Clear existing merchants immediately to show loading state
      this.merchants = [];
      this.merchantsPagination = {
        count: 0,
        limit: 50,
        offset: 0,
        hasMore: false
      };

      // Update display location immediately (for UI feedback)
      this.displayLocation = {
        formatted: this.mapCoordinates.formatted || 'Custom location',
        latitude: this.mapCoordinates.latitude,
        longitude: this.mapCoordinates.longitude
      };

      // Save location to card storage
      this.saveLocationToCard();

      // Update the store with new location
      this.$store.dispatch('marketplace/setSessionLocation', {
        formatted: this.mapCoordinates.formatted || 'Custom location',
        latitude: this.mapCoordinates.latitude,
        longitude: this.mapCoordinates.longitude
      });

      // Also update card store so merchant reload picks up the new location
      this.$store.commit('card/setUserLocation', {
        ...(this.userLocation || {}),
        latitude: this.mapCoordinates.latitude,
        longitude: this.mapCoordinates.longitude,
        formatted: this.mapCoordinates.formatted || ''
      });

      // Reset proximity to 10km
      this.radius = 10;

      // Reload merchants with new location
      await this.loadMerchantList({ reset: true, location: { latitude: this.mapCoordinates.latitude, longitude: this.mapCoordinates.longitude } });
      this.saveMerchantsToCard();

      this.$q.notify({
        message: 'Location updated successfully. Reloading nearby merchants...',
        color: 'positive',
        icon: 'location_on',
        timeout: 3000
      });
    },

    // Save location to card storage
    saveLocationToCard() {
      console.log('saveLocationToCard called, card:', this.card?.id, 'displayLocation:', this.displayLocation?.formatted?.substring(0, 50));
      
      if (!this.card || !this.card.id) {
        console.warn('Cannot save location - card or card.id not available')
        return;
      }
      
      const locationData = {
        displayLocation: this.displayLocation,
        timestamp: new Date().toISOString()
      };
      
      const cardId = String(this.card.id);
      console.log('About to save location to CardStorage for card:', cardId, 'formatted:', locationData.displayLocation?.formatted?.substring(0, 50));
      
      CardStorage.setCardProperty(cardId, 'merchantLocation', locationData);
      
      // Verify it was saved
      const verify = CardStorage.getCardProperty(cardId, 'merchantLocation');
      console.log('Verification - location saved:', verify ? 'YES' : 'NO');
    },

    // Load saved location from card storage
    loadSavedLocation() {      
      const cardId = String(this.card.id);
      
      // Debug: Check localStorage directly
      const rawStorage = localStorage.getItem('mock_subcards');
      const allCards = rawStorage ? JSON.parse(rawStorage) : [];
      console.log('DEBUG: All cards in localStorage:', allCards.length);
      const thisCard = allCards.find(c => String(c.id) === cardId);
      console.log('DEBUG: This card in localStorage:', thisCard ? 'YES' : 'NO');
      if (thisCard) {
        console.log('DEBUG: Card properties:', Object.keys(thisCard));
        console.log('DEBUG: merchantLocation:', thisCard.merchantLocation ? 'EXISTS' : 'NOT FOUND');
      }
      
      const savedLocation = CardStorage.getCardProperty(cardId, 'merchantLocation');
      console.log('Loading saved location for card:', cardId, 'Found:', savedLocation ? 'YES' : 'NO', 'Value:', savedLocation);
      
      if (savedLocation && savedLocation.displayLocation) {
        // Check if saved location is not too old (e.g., 7 days)
        const savedTime = new Date(savedLocation.timestamp);
        const now = new Date();
        const daysDiff = (now - savedTime) / (1000 * 60 * 60 * 24);
        
        if (daysDiff < 7) {
          this.displayLocation = savedLocation.displayLocation;
          console.log('Loaded saved location for card:', cardId, 'Location:', this.displayLocation.formatted?.substring(0, 50));
        } else {
          console.log('Saved location is older than 7 days, using current location');
        }
      }
    },

    // Save radius to card storage
    saveRadius() {
      const rawCardId = this.card?.id;
      console.log('saveRadius called, raw card.id:', rawCardId, 'type:', typeof rawCardId, 'radius:', this.radius);
      
      if (!this.card || !this.card.id) {
        console.warn('Cannot save radius - card or card.id not available')
        return;
      }
      
      const cardId = String(this.card.id);
      console.log('Converting card ID to string:', cardId);
      console.log('About to save radius:', this.radius, 'to card:', cardId);
      
      const result = CardStorage.setCardProperty(cardId, 'merchantRadius', this.radius);
      console.log('setCardProperty returned:', result ? 'SUCCESS' : 'FAILED');
      
      // Verify it was saved
      const verify = CardStorage.getCardProperty(cardId, 'merchantRadius');
      console.log('Verification - radius saved:', verify !== undefined && verify !== null ? 'YES' : 'NO', 'Value:', verify, 'Type:', typeof verify);
      
      // Also check raw localStorage
      const rawStorage = localStorage.getItem('mock_subcards');
      if (rawStorage) {
        const allCards = JSON.parse(rawStorage);
        const thisCard = allCards.find(c => String(c.id) === cardId);
        console.log('Direct localStorage check - merchantRadius:', thisCard?.merchantRadius);
      }
      
      console.log('Radius save operation complete for card:', cardId);
    },

    // Load saved radius from card storage
    loadSavedRadius() {
      console.log('loadSavedRadius called, card:', this.card?.id, 'card type:', typeof this.card?.id);
      
      if (!this.card || !this.card.id) {
        console.warn('Cannot load radius - card or card.id not available, card:', this.card)
        return;
      }
      
      const cardId = String(this.card.id);
      console.log('Looking for radius with cardId:', cardId, '(string)');
      
      // Debug: Check localStorage directly
      const rawStorage = localStorage.getItem('mock_subcards');
      console.log('Raw localStorage mock_subcards exists:', !!rawStorage);
      
      if (!rawStorage) {
        console.log('No cards in localStorage yet');
        return;
      }
      
      const allCards = JSON.parse(rawStorage);
      console.log('Total cards in storage:', allCards.length);
      console.log('Card IDs in storage:', allCards.map(c => ({ id: c.id, type: typeof c.id })));
      
      const thisCard = allCards.find(c => String(c.id) === cardId);
      console.log('Found card in storage:', thisCard ? 'YES' : 'NO');
      
      if (thisCard) {
        console.log('Card properties:', Object.keys(thisCard));
        console.log('merchantRadius exists:', thisCard.hasOwnProperty('merchantRadius'), 'Value:', thisCard.merchantRadius, 'Type:', typeof thisCard.merchantRadius);
      }
      
      const savedRadius = CardStorage.getCardProperty(cardId, 'merchantRadius');
      console.log('CardStorage.getCardProperty result:', savedRadius, 'Type:', typeof savedRadius);
      
      if (savedRadius !== null && savedRadius !== undefined && typeof savedRadius === 'number') {
        this.radius = savedRadius;
        console.log('SUCCESS: Loaded saved radius for card:', cardId, '- Radius:', this.radius);
      } else {
        console.log('FAILED: No saved radius found or invalid type. savedRadius:', savedRadius, 'this.radius remains:', this.radius);
      }
    },

    // Save merchants to card storage
    saveMerchantsToCard() {
      if (!this.card || !this.card.id || this.merchants.length === 0) {
        console.warn('Cannot save merchants - card not available or no merchants')
        return;
      }
      
      // Save only essential merchant data (not UI state)
      const merchantsToSave = this.merchants.map(m => ({
        id: m.id,
        name: m.name,
        // Add other essential fields you want to persist
      }));
      
      const merchantData = {
        merchants: merchantsToSave,
        pagination: this.merchantsPagination,
        timestamp: new Date().toISOString()
      };
      
      const cardId = String(this.card.id);
      CardStorage.setCardProperty(cardId, 'merchantList', merchantData);
      console.log('Merchants saved to card:', cardId, '- Count:', merchantsToSave.length);
    },

    // Load saved merchants from card storage
    loadSavedMerchants() {
      if (!this.card || !this.card.id) {
        console.warn('Cannot load merchants - card or card.id not available')
        return;
      }
      
      const cardId = String(this.card.id);
      const savedData = CardStorage.getCardProperty(cardId, 'merchantList');
      console.log('Loading saved merchants for card:', cardId, 'Found:', savedData ? 'YES' : 'NO');
      
      if (savedData && savedData.merchants && savedData.merchants.length > 0) {
        // Check if saved merchants are not too old (e.g., 1 day)
        const savedTime = new Date(savedData.timestamp);
        const now = new Date();
        const hoursDiff = (now - savedTime) / (1000 * 60 * 60);
        
        if (hoursDiff < 24) {
          // Restore merchants with UI state
          this.merchants = savedData.merchants.map(m => ({
            ...m,
            isEnabled: false,
            wasEnabledBeforeGeneric: false,
            spendLimit: null
          }));
          
          if (savedData.pagination) {
            this.merchantsPagination = savedData.pagination;
          }
          
          console.log('Loaded saved merchants for card:', cardId, '- Count:', this.merchants.length);
        } else {
          console.log('Saved merchants are older than 24 hours, will reload');
        }
      }
    },

    // Watch for merchant changes and save them
    saveMerchantsOnChange() {
      // Debounce the save to avoid excessive writes
      if (this.saveDebounceTimer) {
        clearTimeout(this.saveDebounceTimer);
      }
      
      this.saveDebounceTimer = setTimeout(() => {
        this.saveMerchantsToCard();
      }, 2000); // Save 2 seconds after last change
    }
  },
  
  watch: {
    // Reload merchants when search radius changes and save to card
    radius(newRadius, oldRadius) {
      console.log('Radius watcher triggered:', oldRadius, '->', newRadius, 'isInitializing:', this.isInitializing);
      
      // Skip during initialization to prevent overwriting saved values
      if (this.isInitializing) {
        console.log('Skipping radius save during initialization');
        return;
      }
      
      // Save radius when it changes
      this.saveRadius();
      this.loadMerchantList({ reset: true }).then(() => {
        this.saveMerchantsToCard();
      });
    },
    // Initialize map when dialog opens
    showLocationMapDialog(val) {
      if (val) {
        this.$nextTick(() => {
          this.initLocationMap()
        })
      } else {
        this.destroyLocationMap()
      }
    },
    // Save merchants when they change
    merchants: {
      deep: true,
      handler() {
        this.saveMerchantsOnChange();
      }
    }
  }
}
</script>

<style lang="scss" scoped>
  @import "src/css/app-card.scss";
  @import "~leaflet/dist/leaflet.css";

  .location-info {
    transition: all 0.2s ease;
    border-radius: 8px;
    padding: 4px 8px;

    &:hover {
      background: rgba(25, 118, 210, 0.1);
    }
  }

  .location-search {
    background: white;
    border-radius: 14px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);

    :deep(.q-field__control) {
      border-radius: 14px;
    }
  }

  .body--dark {
    .location-search {
      background: #1d1d1d;
    }
  }

  .search-input-wrapper {
    background: transparent;
    border-radius: 20px;
    border: 1.5px solid;
    border-color: rgba(0, 0, 0, 0.12);
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
    padding-left: 4px;

    &:focus-within {
      border-color: var(--q-primary);
      box-shadow: 0 0 0 2px color-mix(in srgb, var(--q-primary) 15%, transparent);
    }
  }

  .search-input-field {
    font-size: 13px;
  }

  .body--dark {
    .search-input-wrapper {
      border-color: rgba(255, 255, 255, 0.15);

      &:focus-within {
        border-color: var(--q-primary);
        box-shadow: 0 0 0 2px color-mix(in srgb, var(--q-primary) 20%, transparent);
      }
    }
  }
</style>
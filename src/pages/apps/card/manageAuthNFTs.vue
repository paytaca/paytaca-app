<template>
  <div class="full-width">
    <!-- Location Info -->
    <div 
      v-if="userLocation"
      class="row items-center q-mb-md q-px-sm"
      :class="$q.dark.isActive ? 'text-grey-4' : 'text-grey-7'"
    >
      <q-icon name="location_on" size="1.2rem" class="q-mr-xs" color="primary" />
      <span class="text-caption ellipsis">
        {{ userLocation.formatted || 'Using current location' }}
      </span>
      <q-btn
        flat
        dense
        no-caps
        size="0.75rem"
        color="primary"
        class="q-ml-sm"
        @click="openLocationSelector"
      >
        Change
      </q-btn>
    </div>
    <div 
      v-else
      class="row items-center q-mb-md q-px-sm"
      :class="$q.dark.isActive ? 'text-grey-5' : 'text-grey'"
    >
      <q-icon name="location_off" size="1.2rem" class="q-mr-xs" />
      <span class="text-caption">Set your location to find nearby merchants</span>
      <q-btn
        flat
        dense
        no-caps
        size="0.75rem"
        color="primary"
        class="q-ml-sm"
        @click="openLocationSelector"
      >
        Set Location
      </q-btn>
    </div>

    <!-- Search bar -->
    <div class="row items-center q-mb-md q-gutter-x-sm">
      <div class="col">
        <q-input 
          v-model="search" 
          label="Search merchants..." 
          outlined 
          dense
          :dark="$q.dark.isActive"
          clearable
        >
          <template v-slot:append>
            <q-icon name="search" />
          </template>
        </q-input>
      </div>
    </div>

    <!-- Generic Auth NFT Toggle -->
    <div 
      class="row items-center justify-between q-pa-md border-outlined br-10 q-mb-md generic-auth-toggle"
      :class="$q.dark.isActive ? 'bg-dark' : 'bg-grey-1'"
    >
      <div class="text-subtitle2 text-primary text-weight-bold">Generic Auth NFT</div>
      <q-toggle 
        v-model="genericAuthEnabled"
        color="primary"
        @update:model-value="onGenericAuthToggle"
      />
    </div>

    <!-- Global Spend Limit Input (shown when Generic Auth NFT is enabled) -->
    <div 
      v-if="genericAuthEnabled"
      class="q-pa-md border-outlined br-10 q-mb-md"
      :class="$q.dark.isActive ? 'bg-dark' : 'bg-grey-1'"
    >
      <div class="text-subtitle2 text-primary text-weight-bold q-mb-sm">Global Spend Limit</div>
      <div class="row items-center q-gutter-x-sm">
        <div class="col">
          <q-input
            v-model="genericSpendLimit"
            type="number"
            outlined
            dense
            :dark="$q.dark.isActive"
            label="Spend Limit (BCH)"
            step="0.00000001"
            min="0"
          />
        </div>
        <q-btn 
          color="primary" 
          label="Save" 
          @click="saveGlobalSpendLimit"
          dense
        />
      </div>
    </div>

    <q-separator class="q-mb-sm" :dark="$q.dark.isActive" />

    <!-- Merchants List -->
    <div class="text-subtitle2 q-mb-sm" :class="textColor">
      Nearby Merchants
      <span v-if="merchantsPagination.count > 0" class="text-caption text-grey">
        ({{ filteredMerchants.length }} of {{ merchantsPagination.count }})
      </span>
    </div>
    
    <div 
      ref="merchantListContainer"
      class="scroll merchant-list" 
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
        </q-item>
      </div>

      <!-- Empty State - No Location -->
      <div 
        v-else-if="!userLocationValid" 
        class="text-center q-pa-xl" 
        :class="$q.dark.isActive ? 'text-grey-5' : 'text-grey'"
      >
        <q-icon name="location_off" size="48px" class="q-mb-md" />
        <div>Set your location to find nearby merchants</div>
        <q-btn
          color="primary"
          label="Set Location"
          class="q-mt-md"
          @click="openLocationSelector"
        />
      </div>

      <!-- Empty State - No Merchants -->
      <div 
        v-else-if="filteredMerchants.length === 0 && !loading" 
        class="text-center q-pa-xl" 
        :class="$q.dark.isActive ? 'text-grey-5' : 'text-grey'"
      >
        <q-icon name="storefront" size="48px" class="q-mb-md" />
        <div>No verified merchants found near your location</div>
        <div class="text-caption q-mt-sm">
          Try expanding your search radius or changing your location
        </div>
      </div>

      <!-- Merchant List -->
      <div v-else-if="filteredMerchants.length > 0">
        <q-list separator :dark="$q.dark.isActive">
          <q-item 
            v-for="merchant in filteredMerchants" 
            :key="merchant.id" 
            class="q-px-none merchant-item"
            :class="{ 
              'disabled-merchant': genericAuthEnabled,
              'clickable-merchant': merchant.isEnabled && !genericAuthEnabled
            }"
            :clickable="merchant.isEnabled && !genericAuthEnabled"
            @click="openSpendLimitDialog(merchant)"
          >
            <q-item-section>
              <q-tooltip 
                v-if="merchant.isEnabled && !genericAuthEnabled && merchant.spendLimit" 
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
                  v-if="merchant.isEnabled && !genericAuthEnabled && merchant.spendLimit" 
                  class="text-caption text-secondary q-ml-xs"
                >
                  ({{ formatSpendLimit(merchant.spendLimit) }} BCH)
                </span>
              </div>
            </q-item-section>
            <q-item-section side>
              <q-toggle 
                v-model="merchant.isEnabled"
                :disable="genericAuthEnabled"
                :color="genericAuthEnabled 
                  ? ($q.dark.isActive ? 'grey-6' : 'grey-5') 
                  : 'primary'"
                @update:model-value="(val) => onMerchantToggle(merchant, val)"
              />
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

  </div>
</template>

<script>
import { getMerchantList, CardStorage, createCardLogic } from './noBackend.js'
import PinLocationDialog from 'src/components/PinLocationDialog.vue'

export default {
  name: 'ManageAuthNFTs',
  mixins: [createCardLogic],
  props: {
    card: { type: Object, required: true }
  },
  data() {
    return {
      search: '',
      genericAuthEnabled: false,
      genericSpendLimit: '1',
      merchants: [],
      showSpendLimitDialog: false,
      selectedMerchant: null,
      spendLimitInput: '1',
      spendLimitError: '',
      loading: false,
      loadingMore: false,
      merchantsPagination: {
        count: 0,
        limit: 10,
        offset: 0,
        hasMore: false
      },
      radius: 30, // Default search radius in km
    }
  },
  computed: {
    userLocation() {
      return this.$store.getters['marketplace/sessionLocation']
    },
    userLocationValid() {
      const coords = this.$store.getters['marketplace/customerCoordinates']
      return Number.isFinite(coords?.latitude) && Number.isFinite(coords?.longitude)
    },
    userCoordinates() {
      return this.$store.getters['marketplace/customerCoordinates']
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
    }
  },
  watch: {
    userLocation: {
      handler(newLocation, oldLocation) {
        // Reload merchants when location changes
        if (newLocation?.id !== oldLocation?.id) {
          this.loadMerchantList({ reset: true })
        }
      },
      deep: true
    }
  },
  mounted() {
    // Load merchants if location is already set
    if (this.userLocationValid) {
      this.loadMerchantList({ reset: true })
    }
    
    // Load global spend limit from card if available
    if (this.card && this.card.genericSpendLimit) {
      this.genericSpendLimit = this.card.genericSpendLimit;
    }
    
    // Load merchant spend limits from card if available
    if (this.card && this.card.merchantSpendLimits) {
      this.merchants.forEach(merchant => {
        if (this.card.merchantSpendLimits[merchant.id]) {
          merchant.spendLimit = this.card.merchantSpendLimits[merchant.id];
        }
      });
    }
  },
  methods: {
    async loadMerchantList(opts = {}) {
      if (!this.userLocationValid) {
        this.loading = false
        return
      }

      const isReset = opts.reset || false
      
      if (isReset) {
        this.merchants = []
        this.merchantsPagination = {
          count: 0,
          limit: 10,
          offset: 0,
          hasMore: false
        }
      }

      // Don't load more if already loading or no more results
      if (this.loading || this.loadingMore) return
      if (!isReset && !this.merchantsPagination.hasMore) return

      if (isReset) {
        this.loading = true
      } else {
        this.loadingMore = true
      }

      try {
        const params = {
          limit: this.merchantsPagination.limit,
          offset: this.merchantsPagination.offset,
          location: this.userCoordinates,
          radius: this.radius
        }

        const response = await getMerchantList(params)
        
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

        // Update pagination
        this.merchantsPagination = {
          count: response.count,
          limit: response.limit,
          offset: response.offset + newMerchants.length,
          hasMore: response.hasMore
        }

        console.log(`Loaded ${newMerchants.length} merchants. Total: ${this.merchants.length}/${response.count}`)
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

    openLocationSelector() {
      // Get current coordinates or use defaults
      const coords = this.userCoordinates
      const initLocation = {
        latitude: coords?.latitude || null,
        longitude: coords?.longitude || null
      }

      // Open the pin location dialog
      this.$q.dialog({
        component: PinLocationDialog,
        componentProps: {
          initLocation,
          headerText: this.$t('Select Location') || 'Select Location'
        }
      }).onOk((coordinates) => {
        // Update the location in the store
        this.updateStoreLocation(coordinates.lat, coordinates.lng)
      })
    },

    async updateStoreLocation(lat, lng) {
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return

      // Show loading dialog
      const dialog = this.$q.dialog({
        title: 'Updating location',
        message: 'Getting address...',
        progress: true,
        ok: false,
        cancel: false,
        persistent: true,
        color: 'brandblue',
        class: `br-15 pt-card-2 text-bow ${this.$q.dark.isActive ? 'dark' : 'light'}`
      })

      try {
        // Reverse geocode to get address
        const { geolocationManager } = await import('src/boot/geolocation')
        const response = await geolocationManager.reverseGeocode({ lat, lon: lng })

        // Update store location
        this.$store.commit('marketplace/updateLocationData', response)
        this.$store.commit('marketplace/setSelectedSessionLocationId')

        dialog.hide()

        // Reload merchant list with new location
        this.loadMerchantList({ reset: true })

        // Show success notification
        this.$q.notify({
          message: `Location updated to ${response?.formatted || 'new location'}`,
          color: 'positive',
          icon: 'check',
          timeout: 2000
        })
      } catch (error) {
        console.error('Failed to update location:', error)
        dialog.update({ message: 'Unable to get address. Please try again.' })
        setTimeout(() => dialog.hide(), 1500)
      }
    },

    formatSpendLimit(value) {
      if (!value) return '0';
      return parseFloat(value).toFixed(3);
    },

    onGenericAuthToggle(enabled) {
      if (enabled) {
        this.merchants.forEach(m => {
          m.wasEnabledBeforeGeneric = m.isEnabled;
          m.isEnabled = true;
        });
        this.notifySuccess('Generic Auth NFT enabled - all merchants are authorized', { icon: 'check_circle' });
      } else {
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

    onMerchantToggle(merchant, enabled) {
      if (enabled) {
        merchant.spendLimit = merchant.spendLimit || '1';
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

    saveGlobalSpendLimit() {
      const spendLimit = parseFloat(this.genericSpendLimit);

      if (isNaN(spendLimit) || spendLimit <= 0) {
        this.$q.notify({
          message: 'Please enter a valid amount greater than 0',
          color: 'negative',
          icon: 'error',
          timeout: 2000
        });
        return;
      }

      this.genericSpendLimit = spendLimit.toFixed(8);
      
      if (this.card && this.card.id) {
        CardStorage.setCardProperty(this.card.id, 'genericSpendLimit', this.genericSpendLimit);
      }
      
      this.$q.notify({
        message: `Global spend limit set to ${this.genericSpendLimit} BCH`,
        color: 'positive',
        icon: 'check_circle',
        timeout: 1500
      });
    }
  }
}
</script>

<style lang="scss" scoped>
  @import "./createCard.scss"
</style>

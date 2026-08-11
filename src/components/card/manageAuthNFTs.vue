<template>
  <div class="full-width">
    <!-- Location Info - clickable to open map popup -->
    <GeolocateBtn silent-on-error silent-on-deny @geolocate="onGeolocated" @denied="onLocationDenied">
      <template #default="{ attemptGeolocate }">
        <div
          v-if="userLocation"
          class="row items-center q-mb-md q-px-sm cursor-pointer location-info disabled"
          :class="$q.dark.isActive ? 'text-grey-4' : 'text-grey-7'"
          @click="onSelectLocation"
        >
          <q-icon name="location_on" size="1.2rem" class="q-mr-xs" color="primary" />
          <span class="text-caption ellipsis">
            {{ fullUserLocation || $t('UsingCurrentLocation', {}, 'Using current location') }}
          </span>
          <q-icon name="edit" size="0.9rem" class="q-ml-xs" color="primary" />
          <q-tooltip>{{ $t('ClickToUpdateLocation', {}, 'Click to update your location') }}</q-tooltip>
        </div>
        <div
          v-else
          class="row items-center q-mb-md q-px-sm cursor-pointer location-info"
          :class="$q.dark.isActive ? 'text-grey-5' : 'text-grey'"
          @click="() => attemptGeolocate().catch(err => cardLogger.error(err)).then(() => openLocationMapDialog())"
        >
          <q-icon name="location_off" size="1.2rem" class="q-mr-xs" />
          <span class="text-caption">{{ $t('DetectingYourLocation', {}, 'Detecting your location... (click to set manually)') }}</span>
          <q-icon name="edit" size="0.9rem" class="q-ml-xs" />
          <q-tooltip>{{ $t('ClickToSetLocation', {}, 'Click to set your location') }}</q-tooltip>
        </div>
      </template>
    </GeolocateBtn>

    <!-- Search bar and Select Multiple Toggle -->
    <div class="row items-center q-mb-md q-gutter-x-sm">
      <div class="col">
        <q-input
          v-model="search"
          :placeholder="$t('SearchMerchants', {}, 'Search merchants...')"
          dense
          borderless
          input-class="search-input-field"
          :dark="$q.dark.isActive"
          clearable
          disable
          class="search-input-wrapper"
        >
          <template v-slot:prepend>
            <q-icon name="search" size="1.1rem" color="primary" />
          </template>
        </q-input>
      </div>

    </div>

    <!-- Global Auth NFT -->
    <div 
      class="q-pa-md br-10 q-mb-md manage-auth-generic-toggle"
      :class="[
        $q.dark.isActive ? 'glassmorphic-dark' : 'glassmorphic-light',
        { 'global-auth-active': globalAuthNft.authorized }
      ]"
    >
      <!-- Header -->
      <div class="row items-center q-gutter-x-sm">
        <div class="global-auth-icon">
          <q-icon name="all_inclusive" color="primary" size="1.2rem" />
        </div>
        <div class="col text-subtitle2 text-weight-bold" :class="textColor">
          {{ $t('GlobalAuthenticationNFT', {}, 'Global Authentication NFT') }}
        </div>
        <q-btn
          flat
          dense
          auto-close
          transition-show="scale"
          transition-hide="scale"
          anchor="bottom middle"
          self="top middle"
          class="q-pa-none"
        >
          <q-btn dense flat round icon="info" color="primary" />
          <q-menu
            class="pt-card-2 text-bow q-pa-md"
            :class="$q.dark.isActive ? 'dark' : 'light'"
            :offset="[0, 8]"
            style="border-radius: 16px;"
          >
            <div style="min-width: 250px; max-width: 300px;">
              <div class="text-subtitle2 text-weight-bold q-mb-sm">
                <q-icon name="all_inclusive" color="primary" size="1.1rem" class="q-mr-xs" />
                {{ $t('GlobalAuthenticationNFT', {}, 'Global Authentication NFT') }}
              </div>
              <div class="text-body2">
                {{ $t('GlobalAuthenticationNFTDescription', {}, 'Enabling the Global Authentication NFT will authorize all merchants in your city to accept payments from your card. This is a convenient option if you want to quickly enable payments for all merchants without having to select them individually.') }}
              </div>
              <div class="text-caption q-mt-sm text-bow-muted">
                {{ $t('GlobalAuthenticationNFTNote', {}, 'Note: This will override any individual merchant selections you have made.') }}
              </div>
            </div>
          </q-menu>
        </q-btn>
      </div>

      <q-separator horizontal :dark="$q.dark.isActive" class="q-my-sm" />

      <!-- Authorization -->
      <div class="row justify-between items-center q-py-xs">
        <div class="row items-center q-gutter-x-sm">
          <q-icon name="shield" size="1.1rem" color="primary" />
          <span class="text-body2" :class="textColor">{{ $t('Authorization', {}, 'Authorization') }}</span>
        </div>
        <div class="row items-center q-gutter-x-sm">
          <span
            class="global-auth-status-pill"
            :class="{
              'pill-enabled': globalAuthNft.authorized,
              'pill-disabled': globalAuthNft.authorized === false,
              'pill-loading': globalAuthNft.authorized === null
            }"
          >
            {{ globalAuthNftAuthorizedLabel }}
          </span>
          <q-toggle
            :model-value="globalAuthNft.authorized"
            color="primary"
            :disable="loadingGlobalAuthNft"
            @update:model-value="mutateGlobalAuthNft(!globalAuthNft.authorized, null)"
          />
        </div>
      </div>

      <!-- Spend Limit -->
      <div class="row justify-between items-center q-py-xs">
        <div class="row items-center q-gutter-x-sm">
          <q-icon name="savings" size="1.1rem" color="primary" />
          <span class="text-body2" :class="textColor">{{ $t('SpendLimit', {}, 'Spend Limit') }}</span>
        </div>
        <div class="row items-center q-gutter-x-sm">
          <span v-if="globalAuthNft.spendLimitSats !== null" class="text-body2 text-weight-medium" :class="textColor">
            {{ `${satoshiToBch(globalAuthNft.spendLimitSats)} BCH` }}
          </span>
          <span v-else class="text-body2" :class="textColorGrey">...</span>
          <span class="text-caption" :class="textColorGrey">{{ $t('PerTransaction', {}, '(per transaction)') }}</span>
          <q-btn
            flat
            dense
            no-caps
            :label="$t('Edit', {}, 'Edit')"
            color="primary"
            class="q-px-sm"
            @click="openEditGlobalSpendLimit"
          />
        </div>
      </div>

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
      {{ $t('NearbyMerchants', {}, 'Nearby Merchants') }}
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
        <div>{{ $t('WaitingForGPSLocation', {}, 'Waiting for GPS location...') }}</div>
        <div class="text-caption q-mt-sm">
          {{ $t('PleaseEnableLocationServices', {}, 'Please enable location services') }}
        </div>
      </div>

      <!-- Empty State - No Merchants -->
      <div 
        v-else-if="filteredMerchants.length === 0 && !loading" 
        class="text-center q-pa-xl" 
        :class="$q.dark.isActive ? 'text-grey-5' : 'text-grey'"
      >
        <q-icon name="storefront" size="48px" class="q-mb-md" />
        <div>{{ $t('NoMerchantsFoundInCity', {}, 'No merchants found in your city') }}</div>
        <div class="text-caption q-mt-sm">
          {{ $t('TryChangingLocation', {}, 'Try changing your location to find merchants in other areas') }}
        </div>
      </div>

      <!-- Merchant List -->
      <div v-else-if="filteredMerchants.length > 0">
        <q-list disabled separator :dark="$q.dark.isActive">
          <q-item 
            v-for="merchant in filteredMerchants" 
            :key="merchant.id" 
            class="q-px-none manage-auth-merchant-item q-px-md"
            :class="{ 'disabled-merchant': genericAuthEnabled }">
            <q-item-section>
              <q-tooltip 
                v-if="merchant.isEnabled && !genericAuthEnabled && merchant.spendLimit" 
                anchor="top middle" 
                self="bottom middle">
                {{ $t('SpendLimitLabel', {}, 'Spend Limit:') }} {{ formatSpendLimit(merchant.spendLimit) }} BCH
              </q-tooltip>
              <div 
                class="text-weight-bold"
                :class="merchant.isEnabled ? textColor : ($q.dark.isActive ? 'text-grey-6' : 'text-grey-7')">
                {{ merchant.name }}
                <span 
                  v-if="merchant.isEnabled && !genericAuthEnabled && merchant.spendLimit" 
                  class="text-caption text-secondary q-ml-xs">
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
                  class="text-positive text-caption">
                  {{ $t('MintingDone', {}, 'minting done') }}
                </span>
                <!-- Merchant has NFTs: show authorized label -->
                <span
                  v-if="merchant.auth_nfts?.length > 0"
                  class="text-caption text-positive">
                  {{ $t('AuthorizedNftCount', { count: merchant.auth_nfts.length }, 'Authorized (' + merchant.auth_nfts.length + ' NFT' + (merchant.auth_nfts.length > 1 ? 's' : '') + ')') }}
                </span>
                <!-- Merchant has no NFTs: show mint toggle -->
              </div>
            </q-item-section>
          </q-item>
        </q-list>

        <!-- Loading More Indicator -->
        <div v-if="loadingMore" class="text-center q-pa-md">
          <q-spinner color="primary" size="2rem" />
          <div class="text-caption q-mt-sm" :class="textColorGrey">{{ $t('LoadingMoreMerchants', {}, 'Loading more merchants...') }}</div>
        </div>

        <!-- No More Results -->
        <div 
          v-else-if="!merchantsPagination.hasMore && filteredMerchants.length > 0" 
          class="text-center q-pa-md text-caption"
          :class="$q.dark.isActive ? 'text-grey-6' : 'text-grey'"
        >
          {{ $t('NoMoreMerchants', {}, 'No more merchants') }}
        </div>
      </div>
    </div>

    <!-- Status message -->
    <div class="row justify-center q-mt-sm">
      <div 
        class="auth-nfts-status-message text-caption q-px-md q-py-xs"
        :class="$q.dark.isActive ? 'glassmorphic-dark text-grey-4' : 'glassmorphic-light text-grey-7'"
      >
        <q-icon name="shield" size="0.9rem" class="q-mr-xs" />
        {{ genericAuthEnabled ? $t('GenericAuthEnabledMessage', {}, 'Generic Auth NFT is enabled - all merchants are authorized') : $t('SelectSpecificMerchantsMessage', {}, 'Select specific merchants to authorize') }}
      </div>
    </div>

    <!-- Allow All Merchants Confirmation Dialog -->
    <!-- <q-dialog v-model="showAllowAllMerchantsDialog" persistent>
      <q-card class="pt-card" :class="$q.dark.isActive ? 'dark' : 'light'" style="min-width: 320px; border-radius: 24px;">
        <q-card-section class="q-pa-lg">
          <div class="row items-center justify-between q-mb-sm">
            <div class="text-h6 text-weight-bold" :class="textColor">
              {{ $t('AllowAllMerchantsDialogTitle') }}
            </div>
            <q-btn flat round dense icon="close" :color="$q.dark.isActive ? 'grey-4' : 'grey-6'" @click="cancelAllowAllMerchants" />
          </div>
          <div :class="textColor" class="q-mb-sm">
            {{ $t('AllowAllMerchantsDialogMessage', { amount: formatSpendLimit(GLOBAL_SPEND_LIMIT_BCH) }) }}
          </div>
          <div class="text-caption" :class="$q.dark.isActive ? 'text-grey-4' : 'text-grey-7'">
            {{ $t('AllowAllMerchantsDialogSubtext') }}
          </div>
        </q-card-section>

        <q-card-actions align="right" class="q-px-lg q-pb-md">
          <q-btn flat label="Cancel" :color="$q.dark.isActive ? 'grey-4' : 'grey-7'" rounded @click="cancelAllowAllMerchants" />
          <q-btn unelevated label="Enable" color="primary" class="bg-grad text-white" rounded @click="onConfirmEnableGlobalAuthNft" />
        </q-card-actions>
      </q-card>
    </q-dialog> -->

    <!-- Spend Limit Dialog -->
    <q-dialog v-model="showMutateAuthDialog">
      <q-card class="pt-card" :class="$q.dark.isActive ? 'dark' : 'light'" style="min-width: 320px; border-radius: 24px;">
        <q-card-section class="q-pa-lg">
          <div class="row items-center justify-between q-mb-sm">
            <div class="text-h6 text-weight-bold" :class="textColor">
              {{ $t('EditAuthorizationNFT', {}, 'Edit Authorization NFT') }}
            </div>
            <q-btn flat round dense icon="close" :color="$q.dark.isActive ? 'grey-4' : 'grey-6'" @click="closeSpendLimitDialog" />
          </div>
          <div class="q-mb-md" :class="textColor">
            <span class="text-weight-bold">{{ $t('MerchantLabel', {}, 'Merchant:') }} {{ selectedMerchant?.name }}</span>
          </div>
          <q-tabs v-model="selectedNFT.id" class="text-subtitle2 bg-transparent" :dark="$q.dark.isActive">
            <q-tab
              v-for="nft in selectedMerchant.auth_nfts"
              :key="nft.id"
              :name="nft.id"
              :label="`NFT ${nft.id}`"
              @click="() => { selectedNFT = nft }"
            />
              <q-tab v-if="selectedMerchant.auth_nfts.length === 0" name="no-nft" :label="$t('NoNFTs', {}, 'No NFTs')" :disable="true" />
          </q-tabs>
          <q-tab-panels v-model="selectedNFT.id" animated class="bg-transparent">
            <q-tab-panel :name="selectedNFT.id">
              <q-toggle
                left-label
                :label="$t('Authorize', {}, 'Authorize')"
                v-model:model-value="selectedNFTAuthorized"/>
              <q-input
                v-model="spendLimitInput"
                type="number"
                filled
                :dark="$q.dark.isActive"
                :label="$t('SpendLimitBCH', {}, 'Spend Limit (BCH)')"
                step="0.00000001"
                min="0"
                :error="!!spendLimitError"
                :error-message="spendLimitError"
                lazy-rules
              />
              <div v-if="selectedAuthNFT" class="q-mt-md q-gutter-y-xs text-caption" :class="textColorGrey">
                <div><span class="text-weight-medium">{{ $t('NftId', {}, 'NFT ID:') }}</span> {{ selectedAuthNFT.id }}</div>
                <div><span class="text-weight-medium">{{ $t('Category', {}, 'Category:') }}</span> {{ selectedAuthNFT.token?.category || $t('N/A', {}, 'N/A') }}</div>
                <div><span class="text-weight-medium">{{ $t('Commitment', {}, 'Commitment:') }}</span> {{ selectedAuthNFT.token?.commitment || $t('N/A', {}, 'N/A') }}</div>
                <div><span class="text-weight-medium">{{ $t('Amount', {}, 'Amount:') }}</span> {{ selectedAuthNFT.token?.amount || '0' }}</div>
                <div><span class="text-weight-medium">{{ $t('GlobalAuth', {}, 'Global Auth:') }}</span> {{ selectedAuthNFT.token?.is_global_auth ? $t('Yes', {}, 'Yes') : $t('No', {}, 'No') }}</div>
                <div><span class="text-weight-medium">{{ $t('SpendLimit', {}, 'Spend Limit:') }}</span> {{ formatSpendLimitFromSats(selectedAuthNFT.token?.spend_limit_sats) }} BCH</div>
              </div>
            </q-tab-panel>
          </q-tab-panels>
        </q-card-section>

        <q-card-actions align="between" class="q-px-lg q-pb-md">
          <div class="row items-center q-gutter-sm">
            <q-btn flat label="Cancel" :color="$q.dark.isActive ? 'grey-4' : 'grey-7'" rounded @click="closeSpendLimitDialog" />
            <q-btn unelevated label="Save" color="primary" class="bg-grad text-white" rounded @click="submitMutation" />
          </div>
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Edit Global Spend Limit Dialog -->
    <q-dialog v-model="showEditGlobalSpendLimitDialog" persistent>
      <q-card class="pt-card" :class="$q.dark.isActive ? 'dark' : 'light'" style="min-width: 320px; border-radius: 24px;">
        <q-card-section class="q-pa-lg">
          <div class="row items-center justify-between q-mb-sm">
            <div class="text-h6 text-weight-bold text-bow" :class="$q.dark.isActive ? 'dark' : 'light'">
              <q-icon name="savings" color="primary" class="q-mr-sm" />
              {{ $t('EditGlobalSpendLimit', {}, 'Edit Global Spend Limit') }}
            </div>
            <q-btn flat round dense icon="close" :color="$q.dark.isActive ? 'grey-4' : 'grey-6'" @click="showEditGlobalSpendLimitDialog = false" />
          </div>
          <div class="q-mb-md text-bow" :class="$q.dark.isActive ? 'dark' : 'light'">
            {{ $t('EnterNewGlobalSpendLimit', {}, 'Enter the new spend limit for the Global Authentication NFT (in BCH):') }}
          </div>
          <div class="pt-card-2" :class="$q.dark.isActive ? 'dark' : 'light'" style="border-radius: 14px; overflow: hidden;">
            <q-input
              v-model="globalSpendLimitInput"
              type="number"
              filled
              autofocus
              hide-bottom-space
              :dark="$q.dark.isActive"
              :label="$t('SpendLimitBCH', {}, 'Spend Limit (BCH)')"
              step="0.00000001"
              min="0"
              :error="!!globalSpendLimitError"
              :error-message="globalSpendLimitError"
              class="edit-name-input"
              @keyup.enter="submitGlobalSpendLimit"
            >
              <template v-slot:prepend>
                <q-icon name="savings" size="1.1rem" color="primary" />
              </template>
            </q-input>
          </div>
        </q-card-section>

        <q-card-actions align="right" class="q-px-lg q-pb-md">
          <q-btn flat :label="$t('Cancel', {}, 'Cancel')" :color="$q.dark.isActive ? 'grey-4' : 'grey-7'" rounded @click="showEditGlobalSpendLimitDialog = false" />
          <q-btn unelevated :label="$t('Save', {}, 'Save')" color="primary" class="bg-grad text-white" rounded @click="submitGlobalSpendLimit" />
        </q-card-actions>
      </q-card>
    </q-dialog>



    <!-- Location Map Dialog -->
    <q-dialog v-model="showLocationMapDialog" persistent maximized>
      <q-card class="pt-card" :class="$q.dark.isActive ? 'dark' : 'light'">
        <q-card-section class="row items-center justify-between q-pa-sm">
          <div class="text-h6" :class="textColor">
            <q-icon name="location_on" color="primary" class="q-mr-sm" />
            {{ $t('UpdateYourLocation', {}, 'Update Your Location') }}
          </div>
          <q-btn icon="close" flat round dense v-close-popup :color="$q.dark.isActive ? 'grey-4' : 'grey-6'" />
        </q-card-section>

        <q-card-section class="q-pa-none" style="height: calc(100vh - 140px);">
          <div ref="locationMap" class="full-width full-height"></div>
          
          <!-- Location Search Input -->
          <div class="absolute-top q-pa-md" style="z-index: 1000;">
            <q-input
              v-model="locationSearchQuery"
              filled
              :dark="$q.dark.isActive"
              :placeholder="$t('SearchLocation', {}, 'Search location...')"
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
              {{ $t('DragMarkerOrClickMap', {}, 'Drag the marker or click on the map to set your location') }}
            </div>
            <q-btn
              color="primary"
              icon="check"
              :label="$t('ConfirmLocation', {}, 'Confirm Location')" 
              unelevated
              rounded
              class="bg-grad text-white"
              @click="confirmLocationUpdate"
            />
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>

  </div>
</template>

<script>
// import { createCardLogic, CardStorage } from './createCard.js'
import { getMerchantList, getMerchantsByCity } from 'src/services/card/merchants'
import { geolocationManager } from 'src/boot/geolocation'
import GeolocateBtn from 'src/components/GeolocateBtn.vue'
import PinLocationDialog from 'src/components/PinLocationDialog.vue';
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils.js';
import { bchToSatoshi } from 'src/exchange/index.js';
import { cardLogger } from 'src/utils/debug-logger.js'
import { satoshiToBch } from 'src/exchange/index.js';


export default {
  name: 'ManageAuthNFTs',
  // mixins: [createCardLogic],
  components: { GeolocateBtn },
  inject: ['cardUser'],
  props: {
    card: { type: Object, required: true }
  },
  provides() {
    return {
      card: this.card,
    }
  },
  data() {
    return {
      search: '',
      // showBurnTokenDialog: false,
      genericAuthEnabled: false,
      // Hardcoded global spend limit: ~500 PHP worth of BCH (approximately 0.0017 BCH)
      GLOBAL_SPEND_LIMIT_BCH: '0.0017',
      merchants: [],
      showAllowAllMerchantsDialog: false,
      showMutateAuthDialog: false,
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
      selectedNFT: {
        id: null
      },
      globalAuthNft: {
        authorized: null
      },
      loadingGlobalAuthNft: false,
      showEditGlobalSpendLimitDialog: false,
      globalSpendLimitInput: '1',
      globalSpendLimitError: ''
    }
  },
  computed: {
    globalAuthNftAuthorizedLabel() {
      if (this.globalAuthNft.authorized === null) {
        return this.$t('Loading', {}, 'Loading...')
      }
      return this.globalAuthNft.authorized ? this.$t('Enabled', {}, 'Enabled') : this.$t('Disabled', {}, 'Disabled')
    },
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
    mapUid() {
      return `leaflet-map-${this.$.uid}`
    },
    selectedAuthNFT() {
      const nfts = this.selectedMerchant?.auth_nfts || []
      return nfts.find(nft => nft.id === this.selectedNFT.id) || null
    },
    selectedNFTAuthorized: {
      get() {
        const nft = this.selectedAuthNFT
        if (!nft) return false
        if (nft.token && typeof nft.token.authorized === 'boolean') {
          return nft.token.authorized
        }
        return !!nft.authorized
      },
      set(value) {
        const nft = this.selectedAuthNFT
        if (!nft) return
        if (nft.token) {
          nft.token.authorized = value
          return
        }
        nft.authorized = value
      }
    }
  },
  async mounted() {
    this.loadGlobalAuthNft()
  },

  methods: {
    // Initialize component - called on mount and when card changes
    satoshiToBch,
    getDarkModeClass,
    async initializeComponent() {
      this.isInitializing = true
      
      // Reset state first
      this.merchants = []
      this.displayLocation = null
      
      // Load saved data for this card
      
      // Load saved merchants from card storage
      this.loadSavedMerchants()
      
      // Load merchants if we have no saved merchants or they're expired
      if (this.merchants.length === 0) {
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
      })

      this.loadGlobalAuthNft()
    },

    mutateGlobalAuthNft(authorized, spendLimitSats) {
      this.$q.loading.show({
        message: this.$t('UpdatingGlobalAuthenticationNFT', {}, 'Updating Global Authentication NFT...'),
        spinnerColor: 'primary',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        customClass: 'q-loading-custom'
      })
      // mutate the globalAuthNft
      this.card.mutateGlobalAuthToken({ authorized, spendLimitSats })
        .then(async () => {
          await this.loadGlobalAuthNft()
          this.$q.dialog({
            title: this.$t('Success', {}, 'Success'),
            message: this.$t('GlobalAuthenticationNFTMutatedSuccessfully', {}, 'Global Authentication NFT has been mutated successfully.'),
            ok: true,
            class: `pt-card text-bow br-15 ${this.$q.dark.isActive ? 'dark' : 'light'}`
          })
        })
        .catch(err => {
          cardLogger.error('Error toggling global auth NFT:', err)
          this.$q.dialog({
            title: this.$t('Error', {}, 'Error'),
            message: `${this.$t('Error', {}, 'Error')}: ${err.message || err}`,
            ok: true,
            class: `pt-card text-bow br-15 ${this.$q.dark.isActive ? 'dark' : 'light'}`
          })
        })
        .finally(() => {
          this.loadingGlobalAuthNft = false
          this.$q.loading.hide()
        })
    },

    openEditGlobalSpendLimit() {
      this.globalSpendLimitError = ''
      this.globalSpendLimitInput = this.satoshiToBch(this.globalAuthNft.spendLimitSats || 0)
      this.showEditGlobalSpendLimitDialog = true
    },

    submitGlobalSpendLimit() {
      const spendLimit = parseFloat(this.globalSpendLimitInput)
      if (isNaN(spendLimit) || spendLimit < 0.00001) {
        this.globalSpendLimitError = this.$t('EnterValidSpendLimit', {}, 'Please enter a valid spend limit of at least 0.00001 BCH')
        return
      }
      const spendLimitSats = bchToSatoshi(this.globalSpendLimitInput)
      this.showEditGlobalSpendLimitDialog = false
      this.mutateGlobalAuthNft(null, spendLimitSats)
    },

    onSelectLocation() {
      return
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

      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${coords.latitude}&lon=${coords.longitude}`
        )
        const data = await response.json()
        const address = data?.address || {}
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
      }
    },

    onLocationDenied() {
      this.$q.notify({
        message: this.$t('EnableLocationInBrowser', {}, 'Location access is blocked. To allow it, go to your browser\'s site settings and enable location access for this site.'),
        caption: this.$t('UsingApproximateLocation', {}, 'Showing approximate location based on your IP address'),
        icon: 'location_disabled',
        color: 'warning',
        position: 'bottom',
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
          userLocationComponents.formatted = coordinates.label || [components.street, components.city, components.country].filter(Boolean).join(', ')
          this.$store.commit('card/setUserLocation', userLocationComponents)
          this.loadMerchantList({ reset: true }).then(() => this.saveMerchantsToCard())
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
          userLocationComponents.formatted = `${coordinates.lat}, ${coordinates.lng}`
        }
        this.$store.commit('card/setUserLocation', userLocationComponents)
        this.loadMerchantList({ reset: true }).then(() => this.saveMerchantsToCard())
      })
    },

    showFailedToLoadMerchants() {
      this.$q.notify({
        message: this.$t('FailedToLoadMerchants', {}, 'Failed to load merchants near your location'),
        color: 'red',
        icon: 'error',
        timeout: 4000,
      })
    },

    // Add exponential backoff retry for loading global auth NFT
    async loadGlobalAuthNft(interval = 1000, retries = 5) {
      this.loadingGlobalAuthNft = true
      try {
        const globalAuthNft = await this.card.getGlobalAuthNft()
        if (Object.keys(globalAuthNft).length > 0) {
          this.globalAuthNft = globalAuthNft
          return globalAuthNft
        }
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, interval))
          return this.loadGlobalAuthNft(interval * 2, retries - 1)
        }
      } catch (error) {
        cardLogger.error('Error loading global auth NFT:', error)
        this.globalAuthNft = { authorized: false }
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, interval))
          return this.loadGlobalAuthNft(interval * 2, retries - 1)
        }
      } finally {
        this.loadingGlobalAuthNft = false
      }
      cardLogger.log('Global Auth NFT loaded:', this.globalAuthNft)
    },

    async loadMerchantList(opts = {}) {
      // Use provided coordinates or fall back to store
      const locationCoords = opts.location || this.userLocation
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

      if (isReset) {
        this.loading = true
      } else {
        this.loadingMore = true
      }

      try {
        const params = {
          limit: this.merchantsPagination.limit,
          offset: this.merchantsPagination.offset,
          token_id: this.card?.authCategory,
          // location: locationCoords,
          // radius: this.radius
        }

        const response = await getMerchantsByCity(locationCoords.city, params)
        this.merchants = response.results

        // Update pagination - use the filtered count
        this.merchantsPagination = {
          count: response.count,
          limit: response.limit,
          offset: response.offset + response.results.length,
          hasMore: response.hasMore
        }

      } catch (error) {
        this.notifyError(this.$t('FailedToLoadMerchants', {}, 'Failed to load merchants near your location'));
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

    formatSpendLimit(value) {
      if (!value) return '0.0000';
      const num = parseFloat(value);
      if (isNaN(num)) return '0.0000';
      return num.toFixed(4);
    },

    formatSpendLimitFromSats(value) {
      const sats = Number(value)
      if (!Number.isFinite(sats) || sats < 0) return '0.0000'
      return (sats / 100000000).toFixed(4)
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
          message: this.$t('GenericAuthDisabledMessage', {}, 'Generic Auth NFT disabled - select specific merchants to authorize'),
          color: 'info',
          icon: 'info',
          timeout: 1500
        });
      }
    },

    cancelAllowAllMerchants() {
      this.showAllowAllMerchantsDialog = false;
    },

    onConfirmEnableGlobalAuthNft() {
      this.showAllowAllMerchantsDialog = false;
      this.mutateGlobalAuthNft(true, null)
    },

    async onMerchantToggle(merchant, enabled) {
      if (enabled) {
        // Start minting process
        this.mintingMerchants.add(merchant.id);
        this.mintingMerchants = new Set(this.mintingMerchants); // Trigger reactivity
        this.$q.loading.show({
          message: this.$t('MintingAuthNFTForMerchant', { merchantName: merchant.name }, `Minting auth NFT for ${merchant.name}...`),
          spinner: 'dots',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          color: 'white',
          customClass: 'manage-auth-loading',
          delay: 300
        });

        await this.card.issueMerchantAuthToken({ 
          merchant: {
            id: merchant.ref_id,
            pubkey: merchant.public_key,
          } 
        }).then(response => {
          cardLogger.log('Mint response:', response)

          // Show success message
          this.mintedMerchants.add(merchant.id);
          this.mintedMerchants = new Set(this.mintedMerchants);

          // Clear success message after 2 seconds
          setTimeout(() => {
            this.mintedMerchants.delete(merchant.id);
            this.mintedMerchants = new Set(this.mintedMerchants);
          }, 2000);
        }).catch(err => {
          this.$q.notify({
            message: this.$t('FailedToMintAuthNFTForMerchant', { merchantName: merchant.name }, `Failed to mint auth NFT for ${merchant.name}`),
            color: 'red',
            icon: 'error',
            timeout: 4000,
          })
        }).finally(() => {
          this.$q.loading.hide();

          // Minting complete
          this.mintingMerchants.delete(merchant.id);
          this.mintingMerchants = new Set(this.mintingMerchants);
        });
      }
      
      const action = enabled ? this.$t('Enabled', {}, 'enabled') : this.$t('Disabled', {}, 'disabled');
      this.$q.notify({
        message: `${merchant.name} ${action}`,
        color: enabled ? 'positive' : 'grey',
        icon: enabled ? 'check' : 'block',
        timeout: 1000
      });
    },

    openSpendLimitDialog(merchant) {
      this.selectedMerchant = merchant;
      this.spendLimitError = '';
      this.selectedNFT = {
        id: merchant.auth_nfts?.length > 0 ? merchant.auth_nfts[0].id : null
      }
      const initialNft = merchant.auth_nfts?.find(nft => nft.id === this.selectedNFT.id)
      const initialSpendLimitSats = initialNft?.token_data?.spend_limit_sats
      this.spendLimitInput = initialSpendLimitSats != null
        ? (Number(initialSpendLimitSats) / 100000000).toFixed(8)
        : (merchant.spendLimit || '1')
      this.showMutateAuthDialog = true;
    },

    closeSpendLimitDialog() {
      this.showMutateAuthDialog = false;
      this.selectedMerchant = null;
      this.spendLimitInput = '1';
      this.spendLimitError = '';
    },

    async submitMutation() {
      const spendLimit = parseFloat(this.spendLimitInput);

      if (isNaN(spendLimit) || spendLimit <= 0) {
        this.spendLimitError = this.$t('PleaseEnterValidAmountGreaterThanZero', {}, 'Please enter a valid amount greater than 0');
        return;
      }

      if (this.selectedMerchant) {
        this.selectedMerchant.spendLimit = spendLimit.toFixed(8);

        if (this.selectedAuthNFT?.token_data) {
          this.selectedAuthNFT.token_data.spend_limit_sats = Math.round(spendLimit * 100000000)
        }
        
        const mutation = {
          authorize: this.selectedNFTAuthorized,
          spendLimitSats: bchToSatoshi(this.spendLimitInput),
          merchant: {
            id: this.selectedMerchant.ref_id,
            pubkey: this.selectedMerchant.public_key,
          },
          broadcast: true
        }
        
        this.$q.loading.show({
          message: this.$t('UpdatingAuthNFTForMerchant', { merchantName: this.selectedMerchant.name }, `Updating auth NFT for ${this.selectedMerchant.name}...`),
          spinner: 'dots',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          color: 'white',
          customClass: 'manage-auth-loading',
          delay: 300
        });

        await this.card.mutateMerchantAuthToken(mutation).then(() => {
          this.$q.notify({
            message: this.$t('SpendLimitSetForMerchant', { spendLimit: this.selectedMerchant.spendLimit, merchantName: this.selectedMerchant.name }, `Spend limit set to ${this.selectedMerchant.spendLimit} BCH for ${this.selectedMerchant.name}`),
            color: 'positive',
            icon: 'check_circle',
            timeout: 1500
          });
        }).catch(err => {
          this.$q.notify({
            message: this.$t('FailedToUpdateAuthNFTForMerchant', { merchantName: this.selectedMerchant.name }, `Failed to update auth NFT for ${this.selectedMerchant.name}`),
            color: 'red',
            icon: 'error',
            timeout: 4000,
          })
        }).finally(() => {
          this.$q.loading.hide();
        });
      }

      this.closeSpendLimitDialog();
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
            message: `${this.$t('LocationSet', {}, 'Location set')}: ${data.display_name.substring(0, 50)}...`,
            color: 'positive',
            icon: 'check',
            timeout: 2000
          });
        }
      } catch (error) {
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
            message: `${this.$t('Found', {}, 'Found')}: ${result.display_name.substring(0, 50)}...`,
            color: 'positive',
            icon: 'check',
            timeout: 2000
          });
        } else {
          this.$q.notify({
            message: this.$t('LocationNotFound', {}, 'Location not found. Try a different search term.'),
            color: 'warning',
            icon: 'warning',
            timeout: 3000
          });
        }
      } catch (error) {
        this.$q.notify({
          message: this.$t('SearchFailed', {}, 'Search failed. Please try again.'),
          color: 'negative',
          icon: 'error',
          timeout: 3000
        });
      }
    },

    async confirmLocationUpdate() {
      if (!this.mapCoordinates || !this.mapCoordinates.latitude || !this.mapCoordinates.longitude) {
        this.$q.notify({
          message: this.$t('PleaseSelectLocationFirst', {}, 'Please select a location first'),
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
        formatted: this.mapCoordinates.formatted || this.$t('CustomLocation', {}, 'Custom location'),
        latitude: this.mapCoordinates.latitude,
        longitude: this.mapCoordinates.longitude
      };

      // Save location to card storage
      this.saveLocationToCard();

      // Update the store with new location
      this.$store.dispatch('marketplace/setSessionLocation', {
        formatted: this.mapCoordinates.formatted || this.$t('CustomLocation', {}, 'Custom location'),
        latitude: this.mapCoordinates.latitude,
        longitude: this.mapCoordinates.longitude
      });

      // Also update card store so merchant reload picks up the new location
      const address = this.mapCoordinates.address || {}
      this.$store.commit('card/setUserLocation', {
        ...(this.userLocation || {}),
        latitude: this.mapCoordinates.latitude,
        longitude: this.mapCoordinates.longitude,
        formatted: this.mapCoordinates.formatted || '',
        location: address.suburb || address.city_district || address.town || '',
        street: address.road || address.street || '',
        city: address.city || address.town || address.village || address.county || '',
        country: address.country || ''
      });

      // Reload merchants with new location
      await this.loadMerchantList({ reset: true });
      this.saveMerchantsToCard();

      this.$q.notify({
        message: this.$t('LocationUpdatedSuccessfully', {}, 'Location updated successfully. Reloading nearby merchants...'),
        color: 'positive',
        icon: 'location_on',
        timeout: 3000
      });
    },

    // Save location to card storage
    saveLocationToCard() {
      
      if (!this.card || !this.card.id) {
        return;
      }
      
      const locationData = {
        displayLocation: this.displayLocation,
        timestamp: new Date().toISOString()
      };
      
      const cardId = String(this.card.id);
      
      // CardStorage.setCardProperty(cardId, 'merchantLocation', locationData);
      
      // Verify it was saved
      // const verify = CardStorage.getCardProperty(cardId, 'merchantLocation');
    },

    // Load saved location from card storage
    loadSavedLocation() {      
      const cardId = String(this.card.id);
      
      // Debug: Check localStorage directly
      const rawStorage = localStorage.getItem('mock_subcards');
      const allCards = rawStorage ? JSON.parse(rawStorage) : [];
      const thisCard = allCards.find(c => String(c.id) === cardId);
      if (thisCard) {
      }
      
      // const savedLocation = CardStorage.getCardProperty(cardId, 'merchantLocation');
      
      if (savedLocation && savedLocation.displayLocation) {
        // Check if saved location is not too old (e.g., 7 days)
        const savedTime = new Date(savedLocation.timestamp);
        const now = new Date();
        const daysDiff = (now - savedTime) / (1000 * 60 * 60 * 24);
        
        if (daysDiff < 7) {
          this.displayLocation = savedLocation.displayLocation;
          this.$store.commit('card/setUserLocation', {
            latitude: savedLocation.displayLocation.latitude,
            longitude: savedLocation.displayLocation.longitude,
            formatted: savedLocation.displayLocation.formatted || ''
          });
        }
      }
    },

    // Save merchants to card storage
    saveMerchantsToCard() {
      if (!this.card || !this.card.id || this.merchants.length === 0) {
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
    },

    // Load saved merchants from card storage
    loadSavedMerchants() {
      if (!this.card || !this.card.id) {
        return;
      }
      
      const cardId = String(this.card.id);
      const savedData = CardStorage.getCardProperty(cardId, 'merchantList');
      
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
    },
    selectedNFT(val) {
    },
    'selectedNFT.id'(val) {
      const nft = this.selectedMerchant?.auth_nfts?.find(item => item.id === val)
      const spendLimitSats = nft?.token?.spend_limit_sats
      if (spendLimitSats != null) {
        this.spendLimitInput = (Number(spendLimitSats) / 100000000).toFixed(8)
      }
    }
  }
}
</script>

<style lang="scss">
  @import "src/css/app-card.scss";
</style>

<style lang="scss" scoped>
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
    border-radius: 14px;
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
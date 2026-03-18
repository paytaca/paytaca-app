<template>
  <div class="full-width">
    <!-- Search bar -->
    <div class="row items-center q-mb-md q-gutter-x-sm">
      <div class="col">
        <q-input 
          v-model="search" 
          label="Search merchants..." 
          outlined 
          dense
          :dark="$q.dark.isActive"
        >
          <template v-slot:append>
            <q-icon name="search" />
          </template>
        </q-input>
      </div>
    </div>

    <!-- Generic Auth NFT Toggle -->
    <div 
      class="row items-center justify-between q-pa-md border-outlined br-10 q-mb-md"
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
    <div class="text-subtitle2 q-mb-sm" :class="textColor">Merchants</div>
    
    <div class="scroll" style="height: 350px;">
      <div v-if="filteredMerchants.length > 0">
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
              <q-tooltip v-if="merchant.isEnabled && !genericAuthEnabled && merchant.spendLimit" anchor="top middle" self="bottom middle">
                Spend Limit: {{ formatSpendLimit(merchant.spendLimit) }} BCH
              </q-tooltip>
              <div 
                class="text-weight-bold"
                :class="genericAuthEnabled 
                  ? textColorGrey
                  : textColor"
              >
                {{ merchant.name }}
                <span v-if="merchant.isEnabled && !genericAuthEnabled && merchant.spendLimit" class="text-caption text-secondary q-ml-xs">
                  ({{ formatSpendLimit(merchant.spendLimit) }} BCH)
                </span>
              </div>
              <div 
                class="text-caption text-weight-bold"
                :class="genericAuthEnabled 
                  ? ($q.dark.isActive ? 'text-grey-4' : 'text-grey-5') 
                  : ($q.dark.isActive ? 'text-grey-4' : 'text-grey')"
              >
                {{ merchant.address }}
              </div>
            </q-item-section>
            <q-item-section side>
              <q-toggle 
                v-model="merchant.isEnabled"
                :disable="genericAuthEnabled"
                :color="genericAuthEnabled 
                  ? ($q.dark.isActive ? 'grey-6' : 'grey-5') 
                  : 'secondary'"
                @update:model-value="(val) => onMerchantToggle(merchant, val)"
              />
            </q-item-section>
          </q-item>
        </q-list>
      </div>
      <div v-else class="text-center q-pa-xl" :class="$q.dark.isActive ? 'text-grey-5' : 'text-grey'">
        No merchants found
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
            Available Balance: {{ card?.balance }} BCH
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
import { getMerchantList, CardStorage } from './noBackend.js'

export default {
  name: 'ManageAuthNFTs',
  props: {
    card: { type: Object, required: true }
  },
  data() {
    return {
      search: '',
      genericAuthEnabled: true, // Toggled ON by default
      genericSpendLimit: '1', // Global spend limit for generic auth NFT
      merchants: [],
      showSpendLimitDialog: false,
      selectedMerchant: null,
      spendLimitInput: '1',
      spendLimitError: ''
    }
  },
  computed: {
    filteredMerchants() {
      let list = [...this.merchants];
      if (this.search) {
        const s = this.search.toLowerCase();
        list = list.filter(m => m.name.toLowerCase().includes(s));
      }
      return list;
    }
  },
  mounted() {
    this.loadMerchantList();
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
    async loadMerchantList() {
      try {
        const response = await getMerchantList({ limit: 1000, page: 1 });
        console.log('Merchant list API response:', response);
        const merchantData = response.results || response;
        console.log('Total merchants:', merchantData.length);
        console.log('Merchant names:', merchantData.map(m => m.name));
        
        this.merchants = merchantData.map(merchant => ({
          ...merchant,
          isEnabled: false,
          wasEnabledBeforeGeneric: false,
          spendLimit: null
        }));
      } catch (error) {
        console.error('Failed to load merchant list:', error);
        this.notifyError('Failed to load merchants');
      }
    },

    formatSpendLimit(value) {
      if (!value) return '0';
      return parseFloat(value).toFixed(3);
    },

    onGenericAuthToggle(enabled) {
      if (enabled) {
        // When Generic Auth is enabled, all merchants are authorized
        // Store previous states before overwriting
        this.merchants.forEach(m => {
          m.wasEnabledBeforeGeneric = m.isEnabled; // preserve previous state
          m.isEnabled = true; // Show as enabled when generic auth is on
        });
        this.notifySuccess('Generic Auth NFT enabled - all merchants are authorized', { icon: 'check_circle' });
      } else {
        // When Generic Auth is disabled, restore previous merchant states
        this.merchants.forEach(m => {
          m.isEnabled = m.wasEnabledBeforeGeneric || false;
        });
        this.$q.notify({
          message: 'Generic Auth NFT disabled - select specific merchants to authorize',
          color: 'info',
          icon: 'info'
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
        
        // Save merchant spend limits to localStorage
        if (this.card && this.card.id) {
          const card = CardStorage.getCardById(this.card.id);
          if (card) {
            // Store merchant spend limits
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
          icon: 'check_circle'
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
          icon: 'error'
        });
        return;
      }

      this.genericSpendLimit = spendLimit.toFixed(8);
      
      // Save to localStorage
      if (this.card && this.card.id) {
        CardStorage.setCardProperty(this.card.id, 'genericSpendLimit', this.genericSpendLimit);
      }
      
      this.$q.notify({
        message: `Global spend limit set to ${this.genericSpendLimit} BCH`,
        color: 'positive',
        icon: 'check_circle'
      });
    }
  }
}
</script>

<style lang="scss" scoped>
  @import "./createCard.scss"
</style>

<template>
  <q-card
    class="sale-round-card q-pa-md cursor-pointer"
    :class="[
      getDarkModeClass(darkMode),
      isSelected ? 'selected' : '',
      isRecommended ? 'recommended' : '',
      `theme-${theme}`
    ]"
    @click="$emit('select')"
  >
    <!-- Badge for recommended or status -->
    <div v-if="isRecommended || badge" class="badge-container">
      <q-badge 
        :color="badgeColor" 
        :label="badgeText"
        class="round-badge"
      />
    </div>
    
    <!-- Round Icon and Name -->
    <div class="row items-center q-mb-md">
      <q-icon :name="roundIcon" size="32px" :color="roundColor" class="q-mr-sm" />
      <div>
        <div class="text-h6 text-weight-bold">{{ roundName }}</div>
      </div>
    </div>
    
    <!-- Price -->
    <div class="price-section q-mb-md">
      <div class="text-caption text-grey-6">{{ $t('PricePerToken') }}</div>
      <div class="text-h5 text-weight-bold" :style="`color: ${getThemeColor()}`">
        ${{ price }} USD
      </div>
      <div v-if="priceInBch" class="text-caption">
        ≈ {{ priceInBch }} BCH
      </div>
    </div>
    
    <!-- Min Purchase -->
    <div class="q-mb-sm">
      <div class="row items-center justify-between">
        <span class="text-body2 text-grey-7">{{ $t('MinimumPurchase') }}:</span>
        <span class="text-body2 text-weight-medium">{{ formatNumber(minPurchase) }} LIFT</span>
      </div>
    </div>
    
    <!-- Vesting Info (Collapsible) -->
    <q-expansion-item
      dense
      :label="$t('VestingSchedule')"
      icon="schedule"
      header-class="text-caption text-grey-7"
      class="vesting-expansion q-mt-sm"
    >
      <div class="q-pa-sm text-caption">
        {{ vestingSchedule }}
      </div>
    </q-expansion-item>
    
    <!-- CTA Button -->
    <q-btn
      :label="$t('BuyNow')"
      rounded
      unelevated
      no-caps
      class="full-width q-mt-md text-bow button"
      :class="getDarkModeClass(darkMode)"
      @click.stop="$emit('reserve')"
    />
  </q-card>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

export default {
  name: 'SaleRoundCard',
  props: {
    roundName: String,
    roundIcon: {
      type: String,
      default: 'token'
    },
    roundColor: {
      type: String,
      default: 'primary'
    },
    price: Number,
    priceInBch: String,
    minPurchase: Number,
    vestingSchedule: String,
    isSelected: Boolean,
    isRecommended: Boolean,
    badge: String,
    theme: String
  },
  emits: ['select', 'reserve'],
  computed: {
    badgeText() {
      if (this.isRecommended) return this.$t('Recommended')
      return this.badge || ''
    },
    badgeColor() {
      if (this.isRecommended) return 'positive'
      return 'primary'
    },
    darkMode() {
      return this.$store.getters["darkmode/getStatus"]
    },
  },
  methods: {
    getDarkModeClass,
    formatNumber(num) {
      return new Intl.NumberFormat().format(num)
    },
    getThemeColor() {
      const themeColors = {
        'glassmorphic-blue': '#42a5f5',
        'glassmorphic-gold': '#ffa726',
        'glassmorphic-green': '#4caf50',
        'glassmorphic-red': '#f54270'
      }
      return themeColors[this.theme] || '#42a5f5'
    }
  }
}
</script>

<style lang="scss" scoped>
.sale-round-card {
  position: relative;
  border-radius: 16px;
  transition: all 0.3s ease;
  border: 2px solid transparent;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
  }
  
  &.selected {
    border-color: #42a5f5;
    box-shadow: 0 4px 12px rgba(66, 165, 245, 0.3);
  }
  
  &.recommended {
    background: linear-gradient(135deg, rgba(76, 175, 80, 0.1), transparent);
  }
  
  .badge-container {
    position: absolute;
    top: -8px;
    right: 12px;
    
    .round-badge {
      font-size: 11px;
      padding: 4px 12px;
      border-radius: 12px;
    }
  }
  
  .vesting-expansion {
    :deep(.q-item) {
      min-height: 32px;
      padding: 4px 0;
    }
  }
}
</style>


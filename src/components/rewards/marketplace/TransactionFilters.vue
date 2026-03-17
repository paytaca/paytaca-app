<template>
  <div class="filter-container">
    <!-- Tab Filter -->
    <div class="tabs-wrapper">
      <div 
        class="filter-tabs" 
        :class="getDarkModeClass(darkMode)"
      >
        <button
          class="filter-tab"
          :class="[
            darkMode ? 'dark' : '',
            { 'active-theme-btn': localActiveTab === 'all' },
            `theme-${theme}`
          ]"
          :style="localActiveTab === 'all' ? `background-color: ${getThemeColor()} !important; color: #fff !important;` : ''"
          @click="setTab('all')"
        >
          {{ $t('All') }}
        </button>
        <button
          class="filter-tab"
          :class="[
            darkMode ? 'dark' : '',
            { 'active-theme-btn': localActiveTab === 'orders' },
            `theme-${theme}`
          ]"
          :style="localActiveTab === 'orders' ? `background-color: ${getThemeColor()} !important; color: #fff !important;` : ''"
          @click="setTab('orders')"
        >
          {{ $t('Orders') }}
        </button>
        <button
          class="filter-tab"
          :class="[
            darkMode ? 'dark' : '',
            { 'active-theme-btn': localActiveTab === 'otc' },
            `theme-${theme}`
          ]"
          :style="localActiveTab === 'otc' ? `background-color: ${getThemeColor()} !important; color: #fff !important;` : ''"
          @click="setTab('otc')"
        >
          {{ $t('OTC') }}
        </button>
      </div>
    </div>

    <!-- Sort Control -->
    <div class="row items-center justify-between q-mt-sm">
      <div class="text-caption" :class="darkMode ? 'text-grey-6' : 'text-grey-8'">
        {{ $t('Showing') }} {{ displayCount }} {{ $t('transactions') }}
      </div>
      
      <q-btn
        flat
        dense
        :icon="sortDesc ? 'arrow_downward' : 'arrow_upward'"
        :label="sortDesc ? $t('Newest') : $t('Oldest')"
        size="sm"
        :class="darkMode ? 'text-grey-5' : 'text-grey-7'"
        @click="toggleSort"
      />
    </div>
  </div>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

export default {
  name: 'TransactionFilters',
  
  props: {
    modelValue: {
      type: String,
      default: 'all'
    },
    displayCount: {
      type: Number,
      default: 0
    },
    darkMode: {
      type: Boolean,
      default: false
    },
    sortDesc: {
      type: Boolean,
      default: true
    }
  },
  
  emits: ['update:modelValue', 'update:sortDesc', 'filter-changed'],
  
  computed: {
    localActiveTab: {
      get() {
        return this.modelValue
      },
      set(value) {
        this.$emit('update:modelValue', value)
        this.$emit('filter-changed', { type: value })
      }
    },
    
    theme() {
      return this.$store?.getters?.['global/theme'] || 'glassmorphic-blue'
    }
  },
  
  methods: {
    getDarkModeClass,
    
    setTab(tab) {
      this.localActiveTab = tab
    },
    
    toggleSort() {
      this.$emit('update:sortDesc', !this.sortDesc)
      this.$emit('filter-changed', { sortDesc: !this.sortDesc })
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
  }
}
</script>

<style lang="scss" scoped>
.filter-container {
  padding: 8px 0;
}

.tabs-wrapper {
  display: flex;
  justify-content: center;
  padding: 0 8px;
}

.filter-tabs {
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

.filter-tab {
  min-width: clamp(80px, 22vw, 100px);
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

// Active tab styles
.filter-tab.active-theme-btn {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.filter-tab.active-theme-btn.dark {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
}

// Theme-specific hover effects
.filter-tab.active-theme-btn.theme-glassmorphic-blue:hover {
  background-color: #1e88e5 !important;
}

.filter-tab.active-theme-btn.theme-glassmorphic-gold:hover {
  background-color: #fb8c00 !important;
}

.filter-tab.active-theme-btn.theme-glassmorphic-green:hover {
  background-color: #43a047 !important;
}

.filter-tab.active-theme-btn.theme-glassmorphic-red:hover {
  background-color: #e91e63 !important;
}
</style>

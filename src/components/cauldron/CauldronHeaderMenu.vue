<template>
  <div class="tabs-wrapper">
    <div 
      class="cauldron-tabs"
      :class="getDarkModeClass(darkMode)"
    >
      <button
        class="cauldron-tab"
        :class="[
          darkMode ? 'dark' : '',
          tabButtonClass('swap'),
          `theme-${theme}`
        ]"
        :style="activeTab === 'swap' ? `background-color: ${getThemeColor()} !important; color: #fff !important;` : ''"
        @click="navigateToTab('swap')"
      >
        <q-icon name="mdi-swap-horizontal" size="18px" class="q-mr-xs"/>
        {{ $t('Swap') }}
      </button>
      <button
        class="cauldron-tab"
        :class="[
          darkMode ? 'dark' : '',
          tabButtonClass('pools'),
          `theme-${theme}`
        ]"
        :style="activeTab === 'pools' ? `background-color: ${getThemeColor()} !important; color: #fff !important;` : ''"
        @click="navigateToTab('pools')"
      >
        <q-icon name="mdi-water" size="18px" class="q-mr-xs"/>
        {{ $t('Pools') }}
      </button>
    </div>
  </div>
</template>
<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { computed, defineComponent } from 'vue'
import { useStore } from 'vuex'
import { useRoute, useRouter } from 'vue-router'

export default defineComponent({
  name: 'CauldronHeaderMenu',
  setup() {
    const $store = useStore()
    const $route = useRoute()
    const $router = useRouter()
    const darkMode = computed(() => $store.getters['darkmode/getStatus'])
    const theme = computed(() => $store.getters['global/theme'])

    const activeTab = computed(() => {
      if ($route.name === 'app-cauldron') return 'swap'
      if (['app-cauldron-pools', 'app-cauldron-add-pool', 'app-cauldron-pool'].includes($route.name)) return 'pools'
      return null
    })

    function tabButtonClass(tab) {
      return activeTab.value === tab ? 'active-theme-btn' : ''
    }

    function getThemeColor() {
      const themeMap = {
        'glassmorphic-blue': '#42a5f5',
        'glassmorphic-green': '#4caf50',
        'glassmorphic-gold': '#ffa726',
        'glassmorphic-red': '#f54270'
      }
      return themeMap[theme.value] || '#42a5f5'
    }

    function navigateToTab(tab) {
      if (tab === 'swap') {
        $router.push({ name: 'app-cauldron' })
      } else if (tab === 'pools') {
        $router.push({ name: 'app-cauldron-pools' })
      }
    }

    return {
      darkMode,
      theme,
      activeTab,
      tabButtonClass,
      getThemeColor,
      navigateToTab,
      getDarkModeClass,
    }
  },
})
</script>

<style lang="scss" scoped>
.tabs-wrapper {
  display: flex;
  justify-content: center;
  padding: 0 8px;
}

.cauldron-tabs {
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

.cauldron-tab {
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

.cauldron-tab.active-theme-btn {
  color: #fff !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.cauldron-tab.active-theme-btn.theme-glassmorphic-blue {
  background-color: #42a5f5 !important;
}

.cauldron-tab.active-theme-btn.theme-glassmorphic-gold {
  background-color: #ffa726 !important;
}

.cauldron-tab.active-theme-btn.theme-glassmorphic-green {
  background-color: #4caf50 !important;
}

.cauldron-tab.active-theme-btn.theme-glassmorphic-red {
  background-color: #f54270 !important;
}

.cauldron-tab.active-theme-btn.dark {
  color: #fff !important;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
}

.cauldron-tab.active-theme-btn.theme-glassmorphic-blue:hover {
  background-color: #1e88e5 !important;
}

.cauldron-tab.active-theme-btn.theme-glassmorphic-gold:hover {
  background-color: #fb8c00 !important;
}

.cauldron-tab.active-theme-btn.theme-glassmorphic-green:hover {
  background-color: #43a047 !important;
}

.cauldron-tab.active-theme-btn.theme-glassmorphic-red:hover {
  background-color: #e91e63 !important;
}
</style>
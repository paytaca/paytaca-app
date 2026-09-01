<template>
    <div id="app-container" class="ai-admin-page" :class="getDarkModeClass(darkMode)">
        <HeaderNav title="AI Admin" backnavpath="/apps" class="header-nav" />

        <!-- Tabs Section -->
        <div class="tabs-wrapper q-mt-sm q-mb-sm pt-header">
            <div 
            class="ai-admin-tabs" 
            :class="[getDarkModeClass(darkMode), { 'disabled': !isloaded }]"
            >
                <button
                    class="ai-admin-tab"
                    :class="[
                    darkMode ? 'dark' : '',
                    tabButtonClass('api-keys'),
                    `theme-${theme}`,
                    { 'disabled': !isloaded || contentLoading }
                    ]"
                    :style="activeTab === 'api-keys' ? `background-color: ${getThemeColor()} !important; color: #fff !important;` : ''"
                    :disabled="!isloaded"
                    @click="changeTab('api-keys')"
                >
                    <!-- <q-icon name="mdi-key" size="18px" class="q-mr-xs"/> -->
                    API Keys
                </button>
                <button
                    class="ai-admin-tab"
                    :class="[
                    darkMode ? 'dark' : '',
                    tabButtonClass('sessions'),
                    `theme-${theme}`,
                    { 'disabled': !isloaded || contentLoading }
                    ]"
                    :style="activeTab === 'sessions' ? `background-color: ${getThemeColor()} !important; color: #fff !important;` : ''"
                    :disabled="!isloaded"
                    @click="changeTab('sessions')"
                >
                    <!-- <q-icon name="mdi-timer" size="18px" class="q-mr-xs"/> -->
                    Sessions
                </button>
            </div>
        </div>

        <!-- Tab Content -->
        <div class="ai-admin-content">
            <router-view :key="$route.path"></router-view>
        </div>
    </div>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { bus } from 'src/wallet/event-bus.js'
import HeaderNav from 'src/components/header-nav.vue'

export default {
    data () {
        return {
            darkMode: this.$store.getters['darkmode/getStatus'],
            activeTab: 'api-keys',
            isloaded: false,
            contentLoading: false 
        }
    },
    computed: {
        theme () {
            return this.$store.getters['global/theme']
        },
    },
    components: {
        HeaderNav
    },
    async created () {
      bus.on('ai-admin:loading', this.onContentLoading)
    },
    beforeUnmount () {
        bus.off('ai-admin:loading', this.onContentLoading)
    },
    mounted () {
        const vm = this

        console.log('route name: ' + vm.$route.name)

        // if at index, redirect to keys page
        if (vm.$route.name === 'app-ai-admin') {
            vm.$router.replace({ name: 'ai-admin-keys' })
        }

        vm.isloaded = true
    },
    methods: {
        getDarkModeClass,
        tabButtonClass (tab) {
            return this.activeTab === tab ? 'active-theme-btn' : ''
        },
        getThemeColor () {
            const themeMap = {
                'glassmorphic-blue': '#42a5f5',
                'glassmorphic-green': '#4caf50',
                'glassmorphic-gold': '#ffa726',
                'glassmorphic-red': '#f54270'
            }
            return themeMap[this.theme] || '#42a5f5'
        },
        changeTab (tab) {
            this.activeTab = tab
            if (tab === 'api-keys') {
                this.$router.replace({ name: 'ai-admin-keys' })
            } else if (tab === 'sessions') {
                this.$router.replace({ name: 'ai-admin-sessions' })
            }
        },
        onContentLoading (isLoading) {
            this.contentLoading = isLoading
        }
    }
}
</script>

<style lang="scss" scoped>
.ai-admin-page {
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
}

.ai-admin-tabs {
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

.ai-admin-tab {
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

.ai-admin-tab.disabled {
    opacity: 0.5;
    cursor: not-allowed;
    pointer-events: none;
}

// Theme-based active tab styles
.ai-admin-tab.active-theme-btn {
  color: #fff !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.ai-admin-tab.active-theme-btn.theme-glassmorphic-blue {
  background-color: #42a5f5 !important;
}

.ai-admin-tab.active-theme-btn.theme-glassmorphic-gold {
  background-color: #ffa726 !important;
}

.ai-admin-tab.active-theme-btn.theme-glassmorphic-red {
  background-color: #f54270 !important;
}

.ai-admin-tab.active-theme-btn.theme-glassmorphic-green {
  background-color: #4caf50 !important;
}

.ai-admin-skeleton .br-10 {
  border-radius: 10px;
}

.ai-admin-skeleton .br-15 {
  border-radius: 15px;
}

.pt-header {
  padding-top: 10px;
}
</style>
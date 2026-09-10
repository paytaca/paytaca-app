<template>
    <div id="app-container" class="ai-admin-page" :class="getDarkModeClass(darkMode)">
        <HeaderNav 
          title="AI Admin" 
          :backnavpath="isBuyFormPage ? { name: 'ai-admin-sessions' } : '/apps'" 
          class="header-nav" 
        />

        <!-- Tabs Section -->
        <div v-if="!isBuyFormPage" class="tabs-wrapper q-mt-sm q-mb-sm pt-header">
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

  
        <!-- Error State -->
        <div v-if="(authError || pageError) && !isBuyFormPage" class="auth-error-container q-pa-lg text-center">
            <q-icon name="mdi-alert-circle-outline" size="48px" :color="darkMode ? 'orange' : 'negative'" />
            <p class="q-mt-md text-body1" :class="darkMode ? 'text-white' : 'text-grey-8'">
                {{ pageError || 'Unable to authenticate' }}
            </p>
            <p class="text-caption q-mt-xs" :class="darkMode ? 'text-grey-5' : 'text-grey-6'" v-if="authError && !pageError">
                {{ $t('CheckWalletConnection') }}
            </p>
            <q-btn
                unelevated
                rounded
                :color="darkMode ? 'grey-8' : 'grey-1'"
                :text-color="darkMode ? 'white' : 'black'"
                class="q-mt-md"
                :label="$t('Retry')"
                icon="mdi-refresh"
                @click="retryAuth"
            />
        </div>


        <!-- Tab Content -->
        <div v-else class="ai-admin-content">
            <router-view :key="$route.path"></router-view>
        </div>
    </div>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { bus } from 'src/wallet/event-bus.js'
import HeaderNav from 'src/components/header-nav.vue'
import * as AIAdminUtils from 'src/utils/ai-admin-utils.js'

export default {
    data () {
        return {
            darkMode: this.$store.getters['darkmode/getStatus'],
            activeTab: 'api-keys',
            isloaded: false,
            contentLoading: false,
            authError: false,
            pageError: null
        }
    },
    computed: {
        theme () {
            return this.$store.getters['global/theme']
        },
        isBuyFormPage () {
          return this.$route.name === 'ai-admin-buy-form'
      }
    },
    components: {
        HeaderNav
    },
    async created () {
      bus.on('ai-admin:loading', this.onContentLoading)
      bus.on('ai-admin:error', this.onPageError)
    },
    beforeUnmount () {
        bus.off('ai-admin:loading', this.onContentLoading)
        bus.off('ai-admin:error', this.onPageError)
    },
    async mounted () {
      const vm = this

      console.log('route name: ' + vm.$route.name)

      // if at index, redirect to keys page
      if (vm.$route.name === 'app-ai-admin') {
        vm.$router.replace({ name: 'ai-admin-keys' })
      }

      // Selecting proper tab
      if (vm.$route.name === 'ai-admin-sessions') {
        vm.activeTab = 'sessions'
      }

      // Authenticate before enabling tabs
      const authOk = await AIAdminUtils.authUser()
      if (authOk) {
          vm.isloaded = true
      } else {
        vm.authError = true
        vm.$q.notify({ type: 'negative', message: 'Unable to authenticate. Please try again.', timeout: 5000 })
      }
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
        },
        async retryAuth () {
          this.authError = false
          this.pageError = null
          this.isloaded = false
          const authOk = await AIAdminUtils.authUser()
          if (authOk) {
            this.isloaded = true
          } else {
            this.authError = true
            this.$q.notify({ type: 'negative', message: 'Unable to authenticate. Please try again.', timeout: 5000 })
          }
        },
        onPageError (error) {
          this.pageError = error
        },
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
<template>
  <div class="cash-in-swap">
    <div class="tabs-wrapper q-mb-md" v-if="showTabs">
      <div class="crypto-swap-tabs" :class="getDarkModeClass(darkMode)">
        <button
          class="crypto-swap-tab"
          :class="[darkMode ? 'dark' : '', tabButtonClass('swap'), `theme-${theme}`]"
          :style="activeTab === 'swap' ? `background-color: ${getThemeColor()} !important; color: #fff !important;` : ''"
          @click="activeTab = 'swap'"
        >
          {{ $t('Swap') }}
        </button>
        <button
          class="crypto-swap-tab"
          :class="[darkMode ? 'dark' : '', tabButtonClass('history'), `theme-${theme}`]"
          :style="activeTab === 'history' ? `background-color: ${getThemeColor()} !important; color: #fff !important;` : ''"
          @click="activeTab = 'history'"
        >
          {{ $t('History') }}
        </button>
      </div>
    </div>

    <cash-in-swap-history v-if="activeTab === 'history'" />

    <template v-else>
      <div v-if="checkingPermission" class="q-mx-md">
        <q-skeleton type="rect" height="300px" style="border-radius: 15px;" />
        <q-skeleton type="rect" height="140px" class="q-mt-md" style="border-radius: 15px;" />
        <div class="row q-py-md justify-center">
          <q-skeleton type="text" width="50%" />
        </div>
        <q-skeleton type="rect" height="50px" style="border-radius: 25px;" />
      </div>
      <RampShiftForm
        v-else
        ref="shiftForm"
        mode="cashin"
        lock-settle
        :is-allowed="isAllowed"
        :settle-address-override="settleAddress"
        :allowed-deposit-coins="allowedDepositCoins"
        v-on:update:state="onStateChange"
      />
    </template>
  </div>
</template>

<script>
import RampShiftForm from 'src/components/ramp/crypto/RampShiftForm.vue'
import CashInSwapHistory from 'src/components/cash-in/CashInSwapHistory.vue'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

let shiftPermission = null

function loadShiftPermission (axios) {
  if (!shiftPermission) {
    shiftPermission = axios
      .get('https://sideshift.ai/api/v2/permissions')
      .then(resp => Boolean(resp && resp.data && resp.data.createShift))
      .catch(() => {
        // Unknown answer: let the form surface the transport error instead of blocking
        shiftPermission = null
        return true
      })
  }
  return shiftPermission
}

export default {
  name: 'CashInSwap',
  components: {
    RampShiftForm,
    CashInSwapHistory
  },
  props: {
    settleAddress: {
      type: String,
      default: ''
    },
    allowedDepositCoins: {
      type: Array,
      default: null
    }
  },
  emits: ['update:state', 'created'],
  data () {
    return {
      checkingPermission: true,
      isAllowed: true,
      legState: 'form',
      createdEmitted: false,
      activeTab: 'swap'
    }
  },
  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    theme () {
      return this.$store.getters['global/theme']
    },
    showTabs () {
      return this.legState === 'form'
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
    async loadPermission () {
      const allowed = await loadShiftPermission(this.$axios)
      if (this.$.isUnmounted) return
      this.isAllowed = allowed
      this.checkingPermission = false
    },
    onStateChange (state) {
      this.legState = state
      this.$emit('update:state', state)
      if (state === 'deposit' && !this.createdEmitted) {
        this.createdEmitted = true
        this.$emit('created')
      }
    },
    reset () {
      this.createdEmitted = false
      this.legState = 'form'
      this.activeTab = 'swap'
      if (this.$refs.shiftForm) this.$refs.shiftForm.reset()
    }
  },
  mounted () {
    this.loadPermission()
  }
}
</script>

<style lang="scss" scoped>
.tabs-wrapper {
  display: flex;
  justify-content: center;
}

.crypto-swap-tabs {
  display: inline-flex;
  gap: 8px;
  background-color: rgb(242, 243, 252);
  border-radius: 28px;
  padding: 6px;

  &.dark {
    background-color: rgba(255, 255, 255, 0.1);
  }
}

.crypto-swap-tab {
  min-width: 110px;
  height: 44px;
  border-radius: 22px;
  border: none;
  color: #4C4F4F;
  background-color: transparent;
  outline: 0;
  cursor: pointer;
  transition: all 0.3s;
  font-weight: 500;
  font-size: 14px;
  padding: 0 16px;
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

.crypto-swap-tab.active-theme-btn {
  color: #fff !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.crypto-swap-tab.active-theme-btn.dark {
  color: #fff !important;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
}
</style>

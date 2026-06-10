<template>
  <div class="static-container">
    <div id="app-container" class="text-bow" :class="getDarkModeClass(darkMode)">
      <HeaderNav
        :title="$t('Card')"
        backnavpath="/apps"
        class="q-px-sm apps-header"
      />
      <div class="q-mx-md q-mt-md">
        <!-- Title -->
        <div 
          class="text-h6 text-bow text-center q-mb-md q-pa-sm auth-nfts-title-container"
          :class="darkMode ? 'glassmorphic-dark' : 'glassmorphic-light'"
        >
          <q-icon name="verified_user" color="primary" size="1.4rem" class="q-mr-sm" />
          Authentication NFTs
        </div>
        
        <!-- Search and Add New -->
        <div 
          class="row items-center q-mb-md q-pa-sm q-gutter-x-sm auth-nfts-search-container"
          :class="darkMode ? 'glassmorphic-dark' : 'glassmorphic-light'"
        >
          <div class="col">
            <q-input 
              v-model="searchQuery"
              label="Search by merchant..." 
              dense
              borderless
              :dark="darkMode"
              clearable
              class="auth-nfts-input"
            >
              <template v-slot:prepend>
                <q-icon name="search" :color="darkMode ? 'grey-5' : 'grey-7'" />
              </template>
            </q-input>
          </div>
          <q-btn
            color="primary"
            icon="add_circle"
            label="New"
            dense
            no-caps
            unelevated
            @click="showTerminalList = true"
            class="auth-nfts-btn"
          />
        </div>

        <!-- Loading -->
        <div v-if="loading" class="text-center q-pa-md">
          <q-item v-for="n in 3" :key="n" class="q-px-md q-py-sm q-mb-sm" :class="darkMode ? 'glassmorphic-dark' : 'glassmorphic-light'" style="border-radius: 12px;">
            <q-item-section>
              <q-skeleton type="text" width="150px" class="q-mb-xs" />
              <q-skeleton type="text" width="200px" height="12px" />
            </q-item-section>
            <q-item-section side><q-skeleton type="QToggle" /></q-item-section>
          </q-item>
        </div>

        <!-- Empty State -->
        <div 
          v-else-if="filteredTokens.length === 0" 
          class="text-center q-pa-xl auth-nfts-empty-state" 
          :class="darkMode ? 'glassmorphic-dark' : 'glassmorphic-light'"
        >
          <q-icon name="verified_user" size="48px" class="q-mb-md" :color="darkMode ? 'grey-6' : 'grey-5'" />
          <div class="text-weight-medium text-h6" :class="darkMode ? 'text-grey-4' : 'text-grey-7'">No authentication NFTs found</div>
          <div class="text-caption q-mt-sm" :class="darkMode ? 'text-grey-6' : 'text-grey-6'">
            Add a new terminal to get started
          </div>
        </div>

        <!-- Auth Tokens List -->
        <div v-else class="scroll auth-nfts-list" style="max-height: 500px; overflow-y: auto;">
          <q-list separator :dark="darkMode">
            <q-item 
              v-for="(token, index) in filteredTokens" 
              :key="token.id" 
              class="q-px-md auth-nfts-merchant-item q-mb-sm"
              :class="{ 
                'clickable-merchant': true,
                'glassmorphic-light': !darkMode,
                'glassmorphic-dark': darkMode,
                'authorized-glow': token.authorized
              }"
              clickable
            >
              <q-item-section>
                <div class="row items-center q-gutter-x-sm q-mb-xs">
                  <q-icon 
                    :name="token.authorized ? 'verified' : 'gpp_maybe'" 
                    :color="token.authorized ? 'positive' : 'grey'"
                    size="1.2rem"
                  />
                  <div 
                    class="text-weight-bold"
                    :class="token.authorized ? (darkMode ? 'text-white' : 'text-grey-10') : (darkMode ? 'text-grey-6' : 'text-grey-7')"
                  >
                    {{ token?.terminal?.merchant_name }}
                  </div>
                </div>
                <div class="text-caption q-pl-xl" :class="darkMode ? 'text-grey-5' : 'text-grey-7'">
                  <q-icon name="terminal" size="0.9rem" class="q-mr-xs" />
                  Terminal {{ token?.terminal?.terminal_number || 'N/A' }}
                </div>
              </q-item-section>
              <q-item-section side>
                <q-btn
                  dense
                  no-caps
                  unelevated
                  :color="token.authorized ? 'positive' : 'grey-7'"
                  :icon="token.authorized ? 'verified_user' : 'gpp_bad'"
                  :label="token.authorized ? 'Active' : 'Inactive'"
                  @click="onToggleAuthorization(index, token)"
                  class="auth-nfts-status-btn"
                  :class="{ 'active-btn': token.authorized }"
                />
              </q-item-section>
            </q-item>
          </q-list>
        </div>

        <!-- Status message -->
        <div 
          class="text-caption q-mt-md text-center q-pa-sm auth-nfts-status-message"
          :class="darkMode ? 'glassmorphic-dark text-grey-4' : 'glassmorphic-light text-grey-7'"
        >
          <q-icon name="shield" size="0.9rem" class="q-mr-xs" />
          {{ filteredTokens.length }} authentication NFT{{ filteredTokens.length !== 1 ? 's' : '' }} found
        </div>
      </div>
    </div>
    <TerminalList 
      v-if="showTerminalList" 
      :card-info="cardInfo"
      :wallet-info="walletInfo"
      @dialog-hide="showTerminalList = false"
    />
  </div>
</template>

<script>
import HeaderNav from 'components/header-nav'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import TerminalList from 'src/components/card/TerminalList.vue'
import AuthTokenManager, { decodeCommitment } from 'src/services/card/auth-nft'
import { TapToPay } from 'src/services/card/tap-to-pay'
import Card from 'src/services/card/card'

export default {
  components: {
    HeaderNav,
    TerminalList
  },
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      authTokens: [],
      loading: false,
      showTerminalList: false,
      cardInfo: null,
      walletInfo: null,
      searchQuery: '',
    }
  },
  computed: {
    filteredTokens() {
      if (!this.searchQuery) return this.authTokens;
      const query = this.searchQuery.toLowerCase();
      return this.authTokens.filter(token => 
        token?.terminal?.merchant_name?.toLowerCase().includes(query) ||
        token?.terminal?.terminal_number?.toLowerCase().includes(query)
      );
    }
  },
  mounted() {
    // Get the data from router state
    this.cardInfo = history.state?.cardInfo || null;
    this.walletInfo = history.state?.walletInfo || null;
    console.log('walletInfo:', this.walletInfo)

    if (this.cardInfo) {
      this.loadAuthTokens();
    }
  },
  methods: {
    getDarkModeClass,
    showLoading(message) {
      this.$q.loading.show({
        message: message,
        boxClass: this.darkMode ? 'bg-grey-9 text-grey-2' : 'bg-grey-2 text-grey-9'
      });
    },
    hideLoading() {
      this.$q.loading.hide();
    },
    async loadAuthTokens() {
      console.log('cardInfo:', this.cardInfo);
      
      // Add your auth token loading logic here
      const response = await fetchAuthNFTs(this.walletInfo?.walletHash)
      const authTokens = response.results.filter(token => token.terminal)
      this.authTokens = authTokens.map(token => {
        const { authorized } = decodeCommitment(token.commitment)
        return {
          ...token,
          authorized: authorized || false
        }
      }) || []
    },
    async onToggleAuthorization(index, token) {
      this.$q.dialog({
        title: 'Confirm Authorization Change',
        message: `Are you sure you want to ${token.authorized ? 'revoke' : 'grant'} authorization for ${token.terminal.merchant_name}?`,
        ok: {
          label: 'Yes',
          color: 'primary'
        },
        cancel: {
          label: 'No',
          color: 'secondary'
        }
      }).onOk(async () => {
        await this.toggleAuth(index, token)
      })
    },
    async toggleAuth (index, token) {
      this.showLoading('Processing...')
      try {
        const contractId = this.cardInfo.contract_id
        const decodedCommitment = decodeCommitment(token.commitment)

        const mutations = [{
          id: token.terminal.id,
          pubkey: token.terminal.public_key,
          authorized: !decodedCommitment?.authorized,
          expirationBlock: decodedCommitment?.expirationBlock,
          spendLimitSats: decodedCommitment?.spendLimitSats
        }]

        const card = new Card(
          this.walletInfo.wif,
          this.walletInfo.walletIndex,
          this.walletInfo.walletHash
        )

        const { serverResponse } = await card.mutateAuthTokens(contractId, mutations)
        const updatedToken = serverResponse
        const { authorized } = decodeCommitment(serverResponse.commitment)
        updatedToken.authorized = authorized || false
        this.authTokens[index] = updatedToken
        this.hideLoading();

      } catch (error) {
        this.hideLoading();
        this.$q.dialog({
          title: 'Error',
          message: error.message
        })
      }
    }
  },
}
</script>

<style lang="scss" scoped>
  @import "src/css/app-card.scss";
</style>

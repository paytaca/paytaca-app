<template>
  <div class="static-container">
    <div id="app-container" class="text-bow" :class="getDarkModeClass(darkMode)">
      <HeaderNav
        :title="$t('Card')"
        backnavpath="/apps"
        class="q-px-sm apps-header"
      />
      <div class="q-mx-lg">
        <div class="row items-center q-mt-md">
          <div class="col">
            <!-- Title -->
            <div class="row justify-center text-h6 text-bow">Authentication NFTs</div>
            
            
            <!-- Search -->
            <div class="row justify-center q-mt-sm q-mx-md">
              <q-input class="col" dense label="Search by merchant..">
                <template v-slot:append>
                  <q-btn flat dense icon="search" class="cursor-pointer" />
                </template>
              </q-input>
              <q-btn
                flat
                dense
                size="md"
                icon="add_circle"
                class="col-auto q-ml-sm"
                color="primary"
                label="new"
                @click="showTerminalList = true"
              />
            </div>

            <!-- <div class="row justify-end q-mx-md">
              <q-btn
                flat
                dense
                icon="add"
                class="q-ml-sm col-auto"
                color="primary"
                label="issue"
              />
            </div> -->

            <!-- Loading -->
            <div v-if="loading" class="row justify-center q-mt-lg">
              <q-spinner color="primary" size="40px" class="q-mr-md" />
            </div>

            <div v-if="!loading" class="q-ma-md">
              <div v-if="authTokens.length == 0" class="row justify-center" style="margin-top: 50%;">
                <div class="text-subtitle2 text-bow" style="opacity: 0.5;">No authentication NFTs found.</div>
              </div>
              <div v-else>
                <div v-for="token in authTokens" :key="token.id" class="row q-my-sm">
                  <q-card class="col my-card">
                    <q-card-section>
                      <div class="row">
                        <div class="col q-pr-sm text-h12">{{ token.terminal.merchant_name }}</div>
                        <q-btn
                          flat
                          dense
                          no-caps
                          outline
                          class="col-auto"
                          v-model="token.enabled"
                          :label="token.enabled ? 'Enabled' : 'Disabled'"
                          :icon="token.enabled ? 'check' : 'close'"
                        />
                      </div>
                    </q-card-section>
                  </q-card>
                </div>
              </div>
            </div>
          </div>
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
import { fetchAuthNFTs } from 'src/services/card/api'
import { decodeCommitment } from 'src/services/card/auth-token'

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
      walletInfo: null
    }
  },
  mounted() {
    // Get the data from router state
    this.cardInfo = history.state?.cardInfo || null;
    this.walletInfo = history.state?.walletInfo || null;
    
    if (this.cardInfo) {
      this.loadAuthTokens();
    }
  },
  methods: {
    getDarkModeClass,
    async loadAuthTokens() {
      // Add your auth token loading logic here
      const response = await fetchAuthNFTs(this.walletInfo?.walletHash)
      this.authTokens = response.results.map(token => {
        console.log('token:', token)
        // const decodedCommitment = decodeCommitment(token.commitment)
        // console.log('decodedCommitment:', decodedCommitment)
        return {
          ...token,
          enabled: token.enabled || false
        }
      }) || []
      console.log('Fetched auth tokens:', response);
    }
  },
}
</script>

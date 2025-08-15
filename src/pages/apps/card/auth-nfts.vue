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
                        <div class="col q-pr-sm q-py-sm text-h12">{{ token?.terminal?.merchant_name }}</div>
                        <q-btn
                          flat
                          dense
                          no-caps
                          outline
                          class="col-auto q-ma-none"
                          v-model="token.authorized"
                          :label="token.authorized ? 'Authorized' : 'Unauthorized'"
                          :icon="token.authorized ? 'verified_user' : 'gpp_bad'"
                          @click="onToggleAuthorization(token)"
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
import AuthTokenManager, { decodeCommitment } from 'src/services/card/auth-token'
import { Wallet } from 'mainnet-js'
import { Contract } from '@mainnet-cash/contract';
import { SignatureTemplate } from 'cashscript'
import { binToHex } from '@bitauth/libauth'
import { loadWallet } from 'src/wallet'
import { pubkeyToPkHash } from 'src/services/card/utils'
import { TapToPay } from 'src/services/card/tap-to-pay'

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
    async onToggleAuthorization(token) {      
      console.log('onToggleAuthorization:', token)

      try {
        const contractId = this.cardInfo.contract_id
        const tapToPay = new TapToPay(contractId)
        const decodedCommitment = decodeCommitment(token.commitment)

        const params = {
          senderWif: this.walletInfo.wif,
          mutations: [{
            id: token.terminal.id,
            pubkey: token.terminal.public_key,
            authorized: !decodedCommitment?.authorized,
            expirationBlock: decodedCommitment?.expirationBlock,
            spendLimitSats: decodedCommitment?.spendLimitSats
          }]
        }

        const response = await tapToPay.mutate(params)
        console.log('Mutation response:', response)
      } catch (error) {
        this.$q.dialog({
          title: 'Error',
          message: error.message
        })
      }
    }
  },
}
</script>

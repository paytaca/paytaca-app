<template>
  <div class="static-container">
    <div id="app-container" class="text-bow" :class="getDarkModeClass(darkMode)">
      <HeaderNav
          :title="$t('Card')"
          backnavpath="/apps"
          class="q-px-sm apps-header"
      />
      <div class="row justify-center items-center" style="height: 60vh;">
        <div v-if="loading" class="row justify-center items-center">
          <q-spinner color="primary" size="40px" class="q-mr-md" />
          <div class="text-h6 text-bow q-mt-md">Loading Card Info...</div>
        </div>
        <div v-else>
          <div v-if="cardInfo" class="row q-mt-lg">
            <q-card class="col-auto" style="border-radius: 15px;">
              <q-card-section class="text-center">

                <!-- Action button -->
                <div class="row justify-end">
                  <q-btn-dropdown flat dense dropdown-icon="more_horiz">
                    <q-list class="q-mt-sm">
                      <q-item clickable @click="onManageAuthTokens">
                        Manage Auth Tokens
                      </q-item>
                    </q-list>
                  </q-btn-dropdown>
                </div>

                <!-- Card title -->
                <div class="text-h6 text-bow">
                  <q-icon name="img:lift-token.png" size="sm" color="primary" />
                  Paytaca Card
                </div>
              
                <!-- QR code -->
                <qr-code class="q-mt-md q-mx-lg q-px-md" :text="address" :size="150" />
                
                <!-- Balance -->
                <div class="text-h6 text-bow q-mt-sm">
                  <span class="text-primary">
                    {{ cardInfo?.balance }} BCH
                  </span>
                </div>

                <!-- Address -->
                <div class="row justify-center text-nowrap text-bow q-mt-sm"
                  style="letter-spacing: 1px;"
                  @click="copyToClipboard(isCt ? address : addressAmountFormat)"
                  :class="getDarkModeClass(darkMode)">
                  {{ address.substring(0, 16) }}...{{ address.substring(address.length - 4) }} <q-icon name="fas fa-copy" style="font-size: 14px;" />
                </div>

                <div class="row flex-center">
                  <q-toggle
                    v-model="isCt"
                    class="text-bow"
                    style="margin: sm;"
                    keep-color
                    color="teal-5"
                    size="md"
                    :class="getDarkModeClass(darkMode)"
                    :label="$t('CashToken')"
                  />
                </div>
              </q-card-section>
              <q-card-actions class="justify-center">
                <div class="row">
                  <q-btn
                    size="md"
                    label="Cash In"
                    color="primary"
                    :style="{ width: '125px' }"
                    class="col q-mb-lg"
                  />
                </div>
              </q-card-actions>
            </q-card>
          </div>
          <div v-else class="col-10 text-center">
            <div class="text-h6 text-bow-muted q-mb-lg">No Card Found</div>
            <q-btn
              class="q-mt-md"
              no-caps
              icon="mdi-card-plus"
              dense
              size="lg"
              label="Create Card"
              padding="sm"
              color="primary"
              :loading="createCardLoading"
              @click="onCreateCard()"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script>
import HeaderNav from 'components/header-nav'
import { fetchCard, createCard, createAuthNFTs } from 'src/services/card/api.js';
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils';
import { loadWallet } from 'src/wallet';
import { getPrivateKey, getPublicKey } from 'src/utils/wallet';
import AuthTokenManager from 'src/services/card/auth-token';

export default {
  components: {
    HeaderNav
  },
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      cardInfo: null,
      isCt: false,
      loading: false,
      createCardLoading: false
    }
  },
  computed: {
    address () {
      return this.isCt ? this.cardInfo?.tokenaddr : this.cardInfo?.cashaddr
    },
    addressAmountFormat () {
      // Add your address formatting logic here if needed
      return this.address
    }
  },
  async mounted () {
    this.loading = true;
    await this.fetchCard();
    this.loading = false;
  },
  methods: {
    getDarkModeClass,
    async onManageAuthTokens() {
      console.log('Manage Auth Tokens clicked');
      const walletHash = this.$store.getters['global/getWallet']('bch')?.walletHash;
      const privateKey = await this.getPrivateKey();
      this.$router.push({ 
        name: 'card-auth-nfts',
        state: { 
          cardInfo: JSON.parse(JSON.stringify(this.cardInfo)),
          walletInfo: { 
            walletHash: walletHash,
            wif: privateKey
          }
        }
      });
    },
    showLoading(message) {
      this.$q.loading.show({
        message: message,
        boxClass: this.darkMode ? 'bg-grey-9 text-grey-2' : 'bg-grey-2 text-grey-9'
      });
    },
    hideLoading() {
      this.$q.loading.hide();
    },
    async onCreateCard() {
      // Mint genesis token first
      let category;
      try {
        this.showLoading("Minting genesis token...");
        const result = await this.mintGenesisToken();
        category = result.tokenId;
        
        const nftData = result.utxos[0];
        const walletHash = this.$store.getters['global/getWallet']('bch')?.walletHash;
        const nftPayload = {
            txid: nftData.txid,
            wallet_hash: walletHash,
            category: nftData.token?.tokenId,
            capability: nftData.token?.capability,
            commitment: nftData.token?.commitment,
            satoshis: nftData.satoshis,
            amount: nftData.token?.amount
        }
        console.log('Creating Auth NFTs with payload:', nftPayload);
        await createAuthNFTs(nftPayload).catch(error => {
          console.error('Error creating auth NFTs:', error);
          this.hideLoading();
          this.$q.dialog({
            title: 'Error',
            message: `Failed to create Auth NFTs. ${error.message || ''}`,
          });
        });

      } catch (error) {
        console.error('Error minting genesis token:', error);
        this.hideLoading();
        this.$q.dialog({
          title: 'Error',
          message: `Failed to mint Genesis Token. ${error.message || ''}`,
        });
      }

      if (!category) {
        console.error('No category returned from mintGenesisToken');
        return;
      }

      this.showLoading("Creating card...");
      await this.createCard(category);
      this.hideLoading();
    },
    async mintGenesisToken () {
      const privateKey = await this.getPrivateKey();
      const authTokenManager = new AuthTokenManager(privateKey);
      const result = await authTokenManager.genesis();
      console.log('genesis result:', result);
      const utxos = await authTokenManager.getTokenUtxos(result.tokenIds[0]);
      console.log('NFT Data:', utxos);
      return { tokenId: result.tokenIds[0], utxos };
    },
    async getPrivateKey () {
      const isChipnet = this.$store.getters['global/isChipnet'];
      const privateKey = await getPrivateKey('bch', isChipnet ? 'chipnet' : 'mainnet');
      return privateKey;
    },
    async getPublicKey() {
      const isChipnet = this.$store.getters['global/isChipnet'];
      const publicKey = await getPublicKey('bch', isChipnet ? 'chipnet' : 'mainnet');
      return publicKey;
    },
    async fetchCard () {
      const walletHash = this.$store.getters['global/getWallet']('bch')?.walletHash;
      console.log('Fetching card info for walletHash:', walletHash);
      await fetchCard(walletHash)
        .then(response => {
          console.log('Card info fetched:', response);
          this.cardInfo = {
            id: response.id,
            category: response.category,
            cashaddr: response.cash_address,
            tokenaddr: response.token_address,
            balance: response.balance
          };
          console.log('Card info:', this.cardInfo);
        })
        .catch(error => {
          console.error('Error fetching card info:', error);
        });
    },
    async createCard (category) {
      const walletIndex = this.$store.getters['global/getWalletIndex'];
      const wallet = await loadWallet('BCH', walletIndex)
      const walletHash = wallet.BCH.walletHash;
      const addressIndex = 0;
      const pubkey = await wallet.BCH.getPublicKey(`0/${addressIndex}`)
      
      const data = {
        wallet_hash: walletHash,
        public_key: pubkey,
        category: category
      };
      
      console.log('Creating card with data:', data);
      await createCard(data).then(async (response) => {
        console.log('Card created successfully:', response);
        this.$q.notify({
          message: 'Card created successfully',
          color: 'positive',
          position: 'top'
        });

        setTimeout(async () => {
          this.createCardLoading = false;
          this.loading = true;
          await this.fetchCard();
          this.loading = false;
        }, 500);

      }).catch(error => {
        console.error('Error creating card:', error?.response || error);
        this.$q.notify({
          message: 'Failed to create card',
          color: 'negative',
          position: 'top'
        });
      })
    },
    copyToClipboard (text) {
      navigator.clipboard.writeText(text).then(() => {
        this.$q.notify({
          message: 'Address copied to clipboard',
          color: 'positive',
          position: 'top'
        })
      }).catch(() => {
        this.$q.notify({
          message: 'Failed to copy address',
          color: 'negative',
          position: 'top'
        })
      })
    }
  }
}
</script>
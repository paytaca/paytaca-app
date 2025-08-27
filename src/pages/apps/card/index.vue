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
import Card from 'src/services/card/card.js';
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils';
import { loadWallet } from 'src/wallet';
import { getPrivateKey, getPrivateKeyAt, getPublicKey, getPublicKeyAt } from 'src/utils/wallet';
import { publicKeyToP2pkhCashAddress } from 'bitauth-libauth-v3';

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
            wif: privateKey,
            walletIndex: this.$store.getters['global/getWalletIndex']
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
      try {
        // Initialize Card instance
        const privateKey = await this.getPrivateKey();
        const walletIndex = this.$store.getters['global/getWalletIndex'];
        const walletHash = this.$store.getters['global/getWallet']('bch')?.walletHash;
        const publicKey = await this.getPublicKey();
        
        const card = new Card(privateKey, walletIndex, walletHash);
        
        // Complete card creation workflow
        this.showLoading("Creating card...");
        const result = await card.createCard(publicKey);
        
        console.log('✅ Card created successfully:', result);
        this.$q.notify({
          message: 'Card created successfully',
          color: 'positive',
          position: 'top'
        });

        // Refresh the card info
        setTimeout(async () => {
          this.loading = true;
          await this.fetchCard();
          this.loading = false;
        }, 500);
        
      } catch (error) {
        console.error('❌ Error in card creation process:', error);
        this.$q.dialog({
          title: 'Error',
          message: `Failed to create card. ${error.message || ''}`,
        });
      } finally {
        this.hideLoading();
      }
    },
    async getPrivateKey () {
      const addressIndex = 0;
      const isChipnet = this.$store.getters['global/isChipnet'];
      const privateKey = await getPrivateKeyAt('bch', isChipnet ? 'chipnet' : 'mainnet', addressIndex);
      return privateKey;
    },
    async getPublicKey() {
      const addressndex = 0;
      const isChipnet = this.$store.getters['global/isChipnet'];
      const publicKey = await getPublicKeyAt('bch', isChipnet ? 'chipnet' : 'mainnet', addressndex);
      return publicKey;
    },
    async fetchCard () {
      const walletHash = this.$store.getters['global/getWallet']('bch')?.walletHash;
      const card = new Card(null, null, walletHash); // Only need walletHash for fetching
      
      try {
        const response = await card.fetchCardInfo();
        console.log('Card info fetched:', response);
        this.cardInfo = {
          id: response.id,
          category: response.category,
          cashaddr: response.cash_address,
          tokenaddr: response.token_address,
          balance: response.balance,
          contract_id: response.contract_id
        };
        console.log('Card info:', this.cardInfo);
      } catch (error) {
        console.error('Error fetching card info:', error);
      }
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
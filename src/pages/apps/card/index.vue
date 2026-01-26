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
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils';
import { getPrivateKeyAt, getPublicKeyAt } from 'src/utils/wallet';
import { loadCardUser } from 'src/services/card/auth';
import Card from 'src/services/card/card.js';

export default {
  components: {
    HeaderNav
  },
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      cards: [],
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
    console.log('Mounted Card Page');
    try {
      // load user, login if not authenticated
      const user = await loadCardUser();
      console.log('Card User:', user); 

      // load cards of authenticated user
      this.cards = await user.fetchCards();
      console.log('Cards:', this.cards);

      // Print and fetch info, tokenUtxos, bchUtxos, and contract for each card
      // for (const card of this.cards) {
      //   console.log('================')
      //   console.log('Card:', card);
      //   // const tokenUtxos = await card.getTokenUtxos();
        // console.log('Card tokenUtxos:', tokenUtxos);
        // const bchUtxos = await card.getBchUtxos();
        // console.log('Card bchUtxos:', bchUtxos);
        // const contract = await card.getContract()
        // console.log('Card contract:', contract);
      const authNfts = await this.cards[this.cards.length - 1].getAuthNfts();
      console.log('Card authNfts:', authNfts);
      
    } catch (error) {
      console.error('Error during card user load:', error);
    }
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
        this.showLoading("Creating card...");
        this.card = new Card();
        const result = await this.card.create();
        this.hideLoading();
        
        console.log('✅ Card created successfully:', result);
        this.$q.notify({
          message: 'Card created successfully',
          color: 'positive',
          position: 'top'
        });

        console.log('card:', this.card);
        
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
      const addressIndex = 0;
      const isChipnet = this.$store.getters['global/isChipnet'];
      const publicKey = await getPublicKeyAt('bch', isChipnet ? 'chipnet' : 'mainnet', addressIndex);
      return publicKey;
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
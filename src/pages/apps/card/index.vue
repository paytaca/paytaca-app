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

                <!-- More actions button -->
                <div class="row justify-end">
                  <q-btn-dropdown flat dense dropdown-icon="more_horiz">
                    <q-list class="q-my-sm">
                      <q-item dense clickable @click="$router.push({name: 'card-auth-nfts'})">
                        Manage Auth NFTs
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
              @click="createCard()"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script>
import HeaderNav from 'components/header-nav'
import { fetchCard, createCard } from 'src/services/card';
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils';
import { loadWallet } from 'src/wallet';

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
    },
    async fetchCard () {
      const walletHash = this.$store.getters['global/getWallet']('bch')?.walletHash;
      console.log('Fetching card info for walletHash:', walletHash);
      await fetchCard(walletHash)
        .then(response => {
          console.log('Card info fetched:', response);
          this.cardInfo = {
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
    async createCard () {
      this.createCardLoading = true;
      const walletIndex = this.$store.getters['global/getWalletIndex'];
      const wallet = await loadWallet('BCH', walletIndex)
      const walletHash = wallet.BCH.walletHash;
      const addressIndex = 0;
      const pubkey = await wallet.BCH.getPublicKey(`0/${addressIndex}`)
      const data = {
        wallet_hash: walletHash,
        public_key: pubkey
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
        this.createCardLoading = false;
        console.error('Error creating card:', error?.response || error);
        this.$q.notify({
          message: 'Failed to create card',
          color: 'negative',
          position: 'top'
        });
      })
    }
  }
}
</script>
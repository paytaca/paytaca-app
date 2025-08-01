<template>
  <div class="static-container">
    <div id="app-container" class="text-bow" :class="getDarkModeClass(darkMode)">
      <HeaderNav
          :title="$t('Card Management')"
          backnavpath="/apps"
          class="q-px-sm apps-header"
      />
      <div class="row justify-center items-center" style="height: 60vh;">
        <div class="col-10 text-center q-gutter-lg">
          <q-card style="border-radius: 15px; min-height: 200px;">
            <q-card-section class="text-center">
              <div class="text-h6 text-bow">
                <q-icon name="img:lift-token.png" size="sm" color="primary" />
                Paytaca Card
              </div>
            
              <!-- QR code -->
              <qr-code class="q-mt-md" :text="address" size="150" />
              
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
                />
                <q-img @click="isCt = true" src="ct-logo.png" height="20px" width="20px" />
                <span @click="isCt = true">&nbsp;{{ $t('CashToken') }}</span>
              </div>
            </q-card-section>
          </q-card>
          <div class="text-h6 text-bow-muted">No Card Found</div>
          <q-btn
            no-caps
            icon="mdi-card-plus"
            dense
            size="lg"
            label="Create Card"
            padding="sm"
            color="primary"
          />
        </div>
      </div>
    </div>
  </div>
</template>
<script>
import HeaderNav from 'components/header-nav'
import { fetchCardInfo } from 'src/services/card';
import { createCard } from 'src/services/card/api';
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils';

export default {
  components: {
    HeaderNav
  },
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      cardInfo: {
        cashaddr: "",
        tokenaddr: ""
      },
      isCt: false
    }
  },
  computed: {
    address () {
      return this.isCt ? this.cardInfo?.tokenaddr : this.cardInfo?.cashaddr
    }
  },
  mounted () {
    this.createCard();
    this.fetchCard();
  },
  methods: {
    getDarkModeClass,
    fetchCard () {
      const walletHash = this.$store.getters['global/getWallet']('bch')?.walletHash;
      console.log('Fetching card info for walletHash:', walletHash);
      fetchCardInfo(walletHash)
        .then(response => {
          console.log('Card info fetched:', response);
          this.cardInfo.cashaddr = response.cash_address;
          this.cardInfo.tokenaddr = response.token_address;
          this.cardInfo.balance = response.balance;
          console.log('Card info:', this.cardInfo);
        })
        .catch(error => {
          console.error('Error fetching card info:', error);
        });
    },
    createCard () {
      const wallet = this.$store.getters['global/getWallet']('bch');
      const walletHash = wallet.walletHash;
      console.log('wallet:', wallet);
      // createCard({
      //   wallet_hash: walletHash,
      //   public_key: wallet.publicKey
      // })
    }
  }
}
</script>
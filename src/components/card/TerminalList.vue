<template>
  <div>
    <q-dialog class="br-12 text-bow" v-model="showDialog" full-width @before-hide="onDialogHide">
      <q-card class="q-pa-md" style="height: 80vh;">
        <q-card-section class="text-h6 text-center">
          <div>Select Merchants</div>
          <!-- <div class="text-subtitle2" style="opacity: 0.6; font-size: 12px;">Select the merchants you want to allow for this card</div> -->
        </q-card-section>
        <q-card-section class="q-px-md q-py-none">
          <q-input
            v-model="searchQuery"
            dense
            outlined
            rounded
            debounce="300"
            placeholder="Search">
            <template v-slot:append>
              <q-icon name="search" class="cursor-pointer" />
            </template>
          </q-input>
        </q-card-section>
        <q-card-section>
          <div class="row justify-center" v-if="terminals.length === 0">
            <div class="text-subtitle2 text-bow" style="opacity: 0.5;">No terminals found.</div>
          </div>
          <div v-else>
            <q-list>
              <q-item clickable v-for="terminal in terminals" :key="terminal?.id" @click="onSelectTerminal(terminal)">
                <q-item-section>
                  <div class="row">
                    <span class="col">{{ terminal?.merchant_name }} </span>
                    <q-checkbox
                      dense
                      class="col-auto q-px-sm q-ma-none"
                      :model-value="terminal.selected"
                      color="primary"
                      @click.stop="onSelectTerminal(terminal)"
                    />
                  </div>
                </q-item-section>
              </q-item>
            </q-list>
          </div>
        </q-card-section>
        <q-card-actions class="justify-center" style="position: absolute; bottom: 0; width: 90%;">
          <q-btn
            class="q-mb-md"
            color="primary"
            :label="`Authorize (${selectedTerminals.length}/${issuanceBatchCount})`"
            :disabled="!terminals.some(t => t.selected)"
            :loading="loadingAuthorizeBtn"
            @click="onAuthorize"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script>
import { createAuthNFTs, fetchTerminals, fetchUnissuedTerminals } from 'src/services/card/api';
import AuthTokenManager, { decodeCommitment, encodeTerminalHash } from 'src/services/card/auth-token';
import { Wallet } from 'mainnet-js';

export default {
  props: {
    cardInfo: {
      type: Object,
      required: true
    },
    walletInfo: {
      type: Object,
      required: true
    }
  },
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      terminals: [],
      selectedTerminals: [],
      issuanceBatchCount: 10,

      showDialog: false,
      loadingAuthorizeBtn: false
    }
  },
  emits: ['dialogHide'],
  async mounted () {
    await this.fetchTerminals()
    this.showDialog = true; // Show the dialog after fetching terminals
  },
  methods: {
    showLoading(message) {
      this.$q.loading.show({
        message: message,
        boxClass: this.darkMode ? 'bg-grey-9 text-grey-2' : 'bg-grey-2 text-grey-9'
      });
    },
    hideLoading() {
      this.$q.loading.hide();
    },
    onDialogHide() {
      this.showDialog = false;
      this.$emit('dialogHide');
    },
    onSelectTerminal(terminal) {
      if (this.selectedTerminals.includes(terminal)) {
        this.selectedTerminals = this.selectedTerminals.filter(t => t !== terminal);
        terminal.selected = false;
        return;
      }

      if (this.selectedTerminals.length === this.issuanceBatchCount) {
        return; // Limit to 10 terminals
      }
      this.selectedTerminals.push(terminal);
      terminal.selected = true;
    },
    async fetchTerminals () {
      try {
        const response = await fetchUnissuedTerminals(this.cardInfo.id);
        console.log('Fetched terminals:', response);
        this.terminals = response.results.map(terminal => ({
          id: terminal.id,
          merchant_name: terminal.merchant_name,
          public_key: terminal.public_key,
          selected: false
        })) || [];
      } catch (error) {
        console.error('Error fetching terminals:', error);
      }
    },
    async onAuthorize() {
      if (this.selectedTerminals.length === 0) {
        console.warn('No terminals selected for authorization');
        return;
      }
      
      try {
        this.showLoading('Minting authorization NFTs')
        const txid = await this.mintAuthNfts()

        this.showLoading('Saving authorization NFTs')
        const authNfts = await this.fetchAuthNftUtxos(txid)
        const createSaveNftPayload = await this.buildSaveNftPayload(authNfts)
        await createAuthNFTs(createSaveNftPayload)

        this.showLoading('Issuing authorization NFTs')
        await this.issueAuthNfts(authNfts)

        await this.fetchTerminals()
      } catch (error) {
        console.error('Error issuing authorization NFTs:', error.response || error);
      }

      this.hideLoading();
    },
    async mintAuthNfts() {
      const tokenManager = new AuthTokenManager(this.walletInfo.wif)
      const nftPayloads = this.selectedTerminals.map(terminal => ({
          id: terminal.id,
          pubkey: terminal.public_key,
        }
      ));
      const response = await tokenManager.mint({ tokenId: this.cardInfo.category, terminals: nftPayloads })
      return response.txId
    },
    async fetchAuthNftUtxos(txid) {
      const wallet = await Wallet.fromWIF(this.walletInfo.wif)
      const utxos = await wallet.getTokenUtxos(this.cardInfo.category)
      const authNfts = utxos.filter(utxo => utxo.token.capability === 'mutable' && utxo.txid === txid)
      return authNfts
    },
    async buildSaveNftPayload (authNfts) {
      const terminalHashes = {}
      this.selectedTerminals.forEach(terminal => {
        const encodedTerminalHash = encodeTerminalHash({
          terminalId: terminal.id,
          terminalPk: terminal.public_key,
        });
        terminalHashes[encodedTerminalHash] = terminal.id;
      });

      const createNftpayload = authNfts.map(nft => {
        const { hash } = decodeCommitment(nft.token.commitment)
        return {
          txid: nft.txid,
          wallet_hash: this.walletInfo.walletHash,
          category: nft.token.tokenId,
          capability: nft.token.capability,
          commitment: nft.token.commitment,
          satoshis: nft.satoshis,
          amount: nft.token.amount,
          card_id: this.cardInfo.id,
          terminal_id: terminalHashes[hash]
        }
      })
      return createNftpayload
    },
    async issueAuthNfts(authNfts) {
      const tokenManager = new AuthTokenManager(this.walletInfo.wif)
      const recipients = []
      for (const nft of authNfts) {
        recipients.push({
          address: this.cardInfo?.tokenaddr,
          tokenId: nft.token.tokenId,
          capability: nft.token.capability,
          commitment: nft.token.commitment
        })
      }
      const response = await tokenManager.issue({ recipients })
      return response
    }
  }
}

</script>
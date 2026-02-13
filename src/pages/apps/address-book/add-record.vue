<template>
  <div
    id="app-container"
    class="sticky-header-container text-bow"
    :class="getDarkModeClass(darkMode)"
  >
    <HeaderNav
      class="apps-header"
      backnavpath="/apps/address-book/"
      :title="$t('AddressBook')"
      id="header-nav"
    />

    <div class="q-px-md page-content">
      <!-- Action Buttons Header -->
      <div class="action-header q-mb-lg" id="action-buttons">
        <div class="row justify-between items-center q-py-sm">
          <span class="text-weight-bold col-6" style="font-size: 17px;">
            {{ $t('AddNewContact').toLocaleUpperCase() }}
          </span>

          <div class="row justify-end items-center q-gutter-sm col-auto">
            <q-btn
              round
              flat
              :outline="!favorite"
              :icon="favorite ? 'mdi-star' : 'mdi-star-outline'"
              :color="favorite ? 'amber' : 'primary'"
              @click="favorite = !favorite"
              :aria-label="favorite ? $t('RemoveFromFavorites') : $t('AddToFavorites')"
            />
      
            <q-btn
              rounded
              class="save-button"
              :label="$t('Create')"
              color="primary"
              padding="sm md"
              @click="saveRecord"
              :aria-label="$t('CreateNewContact')"
              :disabled="!canSaveRecord || isLoading"
              :loading="isLoading"
            />
          </div>
        </div>
      </div>

      <!-- Name Input Card -->
      <record-name-input-card v-model="recordName" />

      <!-- Addresses Section Card -->
      <addresses-form-card v-model="addresses" />
    </div>
  </div>
</template>

<script>
import { Address } from 'watchtower-cash-js';
import { encryptMemo } from 'src/utils/transaction-memos';
import { addNewRecord } from 'src/utils/address-book-utils';
import { ensureKeypair } from 'src/utils/memo-service';
import { getWalletHash } from 'src/utils/wallet-storage';
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { raiseNotifyError, raiseNotifySuccess } from 'src/utils/notify-utils';

import HeaderNav from 'src/components/header-nav.vue'
import RecordNameInputCard from 'src/components/address-book/RecordNameInputCard.vue';
import AddressesFormCard from 'src/components/address-book/AddressesFormCard.vue';

export default {
  name: 'AddRecord',

  components: {
    HeaderNav,
    RecordNameInputCard,
    AddressesFormCard
  },

  data () {
    return {
      recordName: '',
      favorite: false,
      addresses: [],
      showQrScanner: false,
      isLoading: false
    }
  },

  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },

    canSaveRecord () {
      return Boolean(this.recordName)
    }
  },

  methods: {
    getDarkModeClass,

    async saveRecord () {
      this.isLoading = true
      const payload = { address_book: {}, addresses: [] }

      // encrypt the recordName
      try {
        const keypair = await ensureKeypair()
        const encryptedName = await encryptMemo(keypair.privkey, keypair.pubkey, this.recordName)
        if (!encryptedName) throw new Error('Failed to encrypt record name')

        payload.address_book.name = encryptedName
        payload.address_book.is_favorite = this.favorite
        payload.address_book.wallet_hash = getWalletHash()
      } catch (error) {
        console.error('Error ensuring keypair or encrypting record name:', error)
        raiseNotifyError(this.$t('EncryptNameError'), 3000, 'top')
        return
      }

      // parse address type of addresses
      for (const address of this.addresses) {
        const addressObj = new Address(address.address)
        if (addressObj.isTokenAddress()) {
          payload.addresses.push({ address: address.address, address_type: 'ct' })
        } else {
          payload.addresses.push({ address: address.address, address_type: 'bch' })
        }
      }

      const newRecordId = await addNewRecord(payload)
      if (newRecordId > -1) {
        raiseNotifySuccess(this.$t('CreateContactSuccess'), 2000, 'top')
        this.$router.push(`view-record/${newRecordId}/`)
      } else {
        raiseNotifyError(this.$t('CreateContactError'), 3000, 'top')
      }

      this.isLoading = false
    }
  }
}
</script>

<style lang="scss" scoped>
#app-container {
  height: 100vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.page-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.action-header {
  border-bottom: 2px solid rgba(0, 0, 0, 0.08);
  margin: 0 -16px;
  padding: 0 16px;
  transition: all 0.3s ease;
  flex-shrink: 0;

  .dark & {
    border-bottom: 2px solid rgba(255, 255, 255, 0.1);
  }

  .favorite-btn-active {
    background: rgba(255, 193, 7, 0.2);
    border: 1px solid rgba(255, 193, 7, 0.4);
  }

  .save-button {
    font-weight: 600;
    letter-spacing: 0.5px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    transition: all 0.2s ease;

    &:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    &:active {
      transform: translateY(0);
    }
  }
}
</style>
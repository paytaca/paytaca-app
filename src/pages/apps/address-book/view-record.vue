<template>
  <div
    id="app-container"
    class="sticky-header-container text-bow"
    :class="getDarkModeClass(darkMode)"
  >
    <header-nav
      class="apps-header"
      backnavpath="/apps/address-book/"
      :title="$t('AddressBook')"
      id="header-nav"
    />

    <div class="q-px-md">
      <!-- Loading skeleton -->
      <div v-if="loading" class="q-mt-sm">
        <q-card class="q-pa-md q-mb-md record-card">
          <q-skeleton type="text" width="60%" class="q-mb-md" />
          <q-skeleton type="text" width="40%" />
          <q-separator class="q-my-md" />
          <div class="row justify-evenly">
            <q-skeleton type="circle" size="40px" />
            <q-skeleton type="circle" size="40px" />
            <q-skeleton type="circle" size="40px" />
          </div>
        </q-card>
        <q-skeleton type="rect" height="200px" class="q-mb-sm" />
      </div>

      <!-- Error state -->
      <div v-else-if="error" class="q-mt-sm">
        <q-card class="q-pa-md record-card">
          <div class="text-center">
            <q-icon name="error_outline" size="48px" color="negative" class="q-mb-md" />
            <p class="text-h6 q-mb-xs">{{ $t('UnableToLoadContact') }}</p>
            <q-btn
              outline
              color="primary"
              :label="$t('Retry')"
              @click="loadRecord"
              class="q-mt-md"
            />
          </div>
        </q-card>
      </div>

      <!-- Main content -->
      <template v-else>
        <!-- record details -->
        <div class="q-mt-sm">
          <q-card id="record-details" class="q-pa-md q-mb-md record-card">
            <!-- name and date created -->
            <div class="text-left q-mb-md">
              <p class="text-h6 q-mb-xs">{{ record.name }}</p>
              <div class="text-caption q-mb-none">
                <span>
                  {{ $t(
                    'CreatedDate',
                    { date: formatDateLocaleRelative(record.created_at) },
                    `Created ${formatDateLocaleRelative(record.created_at)}`)
                  }}
                </span>
                <span
                  class="q-ml-sm"
                  :class="darkMode ? 'text-grey-5' : 'text-grey-7'"
                >
                  • {{ $t(
                    'UpdatedDate',
                    { date: formatDateLocaleRelative(record.updated_at)  },
                    `Updated ${formatDateLocaleRelative(record.updated_at) }`)
                  }}
                </span>
              </div>
            </div>

            <q-separator class="q-mb-md" />

            <!-- buttons div -->
            <div class="row justify-evenly items-center q-gutter-x-md">
              <q-btn
                round
                :outline="!record.is_favorite"
                :icon="record.is_favorite ? 'mdi-star' : 'mdi-star-outline'"
                color="primary"
                @click="toggleFavorite"
                :loading="isLoadingFavorite"
                :aria-label="record.is_favorite ? $t('RemoveFromFavorites') : $t('AddToFavorites')"
              />
              <q-btn
                round
                outline
                icon="edit"
                color="primary"
                @click="handleEdit"
                :aria-label="$t('EditContact')"
              />
              <q-btn
                round
                outline
                icon="delete"
                color="primary"
                @click="handleDelete"
                :aria-label="$t('DeleteContact')"
              />
            </div>
          </q-card>

          <!-- addresses list -->
          <div>
            <div class="row items-center justify-between q-mb-sm">
              <span
                id="addresses-list-label"
                class="text-subtitle1 text-weight-bold"
              >
                {{ $t('AddressesList') }}
                <q-badge
                  v-if="addressesList.length > 0"
                  color="primary"
                  :label="addressesList.length"
                  class="q-ml-sm text-weight-bold"
                />
              </span>
              <div class="row items-center q-gutter-x-sm">
                <q-btn
                  v-if="addressesList.length > 0"
                  flat
                  dense
                  icon="search"
                  color="primary"
                  @click="showSearch = !showSearch, showFilter = showFilter ? !showFilter : showFilter"
                  :aria-label="$t('SearchAddresses')"
                />
                <q-btn
                  v-if="addressesList.length > 0"
                  flat
                  dense
                  icon="filter_list"
                  color="primary"
                  @click="showFilter = !showFilter, showSearch = showSearch ? !showSearch : showSearch"
                  :aria-label="$t('FilterAddresses')"
                />
                <q-btn
                  flat
                  dense
                  icon="add"
                  color="primary"
                  @click="handleAddAddress"
                  :aria-label="$t('AddAddress')"
                />
              </div>
            </div>

            <!-- Search input -->
            <q-input
              v-if="showSearch && addressesList.length > 0"
              v-model="searchQuery"
              outlined
              dense
              clearable
              :placeholder="`${$t('SearchAddresses')}...`"
              class="q-mb-md"
              :class="getDarkModeClass(darkMode)"
            >
              <template v-slot:prepend>
                <q-icon name="search" />
              </template>
            </q-input>

            <!-- Filter div -->
            <div
              v-if="showFilter && addressesList.length > 0"
              class="row items-center justify-evenly q-mb-md q-px-sm"
            >
              <span class="text-subtitle1">{{ $t('FilterAddresses') }}:</span>
              <div class="row justify-evenly">
                <q-chip
                  clickable
                  text-color="white"
                  class="text-weight-bold"
                  :color="getAddressTypeColor('bch')"
                  :icon="getAddressTypeIcon('bch')"
                  :outline="filterQuery === 'ct'"
                  @click="filterQuery = filterQuery === '' ? 'bch' : ''"
                >
                  {{ formatAddressType('bch') }}
                </q-chip>
                <q-chip
                  clickable
                  text-color="white"
                  class="text-weight-bold"
                  :color="getAddressTypeColor('ct')"
                  :icon="getAddressTypeIcon('ct')"
                  :outline="filterQuery === 'bch'"
                  @click="filterQuery = filterQuery === '' ? 'ct' : ''"
                >
                  {{ formatAddressType('ct') }}
                </q-chip>
              </div>
            </div>

            <div id="addresses-list" v-if="filteredAddresses.length > 0">
              <q-card
                v-for="(address, index) in filteredAddresses"
                :key="index"
                flat
                bordered
                class="q-mb-sm record-card address-card"
                :class="{ 'address-copied': copiedAddressIndex === index }"
              >
                <q-item>
                  <q-item-section>
                    <div class="row items-center q-gutter-xs">
                      <q-item-label 
                        class="address-text"
                        @click="copyToClipboard(address.address, index)"
                        style="cursor: pointer;"
                      >
                        {{ formatAddress(address.address) }}
                        <q-btn
                          flat
                          dense
                          round
                          size="xs"
                          icon="content_copy"
                          color="primary"
                          @click.stop="copyToClipboard(address.address, index)"
                          :aria-label="$t('ClickToCopyAddress')"
                        />
                      </q-item-label>
                    </div>
                    <q-item-label caption class="q-mt-xs">
                      <q-chip
                        :color="getAddressTypeColor(address.address_type)"
                        text-color="white"
                        size="sm"
                        :icon="getAddressTypeIcon(address.address_type)"
                        class="text-weight-bold"
                      >
                        {{ formatAddressType(address.address_type) }}
                      </q-chip>
                    </q-item-label>
                  </q-item-section>

                  <q-item-section side>
                    <q-btn
                      round
                      flat
                      icon="more_vert"
                      color="primary"
                      size="sm"
                      :aria-label="$t('AddressActions')"
                    >
                      <q-menu
                        class="text-bow"
                        :class="getDarkModeClass(darkMode)"
                        anchor="bottom right"
                        self="top right"
                      >
                        <q-list style="min-width: 200px">
                          <q-item
                            clickable
                            v-close-popup
                            @click="handleSend(address.address, address.address_type)"
                          >
                            <q-item-section avatar>
                              <q-icon name="mdi-send" />
                            </q-item-section>
                            <q-item-section>
                              <q-item-label>{{ $t('SendToThisAddress') }}</q-item-label>
                            </q-item-section>
                          </q-item>
                          <q-item
                            clickable
                            v-close-popup
                            @click="showQrCode(address)"
                          >
                            <q-item-section avatar>
                              <q-icon name="qr_code" />
                            </q-item-section>
                            <q-item-section>
                              <q-item-label>{{ $t('ViewQrCode') }}</q-item-label>
                            </q-item-section>
                          </q-item>
                          <q-separator />
                          <q-item
                            clickable
                            v-close-popup
                            @click="handleRemoveAddress(address)"
                          >
                            <q-item-section avatar>
                              <q-icon name="delete" color="red-5" />
                            </q-item-section>
                            <q-item-section>
                              <q-item-label class="text-red-5">{{ $t('RemoveAddress') }}</q-item-label>
                            </q-item-section>
                          </q-item>
                        </q-list>
                      </q-menu>
                    </q-btn>
                  </q-item-section>
                </q-item>
              </q-card>
            </div>

            <!-- Empty state -->
            <q-card
              v-else-if="!loading && !error"
              flat
              bordered
              class="record-card empty-state-card"
            >
              <div class="text-center q-pa-xl">
                <q-icon
                  name="mdi-wallet-outline"
                  size="64px"
                  :color="darkMode ? 'grey-5' : 'grey-7'"
                  class="q-mb-md"
                />
                <p
                  class="text-h6 q-mb-xs"
                  :class="darkMode ? 'text-grey-5' : 'text-grey-7'"
                >
                  {{ $t('NoAddressesAddedYet') }}
                </p>
              </div>
            </q-card>
          </div>
        </div>
      </template>
    </div>

    <!-- QR Code Dialog -->
    <q-dialog v-model="showQrDialog" class="text-bow" :class="getDarkModeClass(darkMode)">
      <q-card class="q-pa-md" style="min-width: 300px">
        <q-card-section>
          <div class="row justify-center q-mb-md">
            <qr-code
              :text="selectedAddressForQr"
              :size="220"
              :icon="selectedAddressType === 'ct' ? 'ct-logo.png' : 'bitcoin-cash-circle.svg'"
              border-width="3px"
              border-color="#ed5f59"
              :qr-id="qrCodeId"
            />
          </div>
          <div class="text-center">
            <q-chip
              :color="getAddressTypeColor(selectedAddressType)"
              text-color="white"
              size="sm"
              :icon="getAddressTypeIcon(selectedAddressType)"
              class="q-mb-sm text-weight-bold"
            >
              {{ formatAddressType(selectedAddressType) }}
            </q-chip>
            <div
              class="text-caption q-mt-sm"
              :class="darkMode ? 'text-grey-5' : 'text-grey-7'"
              style="word-break: break-all;"
            >
              {{ selectedAddressForQr }}
            </div>
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn
            flat
            :label="$t('Copy')"
            color="primary"
            @click="copyToClipboard(selectedAddressForQr)"
            v-close-popup
          />
          <q-btn flat :label="$t('Close')" color="primary" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script>
import { decryptMemo } from 'src/utils/transaction-memos';
import { ensureKeypair } from 'src/utils/memo-service';
import { formatAddress } from 'src/exchange/index.js';
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils';
import { formatDateLocaleRelative } from 'src/utils/time';
import { raiseNotifyError, raiseNotifySuccess } from 'src/utils/notify-utils';
import { deleteAddress, deleteRecord, getRecord, patchRecord } from 'src/utils/address-book-utils';

import HeaderNav from 'src/components/header-nav.vue'
import EditRecordDialog from 'src/components/address-book/EditRecordDialog.vue';

export default {
  name: 'ViewRecord',

  components: {
    HeaderNav
  },

  data () {
    return {
      loading: false,
      error: null,
      showSearch: false,
      showFilter: false,
      searchQuery: '',
      filterQuery: '',
      showQrDialog: false,
      selectedAddressForQr: '',
      selectedAddressType: 'bch',
      qrCodeId: 0,
      copiedAddressIndex: null,

      isLoadingFavorite: false,

      record: {},
      addressesList: []
    }
  },

  computed: {
    darkMode() {
      return this.$store.getters["darkmode/getStatus"];
    },
    filteredAddresses() {
      if (!this.searchQuery && !this.filterQuery) {
        return this.addressesList
      }
      const query = this.searchQuery.toLowerCase()
      return this.addressesList.filter(addr => {
        if (this.filterQuery) {
          return addr.address.toLowerCase().includes(query) && 
            addr.address_type === this.filterQuery
        }
        return addr.address.toLowerCase().includes(query)
      })
    }
  },

  methods: {
    getDarkModeClass,
    formatAddress,
    formatDateLocaleRelative,

    formatAddressType(type) {
      const typeMap = {
        'bch': 'BCH',
        'ct': 'CT'
      }
      return typeMap[type.toLowerCase()] || type.toUpperCase()
    },
    getAddressTypeColor(type) {
      const colorMap = {
        'bch': 'green-7',
        'ct': 'teal-6'
      }
      return colorMap[type.toLowerCase()] || 'grey-7'
    },
    getAddressTypeIcon(type) {
      const iconMap = {
        'bch': 'img:bitcoin-cash-circle.svg',
        'ct': 'img:ct-logo.png'
      }
      return iconMap[type.toLowerCase()] || null
    },
    copyToClipboard(text, index = null) {
      navigator.clipboard.writeText(text).then(() => {
        if (index !== null) {
          this.copiedAddressIndex = index
          setTimeout(() => {
            this.copiedAddressIndex = null
          }, 1000)
        }
        raiseNotifySuccess(this.$t('AddressCopied'), 2000, 'top')
      }).catch(() => {
        raiseNotifyError(this.$t('FailedToCopyAddress'), 2000, 'top')
      })
    },
    async toggleFavorite() {
      this.isLoadingFavorite = true
      
      this.record.is_favorite = !this.record.is_favorite
      const payload = { is_favorite: this.record.is_favorite}
      const patchSuccess = await patchRecord(this.record.id, payload)
      if (patchSuccess) {
        await this.loadRecord(this.record.id)
        const message = this.record.is_favorite 
            ? this.$t('AddedToFavorites') 
            : this.$t('RemovedFromFavorites')
        const icon = this.record.is_favorite ? 'star' : 'star_border'
        raiseNotifySuccess(message, 3000, 'top', icon)
      } else {
        this.record.is_favorite = !this.record.is_favorite
        const message = this.record.is_favorite
          ? this.$t('AddedToFavoritesError')
          : this.$t('RemovedFromFavoritesError')
        raiseNotifyError(message, 3000, 'top')
      }

      this.isLoadingFavorite = false
    },
    async handleEdit() {
      this.$q.dialog({
        component: EditRecordDialog,
        componentProps: {
          title: this.$t('EditContactName'),
          isEditName: true,
          record: this.record
        }
      })
        .onOk(async () => {
          await this.loadRecord(this.record.id)
          raiseNotifySuccess(this.$t('UpdateNameSuccess'), 2000, 'top')
        })
    },
    async handleDelete() {
      this.$q.dialog({
        title: this.$t('DeleteContact'),
        message: this.$t('DeleteContactDescription'),
        persistent: true,
        ok: {
          label: this.$t('Delete'),
          color: 'red',
        },
        cancel: {
          label: this.$t('Cancel'),
          flat: true
        },
        class: `pt-card-2 text-bow ${this.getDarkModeClass(this.darkMode)}`
      }).onOk(async () => {
        const deleteSuccess = await deleteRecord(this.record.id)
        if (deleteSuccess) {
          raiseNotifySuccess(this.$t('DeleteContactSuccess'), 2000, 'top')
          // Navigate back to address book list
          this.$router.push('/apps/address-book/')
        } else {
          raiseNotifyError(this.$t('DeleteContactError'), 3000, 'top')
        }
      })
    },
    handleAddAddress() {
      this.$q.dialog({
        component: EditRecordDialog,
        componentProps: {
          title: this.$t('EditAddresses'),
          isEditName: false,
          record: this.record,
          addressesProps: this.addressesList
        }
      })
        .onOk(async () => {
          await this.loadRecord(this.record.id)
          raiseNotifySuccess(this.$t('UpdateAddressesSuccess'), 2000, 'top')
        })
    },
    handleSend(address, type) {
      // Navigate to send page with pre-filled address
      const query = { network: 'BCH', address }

      if (type === 'ct') {
        this.$router.push({
          name: 'transaction-send-select-asset',
          query
        })
      } else {
        query.assetId = 'bch'
        this.$router.push({
          name: 'transaction-send',
          query
        })
      }
    },
    showQrCode(addressObj) {
      this.selectedAddressForQr = addressObj.address
      this.selectedAddressType = addressObj.address_type
      this.qrCodeId = Date.now() // Unique ID for QR code
      this.showQrDialog = true
    },
    async handleRemoveAddress(address) {
      this.$q.dialog({
        title: this.$t('RemoveAddressTitle'),
        message: this.$t('RemoveAddressDescription'),
        persistent: true,
        ok: {
          label: this.$t('Remove'),
          color: 'red',
        },
        cancel: {
          label: this.$t('Cancel'),
          flat: true
        },
        class: `pt-card text-bow ${this.getDarkModeClass(this.darkMode)}`
      }).onOk(async () => {
        const deleteSuccess = await deleteAddress(address.id)
        if (deleteSuccess) {
          await this.loadRecord(this.record.id)
          raiseNotifySuccess(this.$t('RemoveAddressSuccess'), 2000, 'top')
        } else {
          raiseNotifyError(this.$t('RemoveAddressError'), 3000, 'top')
        }
      })
    },
    
    async loadRecord(id) {
      this.loading = true
      this.error = null

      const resp = await getRecord(id)

      try {
        const keypair = await ensureKeypair()
        const decryptedName = await decryptMemo(keypair.privkey, resp.name)

        this.addressesList = resp.addresses
        this.record = {
          ...resp,
          name: decryptedName,
        }
      } catch (error) {
        console.error(error)
        this.error = error
      }

      this.loading = false
    }
  },

  async mounted () {
    await this.loadRecord(this.$route.params.id)
  }
}
</script>

<style lang="scss" scoped>
#addresses-list {
  height: 100%;
  overflow-y: auto;
  /* Hide scrollbar */
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE and Edge */
  
  &::-webkit-scrollbar {
    display: none; /* Chrome, Safari, Opera */
  }
}

.address-card {
  transition: all 0.2s ease;
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  &.address-copied {
    background-color: rgba(76, 175, 80, 0.1);
    animation: copyFlash 0.5s ease;
  }
}

@keyframes copyFlash {
  0% {
    background-color: rgba(76, 175, 80, 0.2);
  }
  100% {
    background-color: transparent;
  }
}

.address-text {
  word-break: break-word;
  font-family: monospace;
  font-size: 0.9rem;
  line-height: 1.4;
  transition: opacity 0.2s ease;
  
  &:hover {
    opacity: 0.8;
  }
}

.empty-state-card {
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.record-card {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 16px;
}
</style>
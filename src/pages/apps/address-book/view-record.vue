<template>
  <div
    id="app-container"
    class="sticky-header-container text-bow"
    :class="getDarkModeClass(darkMode)"
  >
    <header-nav
      class="apps-header"
      backnavpath="/apps/address-book/"
      :title="'Address Book'"
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
            <p class="text-h6 q-mb-xs">{{ error }}</p>
            <q-btn
              outline
              color="primary"
              label="Retry"
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
                <span>Created {{ formattedDate }}</span>
                <span v-if="record.updated_at" class="q-ml-sm">
                  • Updated {{ formatDate(record.updated_at, true) }}
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
                :aria-label="record.is_favorite ? 'Remove from favorites' : 'Add to favorites'"
              />
              <q-btn
                round
                outline
                icon="edit"
                color="primary"
                @click="handleEdit"
                aria-label="Edit contact"
              />
              <q-btn
                round
                outline
                icon="delete"
                color="primary"
                @click="handleDelete"
                aria-label="Delete contact"
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
                Addresses List
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
                  @click="showSearch = !showSearch"
                  aria-label="Search addresses"
                />
                <q-btn
                  flat
                  dense
                  icon="add"
                  color="primary"
                  @click="handleAddAddress"
                  aria-label="Add address"
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
              placeholder="Search addresses..."
              class="q-mb-md"
              :class="getDarkModeClass(darkMode)"
            >
              <template v-slot:prepend>
                <q-icon name="search" />
              </template>
            </q-input>

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
                          aria-label="Copy address"
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
                      aria-label="Address actions"
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
                              <q-item-label>Send to this address</q-item-label>
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
                              <q-item-label>View QR Code</q-item-label>
                            </q-item-section>
                          </q-item>
                          <q-separator />
                          <q-item
                            clickable
                            v-close-popup
                            @click="handleRemoveAddress(index)"
                          >
                            <q-item-section avatar>
                              <q-icon name="delete" color="red-5" />
                            </q-item-section>
                            <q-item-section>
                              <q-item-label class="text-red-5">Remove address</q-item-label>
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
                  No addresses added yet
                </p>
                <p
                  class="text-body2 q-mb-md"
                  :class="darkMode ? 'text-grey-6' : 'text-grey-6'"
                >
                  Add an address to get started
                </p>
                <q-btn
                  outline
                  color="primary"
                  icon="add"
                  label="Add Address"
                  @click="handleAddAddress"
                  class="q-mt-sm"
                />
              </div>
            </q-card>
          </div>
        </div>
      </template>
    </div>

    <!-- QR Code Dialog -->
    <q-dialog v-model="showQrDialog" :class="getDarkModeClass(darkMode)">
      <q-card class="q-pa-md" style="min-width: 300px">
        <q-card-section>
          <div class="text-h6 text-center q-mb-md">Address QR Code</div>
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
            label="Copy"
            color="primary"
            icon="content_copy"
            @click="copyToClipboard(selectedAddressForQr)"
            v-close-popup
          />
          <q-btn flat label="Close" color="primary" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script>
import { getRecord } from 'src/utils/address-book-utils';
import { decryptMemo } from 'src/utils/transaction-memos';
import { ensureKeypair } from 'src/utils/memo-service';
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { formatAddress, formatDate } from 'src/exchange/index.js'

import HeaderNav from 'src/components/header-nav.vue'

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
      searchQuery: '',
      showQrDialog: false,
      selectedAddressForQr: '',
      selectedAddressType: 'bch',
      qrCodeId: 0,
      copiedAddressIndex: null,

      record: {
        name: 'Name Name name_yey',
        is_favorite: false,
        created_at: new Date(),
        updated_at: null
      },
      addressesList: []
    }
  },

  computed: {
    darkMode() {
      return this.$store.getters["darkmode/getStatus"];
    },
    formattedDate() {
      if (!this.record.created_at) return ''
      return formatDate(this.record.created_at, true)
    },
    filteredAddresses() {
      if (!this.searchQuery) {
        return this.addressesList
      }
      const query = this.searchQuery.toLowerCase()
      return this.addressesList.filter(addr => 
        addr.address.toLowerCase().includes(query) ||
        this.formatAddressType(addr.address_type).toLowerCase().includes(query)
      )
    }
  },

  methods: {
    getDarkModeClass,
    formatAddress,
    formatDate,
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
        this.$q.notify({
          message: 'Address copied to clipboard',
          color: 'positive',
          position: 'top',
          timeout: 2000,
          icon: 'check_circle'
        })
      }).catch(() => {
        this.$q.notify({
          message: 'Failed to copy address',
          color: 'negative',
          position: 'top',
          timeout: 2000,
          icon: 'error'
        })
      })
    },
    toggleFavorite() {
      this.record.is_favorite = !this.record.is_favorite
      // TODO: Persist favorite status via API/store
      this.$q.notify({
        message: this.record.is_favorite 
          ? 'Added to favorites' 
          : 'Removed from favorites',
        color: 'positive',
        position: 'top',
        timeout: 2000,
        icon: this.record.is_favorite ? 'star' : 'star_border'
      })
    },
    handleEdit() {
      // TODO: Navigate to edit page or open edit dialog
      const recordId = this.$route.params.id
      this.$router.push(`/apps/address-book/edit/${recordId}/`)
    },
    handleDelete() {
      this.$q.dialog({
        title: 'Delete Contact',
        message: `Are you sure you want to delete "${this.record.name}"? This action cannot be undone.`,
        seamless: true,
        ok: {
          label: 'Delete',
          color: 'red',
          flat: true
        },
        cancel: {
          label: 'Cancel',
          flat: true
        },
        class: `pt-card text-bow ${this.getDarkModeClass(this.darkMode)}`
      }).onOk(() => {
        // TODO: Implement delete API call
        this.$q.notify({
          message: 'Contact deleted',
          color: 'positive',
          position: 'top',
          timeout: 2000
        })
        // Navigate back to address book list
        this.$router.push('/apps/address-book/')
      })
    },
    handleAddAddress() {
      // TODO: Navigate to add address page or open dialog
      const recordId = this.$route.params.id
      this.$router.push(`/apps/address-book/edit/${recordId}/?action=add-address`)
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
    handleRemoveAddress(index) {
      this.$q.dialog({
        title: 'Remove Address',
        message: 'Are you sure you want to remove this address from the contact?',
        seamless: true,
        ok: {
          label: 'Remove',
          color: 'red',
          flat: true
        },
        cancel: {
          label: 'Cancel',
          flat: true
        },
        class: `pt-card text-bow ${this.getDarkModeClass(this.darkMode)}`
      }).onOk(() => {
        // TODO: Implement remove address API call
        this.addressesList.splice(index, 1)
        this.$q.notify({
          message: 'Address removed',
          color: 'positive',
          position: 'top',
          timeout: 2000
        })
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
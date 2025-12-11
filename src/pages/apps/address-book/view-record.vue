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
      <!-- loading skeletons animation -->

      <!-- <template> -->
      <!-- buttons div -->
      <!-- <div id="buttons-div" class="row justify-end items-center q-gutter-x-sm">
        <q-btn
          round
          flat
          :icon="record.is_favorite ? 'mdi-star' : 'mdi-star-outline'"
          color="primary"
        />
        <q-btn
          round
          flat
          icon="edit"
          color="primary"
        />
        <q-btn
          round
          flat
          icon="delete"
          color="primary"
        />
      </div> -->

      <!-- record details -->
      <div class="q-mt-sm">
        <q-card id="record-details" class="q-pa-md q-mb-md record-card">
          <!-- name and date created -->
          <div class="text-left q-mb-md">
            <p class="text-h6 q-mb-xs">{{ record.name }}</p>
            <p class="text-caption q-mb-none">
              Created last {{ record.date_created }}
            </p>
          </div>

          <q-separator class="q-mb-md" />

          <!-- buttons div -->
          <div class="row justify-evenly items-center q-gutter-x-md">
            <q-btn
              round
              :outline="!record.is_favorite"
              :icon="record.is_favorite ? 'mdi-star' : 'mdi-star-outline'"
              color="primary"
              @click="record.is_favorite = !record.is_favorite"
            />
            <q-btn
              round
              outline
              icon="edit"
              color="primary"
            />
            <q-btn
              round
              outline
              icon="delete"
              color="primary"
            />
          </div>
        </q-card>

        <!-- addresses list -->
        <div>
          <span
            id="addresses-list-label"
            class="row text-subtitle1 text-weight-bold q-mb-sm"
          >
            Addresses List
          </span>

          <div id="addresses-list" v-if="record.address_list.length > 0">
            <q-card
              v-for="(address, index) in record.address_list"
              :key="index"
              flat
              bordered
              class="q-mb-sm record-card address-card"
            >
              <q-item>
                <q-item-section>
                  <q-item-label 
                    class="address-text"
                    @click="copyToClipboard(address.address)"
                    style="cursor: pointer;"
                  >
                    {{ formatAddress(address.address) }}
                  </q-item-label>
                  <q-item-label caption class="q-mt-xs">
                    {{ formatAddressType(address.type) }}
                  </q-item-label>
                </q-item-section>

                <q-item-section side>
                  <q-btn
                    round
                    flat
                    icon="mdi-send"
                    color="primary"
                    size="sm"
                  >
                    <q-tooltip>Send to this address</q-tooltip>
                  </q-btn>
                </q-item-section>
              </q-item>
            </q-card>
          </div>

          <div
            class="text-body text-center q-mt-sm"
            :class="darkMode ? 'text-grey-5' : 'text-grey-7'"
            v-else
          >
            No addresses added yet
          </div>
        </div>
      </div>
      <!-- </template> -->
    </div>
  </div>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { formatAddress } from 'src/exchange/index.js'

import HeaderNav from 'src/components/header-nav.vue'

export default {
  name: 'ViewRecord',

  components: {
    HeaderNav
  },

  data () {
    return {
      record: {
        name: 'Name Name name_yey',
        is_favorite: false,
        date_created: new Date(),
        // address_list: []
        address_list: [
          {
            address: 'bitcoincash:qze93uuw8vt8v358f7eupg3t4jtkpz8ltguhg62pde',
            type: 'bch'
          },
          {
            address: 'bitcoincash:zze93uuw8vt8v358f7eupg3t4jtkpz8ltgmamyy8j2',
            type: 'ct'
          },
          {
            address: 'bitcoincash:qze93uuw8vt8v358f7eupg3t4jtkpz8ltguhg62pde',
            type: 'bch'
          },
          {
            address: 'bitcoincash:zze93uuw8vt8v358f7eupg3t4jtkpz8ltgmamyy8j2',
            type: 'ct'
          },
          {
            address: 'bitcoincash:qze93uuw8vt8v358f7eupg3t4jtkpz8ltguhg62pde',
            type: 'bch'
          },
          {
            address: 'bitcoincash:zze93uuw8vt8v358f7eupg3t4jtkpz8ltgmamyy8j2',
            type: 'ct'
          },
          {
            address: 'bitcoincash:qze93uuw8vt8v358f7eupg3t4jtkpz8ltguhg62pde',
            type: 'bch'
          },
          {
            address: 'bitcoincash:zze93uuw8vt8v358f7eupg3t4jtkpz8ltgmamyy8j2',
            type: 'ct'
          },
          {
            address: 'bitcoincash:qze93uuw8vt8v358f7eupg3t4jtkpz8ltguhg62pde',
            type: 'bch'
          },
          {
            address: 'bitcoincash:zze93uuw8vt8v358f7eupg3t4jtkpz8ltgmamyy8j2',
            type: 'ct'
          },
          {
            address: 'bitcoincash:qze93uuw8vt8v358f7eupg3t4jtkpz8ltguhg62pde',
            type: 'bch'
          },
          {
            address: 'bitcoincash:zze93uuw8vt8v358f7eupg3t4jtkpz8ltgmamyy8j2',
            type: 'ct'
          },
        ]
      }
    }
  },

  computed: {
    darkMode() {
      return this.$store.getters["darkmode/getStatus"];
    }
  },

  methods: {
    getDarkModeClass,
    formatAddress,
    formatAddressType(type) {
      const typeMap = {
        'bch': 'BCH',
        'ct': 'CT (CashToken)'
      }
      return typeMap[type.toLowerCase()] || type.toUpperCase()
    },
    copyToClipboard(text) {
      navigator.clipboard.writeText(text).then(() => {
        this.$q.notify({
          message: 'Address copied to clipboard',
          color: 'positive',
          position: 'top',
          timeout: 2000
        })
      }).catch(() => {
        this.$q.notify({
          message: 'Failed to copy address',
          color: 'negative',
          position: 'top',
          timeout: 2000
        })
      })
    }
  },

  mounted () {
    console.log(this.$route.params)

    // retrieve details of params.id from watchtower

    // set height of addresses-list
    if (this.record?.address_list.length > 0) {
      const headerHeight = document.getElementById('header-nav').clientHeight
      const recordDetailsHeight = document.getElementById('record-details').clientHeight
      const addressesListLabel = document.getElementById('addresses-list-label').clientHeight
  
      const aboveDivsHeight = headerHeight + recordDetailsHeight + addressesListLabel
      const overallHeight = this.$q.screen.height - aboveDivsHeight - 75
      document.getElementById('addresses-list').style.height = `${overallHeight}px`
    }
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
}

.address-text {
  word-break: break-word;
  font-family: monospace;
  font-size: 0.9rem;
  line-height: 1.4;
  
  &:hover {
    opacity: 0.8;
  }
}
</style>
<template>
  <div class="static-container">
    <div
      id="app-container"
      style="background-color: #ECF3F3; min-height: 100vh;"
      class="q-pt-xl"
      :class="{ 'pt-dark': darkMode }"
    >
      <HeaderNav
        title="Gifts"
        backnavpath="/apps"
        style="position: fixed; top: 0; background: #ECF3F3; width: 100%; z-index: 100 !important;"
        class="q-px-sm"
      />
      <div :style="{ 'margin-top': $q.platform.is.ios ? '80px' : '50px'}">
        <div class="row justify-center">
          <div @click="$router.push({ name: 'create-gift'})" role="button" class="col-6 q-pl-lg q-mb-sm round" style="height: 50px; width: 150px">
            <q-btn color="primary">Create Gift</q-btn>
          </div>
          <div @click="$router.push({ name: 'claim-gift'})" role="button" class="col-6 q-pr-lg q-mb-sm" style="height: 50px; width: 150px">
            <q-btn color="primary">Claim Gift</q-btn>
          </div>
        </div>
        <div class="row q-pa-md" :class="{'text-black': !darkMode}" style="margin-top: -10px;">
          <q-table
            grid
            title="Gifts you created"
            :rows="rows"
            :columns="columns"
            row-key="name"
            style="width: 100%"
            :dark="darkMode"
            :loading="loading"
            :pagination.sync="pageNumber"
          >
            <template v-slot:top-right>
              <q-btn-dropdown color="primary" no-caps :label="capitalize(filterOpts.recordType.active)" dense class="q-pl-sm" :dark="darkMode" content-style="color: black;">
                <q-list dense>
                  <q-item
                    v-for="recordType in filterOpts.recordType.options"
                    :index="recordType"
                    clickable v-close-popup
                    :active="recordType === filterOpts.recordType.active"
                    @click="() => fetchGifts({ recordType: recordType })"
                  >
                    <q-item-section>
                      <q-item-label>{{ capitalize(recordType) }}</q-item-label>
                    </q-item-section>
                  </q-item>
                </q-list>
              </q-btn-dropdown>
            </template>
            <template v-slot:item="props">
              <div
                class="q-pa-xs col-xs-12 col-sm-6 col-md-4 col-lg-3 grid-style-transition text-black"
                :style="props.selected ? 'transform: scale(0.95);' : ''"
              >
                <q-card>
                  <q-list dense>
                    <q-item v-for="col in props.cols" :key="col.name">
                      <template v-if="col.name === 'claimed'">
                        <template v-if="col.value !== 'Unclaimed'">
                          <q-item-section>
                            <q-item-label>
                              <q-separator inset />
                              <q-badge color="green" class="q-mt-sm q-mb-sm">Claimed {{ col.value }}</q-badge>
                            </q-item-label>
                          </q-item-section>
                        </template>
                        <template v-else>
                          <q-item-section>
                            <q-item-label>
                              <q-separator inset />
                              <q-badge color="grey" class="q-mt-sm q-mb-sm">Unclaimed</q-badge>
                            </q-item-label>
                          </q-item-section>
                          <q-item-section v-if="getGiftShare(props.row.gift_code_hash)" side style="padding: 10px 0px;">
                            <q-item-label caption>
                              <q-btn size="sm" @click="recoverGift(props.row.gift_code_hash)" dense>Recover</q-btn>
                            </q-item-label>
                          </q-item-section>
                          <q-item-section side style="padding: 10px 0px;" v-if="getQrShare(props.row.gift_code_hash)">
                            <q-item-label caption>
                              <!-- <q-btn size="sm" @click="$router.push({ name: 'show-qr'})" dense>Show QR</q-btn> -->
                              <q-btn size="sm" @click="showQr(props.row.gift_code_hash)" dense>Show QR</q-btn>
                            </q-item-label>
                          </q-item-section>
                        </template>
                      </template>
                      <template v-else>
                        <q-item-section>
                          <q-item-label>{{ col.label }}</q-item-label>
                        </q-item-section>
                        <q-item-section side>
                          <q-item-label caption>{{ col.value }}</q-item-label>
                        </q-item-section>
                      </template>
                    </q-item>
                  </q-list>
                </q-card>
              </div>
            </template>
          </q-table>
        </div>
      </div>
     </div>
    </div>
</template>

<script>
import HeaderNav from '../../../components/header-nav'
// import { date } from 'quasar'
// import { defineComponent, ref } from 'vue'
import { capitalize } from 'vue'
import { formatDistance } from 'date-fns'
import axios from 'axios'

const columns = [
  {
    name: 'amount',
    label: 'Amount',
    align: 'left',
    field: 'amount',
    format: val => `${val} BCH`,
    sortable: true
  },
  {
    name: 'created',
    align: 'center',
    label: 'Date Created',
    field: 'date_created',
    format: val => `${formatDistance(new Date(val), new Date(), { addSuffix: true })}`,
    sortable: true
  },
  {
    name: 'claimed',
    align: 'right',
    label: 'Date Claimed',
    field: 'date_claimed',
    format: function (val) {
      if (val === 'None') {
        return 'Unclaimed'
      } else {
        return `${formatDistance(new Date(val), new Date(), { addSuffix: true })}`
      }
    },
    sortable: true
  }
]

export default {
  name: 'Gift',
  components: { HeaderNav },
  data () {
    return {
      walletHash: this.getWallet('bch').walletHash,
      pageNumber: {
        rowsPerPage: 20
      },
      filterOpts: {
        recordType: {
          active: 'all',
          default: 'all',
          options: ['claimed', 'unclaimed', 'all'],
        }
      },
      label: 'Filter',
      loading: false,
      columns,
      rows: [],
      qrConfirm: false
    }
  },

  computed: {
    darkMode() {
      return this.$store.getters['darkmode/getStatus']
    }
  },

  methods: {
    capitalize: capitalize,
    fetchGifts(opts = { recordType: 'all' }) {
      const recordType = opts?.recordType || 'all'
      const url = `https://gifts.paytaca.com/api/gifts/${this.walletHash}/list`
      this.loading = true
      axios.get(url)
        .then(response => {
          if (!Array.isArray(response?.data?.gifts)) return Promise.reject({ response })

          this.rows = response.data.gifts.filter(gift => {
            if (recordType === 'unclaimed') return gift.date_claimed === 'None'
            if (recordType === 'claimed') return gift.date_claimed !== 'None'

            if (gift.date_claimed !== 'None') this.$store.dispatch('gifts/deleteGift', gift.gift_code_hash)
            return true
          })
          return Promise.resolve(response)
        })
        .then(() => {
          this.filterOpts.recordType.active = recordType
          if (this.filterOpts.recordType.options.indexOf(recordType) < 0) {
            this.filterOpts.recordType.active = this.filterOpts.recordType.default
          }
        })
        .finally(() => {
          this.loading = false
        })
    },
    getGiftShare (giftCodeHash) {
      return this.$store.getters['gifts/getGiftShare'](giftCodeHash)
    },
    getQrShare (giftCodeHash) {
      return this.$store.getters['gifts/getQrShare'](giftCodeHash)
    },
    recoverGift (giftCodeHash) {
      const localShare = this.getGiftShare(giftCodeHash)
      this.$router.push(
        {
          name: 'claim-gift',
          query: {
            actionProp: 'Recover',
            giftCodeHash: giftCodeHash,
            localShare: localShare
          }
        }
      )
    },
    showQr (giftCodeHash) {
      // const localShare = this.getQrShare(giftCodeHash)
      const vm = this
      this.$router.push(
        {
          name: 'show-qr',
          query: {
            actionProp: 'showQr',
            giftCodeHash: giftCodeHash
          }
        }
      )
      vm.qrConfirm = true
    },
    getWallet (type) {
      return this.$store.getters['global/getWallet'](type)
    }
  },
  mounted () {
    // this.getItemsWithSort()
    // this.getItems()
    this.fetchGifts()
    // console.log(this.getGiftShare(this.giftCodeHash))
  }
}
</script>

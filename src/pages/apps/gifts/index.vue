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
      <div class="row" style="margin-top: 50px;">
        <div class="col q-mt-sm q-pl-lg q-pr-lg q-pb-none flex" style="font-size: 16px; color: #444655;">
          <p :class="{'text-white': darkMode}">Choose one</p>
          <!-- {{ this.walletHash }} -->
        </div>
      </div>
      <div class="row justify-center">
        <div @click="$router.push({ name: 'create-gift'})" role="button" class="col-6 q-pl-lg q-mb-sm round" style="height: 50px; width: 150px">
          <q-btn color="primary">Create Gift</q-btn>
        </div>
        <div @click="$router.push({ name: 'claim-gift'})" role="button" class="col-6 q-pr-lg q-mb-sm" style="height: 50px; width: 150px">
          <q-btn color="primary">Claim Gift</q-btn>
        </div>
      </div>
      <div v-if="rows.length > 0" class="row q-pa-md" :class="{'text-black': !darkMode}" style="margin-top: -20px;">
        <q-table
          grid
          title="Gifts you created"
          :rows="rows"
          :columns="columns"
          row-key="name"
          style="width: 100%"
          :dark="darkMode"
          :pagination="pageNumber"
        >
          <template v-slot:top-right>
            <q-btn-dropdown color="primary" label="Sort" >
              <q-list dense>
              <q-item clickable v-close-popup @click="claim" >
                <q-item-section>
                  <q-item-label>Claimed</q-item-label>
                </q-item-section>
              </q-item>
              <q-item clickable v-close-popup @click="unclaim" >
                <q-item-section>
                  <q-item-label>Unclaimed</q-item-label>
                </q-item-section>
              </q-item>
              <q-item clickable v-close-popup @click="error" active>
                <q-item-section>
                  <q-item-label>All</q-item-label>
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
                            <q-badge color="green">Claimed {{ col.value }}</q-badge>
                          </q-item-label>
                        </q-item-section>
                      </template>
                      <template v-else>
                        <q-item-section>
                          <q-item-label>
                            <q-badge color="grey">Unclaimed</q-badge>
                          </q-item-label>
                        </q-item-section>
                        <q-item-section v-if="getGiftShare(props.row.gift_code_hash)" side style="padding: 10px 0px;">
                          <q-item-label caption>
                            <q-btn size="sm" @click="recoverGift(props.row.gift_code_hash)">Recover</q-btn>
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

</template>

<script>
import HeaderNav from '../../../components/header-nav'
// import { date } from 'quasar'
// import { defineComponent, ref } from 'vue'
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
const rows = []

export default {
  name: 'Gift',
  components: { HeaderNav },
  props: {
    uri: {
      type: String,
      default: ''
    }
  },
  setup () {
    return {
      pageNumber: {
        rowsPerPage: 10
      }
    }
  },
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      info: null,
      walletHash: this.getWallet('bch').walletHash,
      response: null,
      columns,
      rows
    }
  },
  methods: {
    claim () {
      const vm = this
      const url = `https://gifts.paytaca.com/api/gifts/${vm.walletHash}/list`
      axios.get(url).then(function (response) {
        if (response.status === 200) {
          vm.rows = response.data.gifts
          const rowArray = vm.rows
          const storeRow = []
          for (let i = 0; i < vm.rows.length; i++) {
            // console.log(rowArray[i].date_claimed)
            if (rowArray[i].date_claimed !== 'None') {
              storeRow.push(rowArray[i])
            }
          }
          vm.rows = storeRow
          // console.log(storeRow)
        }
      })
    },
    unclaim () {
      const vm = this
      const url = `https://gifts.paytaca.com/api/gifts/${vm.walletHash}/list`
      axios.get(url).then(function (response) {
        if (response.status === 200) {
          vm.rows = response.data.gifts
          const rowArray = vm.rows
          const storeRow = []
          for (let i = 0; i < vm.rows.length; i++) {
            // console.log(rowArray[i].date_claimed)
            if (rowArray[i].date_claimed === 'None') {
              storeRow.push(rowArray[i])
            }
          }
          vm.rows = storeRow
          // console.log(vm.storeRow)
        }
      })
    },
    error () {
      this.getRows()
    },
    getRows () {
      const vm = this
      const url = `https://gifts.paytaca.com/api/gifts/${vm.walletHash}/list`
      axios.get(url).then(function (response) {
        if (response.status === 200) {
          vm.rows = response.data.gifts
          for (let i = 0; i < vm.rows.length; i++) {
            const gift = vm.rows[i]
            // console.log(vm.rows[i].date_claimed)
            if (gift.date_claimed !== 'None') {
              vm.$store.dispatch('gifts/deleteGift', gift.gift_code_hash)
            }
          }
        }
      })
    },
    getGiftShare (giftCodeHash) {
      return this.$store.getters['gifts/getGiftShare'](giftCodeHash)
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
    getWallet (type) {
      return this.$store.getters['global/getWallet'](type)
    }
  },
  mounted () {
    // this.getItemsWithSort()
    // this.getItems()
    this.getRows()
  }
}
</script>

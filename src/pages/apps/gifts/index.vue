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
          <div class="row q-pa-md">
            <q-table
              title="Gifts generated: "
              :rows="rows"
              :columns="columns"
              row-key="name"
              style="width: 100%"
            />
          </div>
      </div>
    </div>

</template>

<script>
import HeaderNav from '../../../components/header-nav'
// import { date } from 'quasar'
// import { defineComponent, ref } from 'vue'
import axios from 'axios'
const columns = [
  {
    name: 'name',
    label: 'Amount',
    align: 'left',
    field: 'amount',
    format: val => `${val}`,
    sortable: true
  },
  { name: 'created', align: 'center', label: 'Date Created', field: 'date_created', sortable: true },
  { name: 'claimed', align: 'right', label: 'Date Claimed', field: 'date_claimed', sortable: true }
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
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      info: null,
      walletHash: this.getWallet('bch').walletHash,
      giftArray: {},
      response: null,
      columns,
      rows
    }
  },
  methods: {
    getItems () {
      const url = 'https://gifts.paytaca.com/api/gifts/list'
      const vm = this
      axios.get(url, {
        params: {
          wallet_hash: vm.walletHash
        }
      }).then(function (response) {
        if (response.status === 200) {
          // for (let i = 0; i < response.data.gifts.length; i++) {
          vm.rows = response.data.gifts
          console.log(response.data.gifts)
          console.log(vm.rows)
        }
      })
    },
    // const data = response.date
    getWallet (type) {
      return this.$store.getters['global/getWallet'](type)
    }
  },
  mounted () {
    this.getItems()
  }
}
</script>

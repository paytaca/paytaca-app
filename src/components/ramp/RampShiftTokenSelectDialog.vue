<template>
   <q-dialog ref="dialog" persistent full-width>
    <q-card class="br-15 pt-card" :class="getDarkModeClass(darkMode, 'text-white', 'text-black')">
      <div class="row no-wrap items-center justify-center q-pl-md q-px-sm q-pt-sm">
        <div class="text-subtitle1 q-space q-mt-sm pt-label" :class="getDarkModeClass(darkMode)">{{ title }}</div>
        <q-btn
          flat
          padding="sm"
          icon="close"
          class="close-button"
          v-close-popup
        />
      </div>
      <q-tab-panels
        v-model="panel"
        animated
        class="pt-card"
        :class="getDarkModeClass(darkMode, 'text-white', 'text-black')"
      >
        <q-tab-panel name="list" class="q-pa-md">
          <q-card-section>
            <q-input
              dense
              outlined
              rounded
              v-model="searchText"
              :input-class="darkMode ? 'text-white' : 'text-black'"
            >
              <template v-slot:append>
              <q-icon name="search" color="grey-5" />
                </template>
            </q-input>
          </q-card-section>
          <q-card-section style="max-height:50vh;overflow-y:auto;" class="q-pt-none">
            <q-virtual-scroll :items="filteredCoinList">
              <template v-slot="{ item: token, index }">
                <q-item clickable @click="onOKClick(token)">
                  <q-item-section avatar>
                    <q-avatar v-if="token.icon">
                      <div style="height: 30px; width: 30px; border-radius: 50%;" class="q-mb-sm" v-html="token.icon"></div>
                    </q-avatar>
                    <div v-else>
                      <q-skeleton type="circle" style="height: 30px; width: 30px;"></q-skeleton>
                    </div>
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>{{ token.coin }}</q-item-label>
                    <q-item-label :class="darkMode ? 'text-grey-6' : ''" caption>{{ getNetwork(token) }}</q-item-label>
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>
                      <span v-if="token.offline" style="color: red;">Temporarily disabled</span>
                    </q-item-label>
                  </q-item-section>
                </q-item>
              </template>
            </q-virtual-scroll>
          </q-card-section>
        </q-tab-panel>
      </q-tab-panels>
    </q-card>
   </q-dialog>
</template>
<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

export default {
  data () {
    return {
      panel: 'list',
      searchText: '',
      coin: '',
      matchedCoin: []
    }
  },
  props: {
    type: String,
    tokenList: Array,
    title: String
  },
  methods: {
    getDarkModeClass,
    hide () {
      this.$refs.dialog.hide()
    },
    onOKClick (coin) {
      if (coin.offline === false) {
        this.$emit('ok', coin)
        this.hide()
      }
    },
    getNetwork (info) {
      const network = info.network.toLowerCase()
      const coin = info.coin.toLowerCase()
      //check ethereum
      if (network === 'ethereum' && coin !== 'eth') {
        return 'ERC-20'
      } else if (network === 'tron' && coin !== 'trx') {
        return 'TRC-20'
      } else if (network === 'bsc' && coin !== 'bnb') {
        return 'BEP-20'
      } else {
        return info.network.toUpperCase()
      }
    }
  },
  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    filteredCoinList () {
      if (!this.searchText) return this.tokenList

      const needle = String(this.searchText).toLowerCase()

      return this.tokenList
        .filter(token => {
          if (!this.searchText) return true
          if (!token) return false
          if (/0x[0-9a-f]+/.test(needle) && token.coin.toLowerCase() === needle) return true

          return String(token.coin).toLowerCase().includes(needle)
        })
    }
  },
  async mounted () {
    const vm = this
    vm.matchedCoin = vm.tokenList
  }
}
</script>
<style lang="scss" scoped>
.coin-icon {
  height: 30px;
  width: 30px;
}
</style>

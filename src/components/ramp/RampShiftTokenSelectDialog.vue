<template>
   <q-dialog ref="dialog" full-width>
    <q-card :class="darkMode ? 'text-white pt-dark-card' : 'text-black'" class="br-15">
      <div class="row no-wrap items-center justify-center q-pl-md">
        <div class="text-subtitle1 q-space q-mt-sm">{{ title }}</div>
        <q-btn
          flat
          padding="sm"
          icon="close"
          v-close-popup
        />
      </div>
      <q-tab-panels v-model="panel" animated :class="darkMode ? 'text-white pt-dark-card' : 'text-black'">
        <q-tab-panel name="list" class="q-pa-md">
          <q-card-section>
            <q-input
              dense
              outlined
              rounded
              v-model="coin"
              :input-class="darkMode ? 'text-white' : 'text-black'"
            >
              <template v-slot:append>
              <q-icon name="search" color="grey-5" />
                </template>
            </q-input>
          </q-card-section>
          <q-card-section style="max-height:50vh;overflow-y:auto;" class="q-pt-none">
            <q-virtual-scroll :items="matchedCoin">
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
                    <q-item-label :class="darkMode ? 'text-grey-6' : ''" caption>{{ token.coin }} ({{ getNetwork(token) }})</q-item-label>
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

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
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
    hide () {
      this.$refs.dialog.hide()
    },
    onOKClick (coin) {
      this.$emit('ok', coin)
      this.hide()
    },
    getNetwork (token) {
      const network = token.network.toLowerCase()
      const coin = token.coin.toLowerCase()
      //check ethereum
      if (network === 'ethereum' && coin !== 'eth') {
        return 'ERC-20'
      } else if (network === 'tron' && coin !== 'trx') {
        return 'TRC-20'
      } else if (network === 'bsc' && coin !== 'bnb') {
        return 'BEP-20'
      } else {
        return token.network.toUpperCase()
      }
    }
  },
  async mounted () {
    const vm = this
    vm.matchedCoin = vm.tokenList
    // console.log(vm.tokenList)
    // console.log(vm.type)
    //@update:model-value="!matchedTokensListFromCustomAddress.length ? updateCustomTokenInfo() : null"
  }
}
</script>
<style lang="scss" scoped>
.coin-icon {
  height: 30px;
  width: 30px;
}
</style>

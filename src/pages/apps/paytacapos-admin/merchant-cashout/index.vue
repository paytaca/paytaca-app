<template>
  <q-pull-to-refresh
    id="app-container"
    :class="getDarkModeClass(darkMode)"
    @refresh="refreshPage"
  >
    <HeaderNav
      :title="$t('Merchant Cash Out')"
      class="apps-header"
    />

    <div>
      <!-- order type tabs -->
      <div
          class="row br-15 text-center pt-card btn-transaction"
          :class="getDarkModeClass(darkMode)"
          :style="`background-color: ${darkMode ? '' : '#dce9e9 !important;'}`">
          <button
            class="col br-15 btn-custom fiat-tab q-mt-none"
            :class="[{'dark': darkMode}, {'active-buy-btn': orderType == 'ALL'}]"
            @click="orderType = 'ALL'"
            >
            {{ $t('All') }}
          </button>
          <button
            class="col br-15 btn-custom fiat-tab q-mt-none"
            :class="[{'dark': darkMode}, {'active-buy-btn': orderType == 'PENDING'}]"
            @click="orderType = 'PENDING'"
            >
            {{ $t('Pending') }}
          </button>
          <button
            class="col br-15 btn-custom fiat-tab q-mt-none"
            :class="[{'dark': darkMode}, {'active-buy-btn': orderType == 'COMPLETED'}]"
            @click="orderType = 'COMPLETED'"
            >
            {{ $t('Completed') }}
          </button>
        </div>

        <!-- Transactions -->
        <div>
          <q-pull-to-refresh @refresh="refreshData">
            <q-list class="scroll-y" @touchstart="preventPull" ref="scrollTarget" :style="`max-height: ${minHeight - 100}px`" style="overflow:auto;">
              <q-item v-for="(transaction, index) in transactions" :key="index" clickable @click="''">
                <q-item-section>
                  <div class="q-pb-sm q-pl-md" :style="darkMode ? 'border-bottom: 1px solid grey' : 'border-bottom: 1px solid #DAE0E7'">
                    Hello World {{ index }}
                  </div>
                </q-item-section>
              </q-item>
            </q-list>
          </q-pull-to-refresh>
        </div>
    </div>
  </q-pull-to-refresh>
</template>
<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import HeaderNav from 'src/components/header-nav.vue';
import { ref } from 'vue'

export default {
  setup () {
    const scrollTargetRef = ref(null)
    return {
      scrollTargetRef
    }
  },
  data () {
    return {
      orderType: 'ALL',
      currency: { name: 'PHP', symbol: 'PHP'},
      minHeight: this.$q.platform.is.ios ? this.$q.screen.height - 130 : this.$q.screen.height - 100,
      cashout: [
        {
          fiatAmount: 1521.63,
          amount: 0.060,
          txid: '757y8yu',
          status: 'Completed'
        },
        {
          fiatAmount: 1521.63,
          amount: 0.060,
          txid: '757y8yu',
          status: 'Completed'
        },
        {
          fiatAmount: 1521.63,
          amount: 0.060,
          txid: '757y8yu',
          status: 'Completed'
        }
      ],
      transactions: [
        {}
      ]
    }
  },
  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    }
  },
  components: {
    HeaderNav
  },
  methods: {
    getDarkModeClass,
    async refreshPage (done) {
      done()
    },
  }
}
</script>
<style lang="scss" scoped>
  .btn-transaction {
    font-size: 16px;
    background-color: rgb(242, 243, 252);
    border-radius: 24px;
    padding: 4px;
    margin-left: 7%;
    margin-right: 7%;
    margin-top: 10px;
  }
  .btn-custom {
    height: 40px;
    width: 40%;
    border-radius: 20px;
    border: none;
    color: #4C4F4F;
    background-color: transparent;
    outline:0;
    cursor: pointer;
    transition: .2s;
    font-weight: 500;
  }
  .btn-custom:hover {
    background-color: rgb(242, 243, 252);
    color: #4C4F4F;
  }
  .btn-custom.active-buy-btn {
    background-color: rgb(60, 100, 246) !important;
    color: #fff !important;
  }
  .btn-custom.active-sell-btn {
    background-color: #ed5f59 !important;
    color: #fff !important;
  }
  .ib-text {
    display: inline-block;
  }
  .col-transaction {
    padding-top: 2px;
    font-weight: 500;
  }
</style>

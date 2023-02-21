<template>
  <q-card
    class="br-15 q-pt-sm q-mx-md"
    :class="[ darkMode ? 'text-white pt-dark-card' : 'text-black',]"
    v-if="isloaded"
  >
    <div class="text-center q-py-md">
      {{ $t('SwapFrom') }}:
    </div>

    <q-item clickable class="q-mx-md">
      <q-item-section avatar class="items-center" @click="selectSourceToken">
        <div style="height: 30px; width: 30px; border-radius: 50%;" class="q-mb-sm" v-html="deposit.icon"></div>
        <q-item-label>
          {{deposit.coin }}<q-icon name="expand_more"/>
        </q-item-label>
      </q-item-section>
      <q-item-section>
        <q-input
          dense
          filled
          :dark="darkMode"
          :modelValue="shiftAmount"
        />
        <q-item-label
          class="text-right q-mt-sm"
          caption
          :class="darkMode ? 'text-grey-6' : ''"
        >
          Balance Daw
        </q-item-label>
      </q-item-section>
    </q-item>
    <div class="q-px-md q-my-xs row items-center justify-center">
      <q-btn
        icon="mdi-swap-vertical"
        round
        text-color="blue-9"
        color="grey-4"
        unelevated
        @click="swapCoin"
      />
    </div>

    <div class="full-width text-center q-mt-md">
      {{ $t('SwapTo') }}:
    </div>

    <q-item clickable class="q-mx-md">
      <q-item-section avatar class="item-center" @click="selectSettleToken">
        <div style="height: 30px; width: 30px; border-radius: 50%;" class="q-mb-sm" v-html="settle.icon"></div>
        <q-item-label>
          {{ settle.coin }} <q-icon name="expand_more"/>
        </q-item-label>
      </q-item-section>

      <q-item-section>
        <q-skeleton v-if="amountLoaded" type="rect"/>
        <q-input
            v-else
            disable
            dense
            filled
            :dark="darkMode"
            :modelValue="convertionRate"
          />
      </q-item-section>
    </q-item>
  </q-card>
  <div class="row justify-center q-py-lg" style="margin-top: 100px" v-if="!isloaded">
    <ProgressLoader/>
  </div>
</template>

<script>
import RampShiftTokenSelectDialog from './RampShiftTokenSelectDialog.vue'
import ProgressLoader from '../ProgressLoader.vue'
import { compactSizePrefixToSize } from '@bitauth/libauth'
import { ConstantTypes } from '@vue/compiler-core'

export default {
  components: {
    ProgressLoader
},
  data () {
    return {
      error: false,
      isloaded: false,
      darkMode: this.$store.getters['darkmode/getStatus'],
      deposit: {
        coin: 'BTC',
        network: 'bitcoin',
        icon: ''
      },
      settle: {
        coin: 'BCH',
        network: 'bitcoincash',
        icon: ''
      },
      tokenList: [],
      tokenListLoaded: false,
      test: null,
      amountLoaded: false,
      shiftAmount: 0.0,
      convertionRate: 0.0
    }
  },
  methods: {
    selectSourceToken () {
      this.$q.dialog({
        component: RampShiftTokenSelectDialog,
        componentProps: {
          tokenList: this.tokenList,
          title: 'Select Source',
          type: 'source'
        }

      })
    },
    selectSettleToken () {
      this.$q.dialog({
        component: RampShiftTokenSelectDialog,
        componentProps: {
          tokenList: this.tokenList,
          title: 'Select Destination',
          type: 'settle'
        }
      })
    },
    swapCoin () {
      const vm = this

      const temp = vm.deposit

      vm.deposit = vm.settle
      vm.settle = temp
    },
    async loadIcon () {
      const vm = this

      for (const item in vm.tokenList) {
        const token = vm.tokenList[item]
        if (item === '0') {
          vm.tokenList[item].icon = await vm.getCoinImage(token.coin, token.network)
        } else {
          const last = vm.tokenList[item-1]
          if (last) {
            if (vm.tokenList[item].coin === vm.tokenList[item - 1].coin) {
              vm.tokenList[item].icon = vm.tokenList[item - 1].icon
            } else {
              vm.tokenList[item].icon = await vm.getCoinImage(token.coin, token.network)
            }
          }
        }
      }
    },
    async getTokenList () {
      const vm = this
      const url = 'https://sideshift.ai/api/v2/coins'

      const resp = await vm.$axios.get(url).catch(function () { vm.error = true })

      if (resp.status === 200 || resp.status === 201) {
        for (const item in resp.data) {
          const coinData = resp.data[item]
          for (const item2 in coinData.networks) {
            const temp = {
              coin: coinData.coin,
              network: coinData.networks[item2],
              icon: ''//await vm.getCoinImage(coinData.coin, coinData.networks[item2])
            }
            vm.tokenList.push(temp)

            //vm.tokenList[vm.tokenList.length-1].icon = await vm.getCoinImage(coinData.coin, coinData.networks[item2])
          }
        }
        vm.tokenListLoaded = true

        await this.loadIcon()
      }
    },
    async getCoinImage (coin, network) {
      const vm = this
      const url = 'https://sideshift.ai/api/v2/coins/icon/' + coin + '-' + network

      const resp = await vm.$axios.get(url).catch(function () {
        vm.error = true
      })
      return resp.data
    }
  },
  async mounted () {
    const vm = this

    //initial
    vm.deposit.icon = await vm.getCoinImage(vm.deposit.coin, vm.deposit.network)
    vm.settle.icon = await vm.getCoinImage(vm.settle.coin, vm.settle.network)

    vm.getTokenList()
    vm.isloaded = true
    console.log(vm.isloaded)
  }
}
</script>

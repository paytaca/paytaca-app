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
        <q-item-label class="text-center" style="font-size: 10px; color: gray;" >
          {{getNetwork(deposit)}}
        </q-item-label>
      </q-item-section>
      <q-item-section>
        <q-input
          dense
          filled
          :dark="darkMode"
          v-model="shiftAmount"
          @update:modelValue="function(){
              updateConvertionRate()
            }"
        />
        <q-item-label
          class="text-right q-mt-sm"
          caption
          :class="darkMode ? 'text-grey-6' : ''"
          v-if="deposit.coin==='BCH'"
        >
          Balance {{ bchBalance }}
        </q-item-label>
        <q-item-label
          class="text-right q-mt-sm"
          caption
          style="color:red"
          v-if="invalidAmount"
        >
          Not a valid amount, please try again.
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

    <q-item class="q-mx-md">
      <q-item-section avatar class="item-center" @click="selectSettleToken">
        <div style="height: 30px; width: 30px; border-radius: 50%;" class="q-mb-sm" v-html="settle.icon"></div>
        <q-item-label class="">
          {{ settle.coin }} <q-icon name="expand_more"/>
        </q-item-label>
        <q-item-label class="text-center" style="font-size: 10px; color: gray;" >
          {{getNetwork(settle)}}
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
            :modelValue="settleAmount"
          />
          <q-item-label
            class="text-right q-mt-sm"
            caption
            :class="darkMode ? 'text-grey-6' : ''"
            v-if="convertionRate && shiftAmount"
          >
            <i>1 {{ deposit.coin }} = {{ convertionRate }} {{ settle.coin }}</i>
          </q-item-label>
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
import { debounce } from 'quasar'

export default {
  components: {
    ProgressLoader
  },
  data () {
    return {
      error: false,
      invalidAmount: false,
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
      convertionRate: 0.0,
      settleAmount: 0.0
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
        .onOk(coin => {
          // console.log(coin)

          if (coin.coin === this.settle.coin && coin.network === this.settle.network) {
            this.swapCoin()
          } else {
            this.deposit = coin
          }

          this.updateConvertionRate()
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
        .onOk(coin => {
          // console.log(coin)
          //check token

          if (coin.coin === this.deposit.coin && coin.network === this.deposit.network) {
            this.swapCoin()
          } else {
            this.settle = coin
          }
          this.updateConvertionRate()
        })
    },
    swapCoin () {
      const vm = this

      const temp = vm.deposit

      vm.deposit = vm.settle
      vm.settle = temp

      vm.updateConvertionRate()
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
    },
    isAmountValid (value) {
      // amount with comma and decimal regex
      const regex = /^(\d*[.]\d+)$|^(\d+)$|^((\d{1,3}[,]\d{3})+(\.\d+)?)$/

      if (regex.test(value)) {
        return true
      } else {
        return false
      }
    },
    updateConvertionRate: debounce(async function () {
      const vm = this
      vm.invalidAmount = false

      //check if valid amount
      if (vm.shiftAmount) {
        if (vm.isAmountValid(vm.shiftAmount)) {
          vm.invalidAmount = false
          vm.convertionRate = 0.0

          // check exchange rate
          const url = 'https://sideshift.ai/api/v2/pair/' + vm.deposit.coin + '-' + vm.deposit.network + '/' + vm.settle.coin + '-' + vm.settle.network
          console.log(url)
          const resp = await vm.$axios.get(url).catch(function () { vm.error = true })

          if (resp.status === 200 || resp.status === 201) {
            console.log(resp.data)
            vm.convertionRate = parseFloat(resp.data.rate)
            const shift = parseFloat(vm.shiftAmount)
            console.log(vm.convertionRate)

            vm.settleAmount = shift * vm.convertionRate

            if (vm.settleAmount < 0) {
              vm.settleAmount *= -1
            }
          }
        } else {
          vm.invalidAmount = true
        }
      } else {
        vm.settleAmount = ''
      }
    }, 500),
    async loadIcon () {
      const vm = this

      for (const item in vm.tokenList) {
        const token = vm.tokenList[item]
        if (item === '0') {
          vm.tokenList[item].icon = await vm.getCoinImage(token.coin, token.network)
        } else {
          const last = vm.tokenList[item - 1]
          if (last) {
            if (vm.tokenList[item].coin === vm.tokenList[item - 1].coin) {
              vm.tokenList[item].icon = vm.tokenList[item - 1].icon
            } else {
              vm.tokenList[item].icon = await vm.getCoinImage(token.coin, token.network)
            }
          }
        }
        // console.log(vm.tokenList[item].icon)
        //remove: width + height
        let icon = vm.tokenList[item].icon
        const heightRegex = /height="\d+"\s/
        const widthRegex = /width="\d+"\s/

        if (heightRegex.test(icon)) {
          icon = icon.replace(heightRegex, '')
        }
        if (widthRegex.test(icon)) {
          icon = icon.replace(widthRegex, '')
        }

        vm.tokenList[item].icon = icon
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
              icon: ''
            }
            vm.tokenList.push(temp)
          }
        }
        vm.isloaded = true
        // vm.tokenList.sort()

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
  computed: {
    bchBalance () {
      return this.$store.getters['assets/getAssets'][0].balance
    }
  },
  async mounted () {
    const vm = this

    //initial
    vm.deposit.icon = await vm.getCoinImage(vm.deposit.coin, vm.deposit.network)
    vm.settle.icon = await vm.getCoinImage(vm.settle.coin, vm.settle.network)

    vm.getTokenList()
    // vm.isloaded = true
    // console.log('testing')
    // let dummyString = '<svg width="512" height="512" viewBox="0 0 512 512"'
    // const widthRegex = /width="\d+"\s/
    // const heightRegex = /height="\d+"\s/
    // dummyString = dummyString.replace(widthRegex, '')
    // dummyString = dummyString.replace(heightRegex, '')
    // console.log(dummyString)

    // console.log(regex.test(test))
  }
}
</script>

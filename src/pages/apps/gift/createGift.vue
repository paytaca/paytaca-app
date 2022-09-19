<template>
<div class="static-container">
  <div
    dense
    id="app-container"
    style="background-color: #ECF3F3; min-height: 100vh;"
    class="flex flex-center"
    >
    <HeaderNav
      title="Gifts"
      backnavpath="/apps/chooseGift"
      style="position: fixed; top: 0; background: #ECF3F3; width: 100%; z-index: 100 !important;"
      class="q-px-sm"
      @click="this.$store.dispatch('gift/retAddress')"
    />
<!--       <div>
        {{ $store.getters['gift/getAmount'] }}
        {{ $store.getters['gift/getTitle'] }}s
      </div> -->
      <div class="q-pa-lg" style="width: 32%">
      <div class="q-pt-xl">
          <label>
            Enter Amount:
          </label>
          <q-input
            required
            placeholder="Amount"
            filled
            clearable
            :rules="[val => !!val || 'Field is required']"
            type="number"
            @input="this.amount"
            v-model="amount"
          >
          </q-input>
          <div class="q-pa-sm">
          </div>

          <label>
            Enter number of Gift Items
          </label>
          <q-input
            required
            placeholder="Instances"
            filled
            type="number"
            oninput="javascript: if (this.value.length > this.maxLength) this.value = this.value.slice(0, this.maxLength);"
            maxlength="3"
            clearable
            :rules="[val => !!val || 'Field is required']"
          >
          </q-input>
          <div class="q-pa-sm">
          </div>

          <label>
            Enter Campaign ID
          </label>
          <q-input
            placeholder="Campaign ID"
            filled
            type="string"
            clearable
          >
          </q-input>
          <div class="q-pa-sm q-pb-lg">
          </div>

          <label>
            Max Amount per Address
          </label>
          <q-input
            placeholder="Amount"
            filled
            type="number"
            clearable
          >
          </q-input>
            <div class="q-pa-sm q-pt-lg flex flex-center" >
              <q-btn
                no-caps
                rounded
                color="blue-9"
                type="submit"
                label="Generate"
                class="flex flex-center"
                @click="this.pkToCashAdd()"
              >
              </q-btn>
              <div class="q-pa-sm q-pb-lg"></div>
<!--             <div class="q-pa-sm q-pt-lg flex flex-center" >
              <q-btn
                no-caps
                rounded
                color="blue-9"
                type="submit"
                label="cash address"
                class="flex flex-center"
                @click="recoverSecret()"
              >
              </q-btn>
              </div> -->
        </div>
      <div>
          <div class="flex flex-center" >
            <div class="flex flex-center col-qr-code">
                <canvas id="canvas" class="flex flex-center"></canvas>
            </div>
            <div class="flex flex-center myStyle">
              <!-- <h5>{{ $store.state.gift.cashAddress }}</h5> -->
            </div>
          </div>
          <div class="flex flex-center" @click="copyToClipboard(this.$store.state.gift.cashAddress)">
          <p class="fontStyle">{{ $store.state.gift.cashAddress }}</p>
          </div>
      </div>
        </div>
      </div>
  </div>
</div>
</template>
<script>
import HeaderNav from '../../../components/header-nav'
// import { mapState } from 'vuex'
import { getMnemonic, Wallet } from '../../../wallet'

export default {
  name: 'Gifts',
  components: { HeaderNav },
  props: {
    uri: {
      type: String,
      default: ''
    }
  },
  data () {
    return {
      wallet: '',
      txid: '',
      amount: ''
    }
  },

  methods: {
    recoverSecret () {
      this.$store.dispatch('gift/recoverSecret')
    },
    pkToCashAdd () {
      this.$store.dispatch('gift/changeAmount')
      this.$store.dispatch('gift/generatePrivateKey')
      this.$store.dispatch('gift/convertToCashAddress')
      this.$store.dispatch('gift/splitSecret')
      this.$store.dispatch('gift/storeShare')
      // this.$store.dispatch('gift/handleSubmit')
      const cAdd = this.$store.state.gift.cashAddress
      this.handleSubmit(cAdd)
      this.qrCode()
      // console.log(this.updateAmount())
    },
    qrCode () {
      const key = this.$store.state.gift.share[0]
      const QRCode = require('qrcode')
      const canvas = document.getElementById('canvas')
      QRCode.toCanvas(canvas, key, function (error) {
        if (error) console.error(error)
        console.log('success!')
      })
    },
    async handleSubmit (cAdd) {
      const vm = this
      const address = cAdd
      vm.wallet.BCH.sendBch(this.amount, address).then(function (result, err) {
        if (result.success) {
          vm.txid = result.txid
        } else {
          console.error(err)
        }
      })
    },
    copyToClipboard (value) {
      this.$copyText(value)
      this.$q.notify({
        message: 'Copied to clipboard',
        timeout: 800,
        color: 'blue-9',
        icon: 'mdi-clipboard-check'
      })
    }

  },
  // wallet call function when mounted
  mounted () {
    const vm = this
    getMnemonic().then(function (mnemonic) {
      const wallet = new Wallet(mnemonic)
      wallet.sBCH.getOrInitWallet()
        .then(() => {
          vm.wallet = wallet
        })
    })
  }
}
</script>
<style lang="scss" scoped>
    .col-qr-code {
    margin-left: auto;
    margin-right: auto;
    margin-bottom: 10px;
    text-align: center;
    width: 500px;
    height: 300px;
    border-radius: 16px;
    border: 4px solid #ed5f59;
    padding: 10px 10px 32px 10px;
    background: white;
  }
  .fontStyle {
    font-size:medium;
  }
</style>

<template>
  <div id="app-container" class="" :class="{'pt-dark': darkMode}">
    <header-nav
      backnavpath="/"
      :title="$t('Sign Transaction')"
    ></header-nav>
    <div class="">
      <div class="q-pa-md" style="padding-top: 40px;">
        <div class="col-12 q-mt-lg items-center">
          <p class="text-lg">Signer:</p><textarea readonly class="ro-text" v-text="lastAddress"></textarea>
          <p class="text-lg">Origin:</p><textarea readonly class="ro-text" v-text="origin"></textarea>
          <p class="text-lg">Inputs:</p>
          <div v-for="(input,idx) of tx.inputs"> <span class="font-normal">{{`#${idx}:`}}</span> {{`${satoshiToBCHString(input.valueSatoshis)} (${binToHex(input.outpointTransactionHash).slice(0,4)}...${binToHex(input.outpointTransactionHash).slice(-4)}:${input.outpointIndex} ${sighashText(input.sighash)}) ${input.address?.split("bitcoincash:")[1]}` }}</div>
          <p class="text-lg">Outputs:</p>
          <div v-for="(output,idx) of tx.outputs"> <span class="font-normal">{{`#${idx}:`}}</span> {{`${satoshiToBCHString(output.valueSatoshis)} ${output.address?.split("bitcoincash:")[1]}` }}</div>
        </div>
      </div>
      <hr />
      <div class="q-mt-lg q-mb-lg text-center row justify-evenly">
        <q-btn size="lg" class="btn text-white" :label="$t('Cancel')" @click="cancel" />
        <q-btn size="lg" class="btn text-white" :label="$t(broadcast ? 'Sign and Send' : 'Sign')" @click="sign" />
      </div>
    </div>
  </div>
</template>

<script>
import { markRaw } from '@vue/reactivity'
import { getMnemonic, Wallet } from '../../wallet'
import HeaderNav from '../../components/header-nav'
import { secp256k1, sha256, binToBase64, utf8ToBin, hexToBin, decodePrivateKeyWif, SigningSerializationAlgorithmIdentifier, cashAddressToLockingBytecode, Transaction, decodeTransaction, binToHex } from "@bitauth/libauth"

function _cashAddressToLockingBytecode(cashaddr) {
  const outputLockingBytecode = cashAddressToLockingBytecode(cashaddr);
    if (typeof outputLockingBytecode === "string")
      throw new Error(outputLockingBytecode);

    return outputLockingBytecode.bytecode;
}

    const transactionHex = "020000000234e2db8c833a5d981c311dc053ee8c541280e80d34ef90ef7c6d4c4b2e619b0300000000e4004ce104c08fd6391456b6b22042b90dd67bf2fbfb9aff7d37fbee1124520390d0035479009c6300ce827701219d5379547a9dc3529d00cd00c78800d100ce8800cc00c65279939d00cf527f7781768b537aa16900d202feed52798b52807e8800d3009d02e80351cc789d51cd51c78851d3009d51d101207f7500ce01207f758851d27b52808802200351c6537a947c947c94760222029f63c4529d6751c752cd788852cc52799dc4539d52d181009d75686d755167547a519d5479a9537a88547a547aadc3519d00ce8277009e6300cd00c78800d100ce8800cc02e8039d686d755168feffffffff500c9993800865192de55d11c95a450495781127050c5c20cb9e43ff8e77ae000000006441f6e93b18a3ce51809b6da37d4aec108f26b1e6456d85d67a0b70684afba9099cc5b2b74116d4a721dffe24582c4bc5f71db8e9e21b1cf9cb227afc9b18dd1e314121032dac7eb4aee100c4ef38f3d51302716eb6c7ed73bafc56497bbfd4250ae98eb6feffffff03a0f70300000000003eef400ef3fba6ae584048b6ad38942925b304e038e9189c2373446a547335cbc0416204feed0100a9147432ddab77c7ac2b3a7a26b2177d12656521908a87e8030000000000003eef400ef3fba6ae584048b6ad38942925b304e038e9189c2373446a547335cbc0416002000076a914f9da345849ad4138318a2ed6f0014318835fadc488aca86a0b00000000001976a914f9da345849ad4138318a2ed6f0014318835fadc488acd7000000";
    const transaction = decodeTransaction(hexToBin(transactionHex));
    if (typeof transaction === "string") {
      throw transaction;
    }
    console.log(transaction);


export default {
  name: 'sign-transaction',
  components: {
    HeaderNav
  },
  props: {
    origin: {
      type: String,
      required: true
    },
    assetId: {
      type: String,
      required: true
    },
    transaction: {
      type: Object,
      required: true,
      default: transaction
      // default: {
      //   inputs: [{
      //     txId: "6e08d6330e010214a94528f08c95da3c1a0d91ef61828038d8a3657134cc06ba",
      //     vout: 0,
      //     value: 10000,
      //     address: "bitcoincash:qr0сjjcz57u7k5pv6t5rzgt0v50xgd5qvcj0mg3m4f",
      //     sighash: SigningSerializationAlgorithmIdentifier.allOutputs,
      //     unlockingBytecode: [],
      //   },
      //   {
      //     txId: "6e08d6330e010214a94528f08c95da3c1a0d91ef61828038d8a3657134cc06ba",
      //     vout: 0,
      //     value: 10000,
      //     address: "bitcoincash:qr0сjjcz57u7k5pv6t5rzgt0v50xgd5qvcj0mg3m4f",
      //     sighash: SigningSerializationAlgorithmIdentifier.allOutputs,
      //   }],
      //   outputs: [{
      //     address: "bitcoincash:qr0сjjcz57u7k5pv6t5rzgt0v50xgd5qvcj0mg3m4f",
      //     value: 10000,
      //   },
      //   {
      //     address: "bitcoincash:qr0сjjcz57u7k5pv6t5rzgt0v50xgd5qvcj0mg3m4f",
      //     value: 10000,
      //   }],
      // }
      // default: {
      //   inputs: [{
      //     outpointIndex: 0,
      //     outpointTransactionHash: "6e08d6330e010214a94528f08c95da3c1a0d91ef61828038d8a3657134cc06ba",
      //     sequenceNumber: 0,
      //     unlockingBytecode: {
      //       // compiler: {},
      //       // data: {
      //       //   keys: { privateKeys: { key: [] } },
      //       // },
      //       valueSatoshis: BigInt(10000),
      //       // script: "unlock",
      //       // token: {}//libAuthToken,
      //     },
      //     address: "bitcoincash:qr0сjjcz57u7k5pv6t5rzgt0v50xgd5qvcj0mg3m4f",
      //     // valueSatoshis: BigInt(0),
      //     sighash: SigningSerializationAlgorithmIdentifier.allOutputs,
      //   },
      //   {
      //     outpointIndex: 0,
      //     outpointTransactionHash: "6e08d6330e010214a94528f08c95da3c1a0d91ef61828038d8a3657134cc06ba",
      //     sequenceNumber: 0,
      //     unlockingBytecode: {
      //       // compiler: {},
      //       // data: {
      //       //   keys: { privateKeys: { key: [] } },
      //       // },
      //       valueSatoshis: BigInt(10000),
      //       // script: "unlock",
      //       // token: {}//libAuthToken,
      //     },
      //     address: "bitcoincash:qr0сjjcz57u7k5pv6t5rzgt0v50xgd5qvcj0mg3m4f",
      //     // valueSatoshis: BigInt(0),
      //     sighash: SigningSerializationAlgorithmIdentifier.allOutputs,
      //   }],
      //   outputs: [{
      //     lockingBytecode: _cashAddressToLockingBytecode("bitcoincash:qr0сjjcz57u7k5pv6t5rzgt0v50xgd5qvcj0mg3m4f"),
      //     valueSatoshis: BigInt(10000),
      //   }],
      //   locktime: 0,
      //   version: 2,
      // }
    },
    broadcast: {
      type: Boolean,
      required: false,
      default: true
    },
    eventResponseKey: {
      type: String,
      required: true
    },
  },
  data () {
    return {
      asset: {},
      wallet: null,

      darkMode: this.$store.getters['darkmode/getStatus'],
      lastAddress: '',
      lastAddressIndex: 0,
      signedMessage: '',
      sentResponse: false,
      fetchedInputs: [],
      tx: {},
    }
  },

  computed: {
  },

  watch: {
  },

  methods: {
    binToHex(val) {
      return binToHex(val);
    },

    satoshiToBCHString (amount = 0) {
      const bchAmount = Number(amount) * (10 ** -8)
      return `${bchAmount.toFixed(8)} BCH`
    },

    sighashText (sighash) {
      switch (sighash) {
        case SigningSerializationAlgorithmIdentifier.allOutputs:
          return "SIGHASH_ALL"
        default:
          return "";
      }
    },

    async sign () {
      this.signedMessage = this.assetId === "sbch" ?
        await this.signSmartBCH() :
        await this.signBCH()
      this.$q.bex.send('background.paytaca.signMessageResponse', {signedMessage: this.signedMessage, eventResponseKey: this.eventResponseKey})
      this.sentResponse = true
      window.close()
    },

    async signBCH () {
      const message_magic = (str) => {
        const length = utf8ToBin(str).length.toString(16)
        let payload = `\x18Bitcoin Signed Message:\n`
        return new Uint8Array([
          ...utf8ToBin(payload),
          ...hexToBin(length),
          ...utf8ToBin(str),
        ])
      }

      const hash_message = (message) => {
        const h = sha256.hash
        return h(h(message_magic(message)))
      }

      let messageHash = hash_message(this.message)
      const privateKeyWif = await this.wallet.BCH.getPrivateKey(`0/${this.lastAddressIndex}`)
      const decodeResult = decodePrivateKeyWif(privateKeyWif)
      const privateKey = decodeResult.privateKey
      let rs = secp256k1.signMessageHashRecoverableCompact(
        privateKey,
        messageHash
      )

      let electronEncoding = new Uint8Array([
        ...[31 + rs.recoveryId],
        ...rs.signature,
      ])
      return binToBase64(electronEncoding)
    },

    async signSmartBCH () {
      return this.wallet.sBCH._wallet.signMessage(this.message)
    },

    async cancel () {
      this.$q.bex.send('background.paytaca.signMessageResponse', {signedMessage: undefined, eventResponseKey: this.eventResponseKey})
      this.sentResponse = true
      window.close()
    },
  },

  async beforeMount () {
    // this.transaction = {...this.transaction, ...transaction};
    // console.log(JSON.stringify(this.transaction, null, 2))
    if (typeof this.transaction === "string") {
      try {
        this.tx = {...this.tx, ...decodeTransaction(hexToBin(this.transaction))};
      } catch {

      }
    }
    this.tx.inputs.forEach(val => val.address = "bitcoincash:qqsxtesttesttesttesttesttest");
    this.tx.inputs.forEach(val => val.sighash = SigningSerializationAlgorithmIdentifier.allOutputs);
    this.tx.inputs.forEach(val => val.valueSatoshis = 0n);

    const walletInfo = this.$store.getters['global/getWallet'](this.assetId)
    if (walletInfo) {
      const { lastAddress, lastAddressIndex } = walletInfo
      this.lastAddress = lastAddress
      this.lastAddressIndex = lastAddressIndex
    }

    // Load wallets
    const mnemonic = await getMnemonic()
    const network = {bch: "BCH", slp: "BCH", sbch: "sBCH"}[this.assetId]
    const wallet = new Wallet(mnemonic, network)
    this.wallet = markRaw(wallet)
    if (this.assetId === 'sbch') {
      this.wallet.sBCH.getOrInitWallet()
    } else {
      // const ownInputs = this.transaction.inputs.filter(input => !Array.isArray(input.lockingBytecode))
      // const ownInputsValue = ownInputs.reduce((prev, cur) => prev + cur.valueSatoshis, 0);
      // // this.fetchedInputs = 
      // this.ownUtxos = this.wallet.watchtower.BCH.getBchUtxos(this.wallet.walletHash, )
    }
  },
}
</script>

<style lang="scss">
  // p {
  //   margin: 0;
  // }

  .font-normal {
    font-weight: 400;
  }

  .ro-text {
    width: 100%;
    overflow-wrap: anywhere;
    border-color: transparent;
    background-color: transparent;
    resize: none;
  }
  .signed {
    height: 80px;
  }
  #app-container {
    // position: relative !important;
    background-color: #ECF3F3;
    min-height: 100vh;
    flex-direction: column;
    display: flex;
  }
  .text-sm {
    font-size: 12px;
  }
  .text-lg {
    font-size: 20px;
  }
  .btn {
    background-image: linear-gradient(to right bottom, #3b7bf6, #a866db, #da53b2, #ef4f84, #ed5f59);
    color: white;
  }
  .btn-dark {
    background-image: linear-gradient(to right bottom, #204589, #35538b, #813c6d, #9c3356, #a5403d);
    color: white;
  }
</style>

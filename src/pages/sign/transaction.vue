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
          <div v-for="(input,idx) of tx.inputs">
            <span class="font-normal">{{`#${idx}:`}}</span>
            {{`${satoshiToBCHString(input.valueSatoshis)} (${binToHex(input.outpointTransactionHash).slice(0,4)}...${binToHex(input.outpointTransactionHash).slice(-4)}:${input.outpointIndex} ${sighashText(input.sighash)}) ${input.address?.split("bitcoincash:")[1]}` }}
            <span v-if="input.token">
              <br/>
              Token: <span :style="{'background-color': `#${binToHex(input.token.category.slice(0, 3))}`}">{{ binToHex(input.token.category.slice(0, 3)) }} <br/></span>
              <span v-if="input.token.nft.commitment.length"> Commitment: {{ binToHex(input.token.nft.commitment) }} <br/></span>
              <span v-if="input.token.nft.capability"> Capability: {{ input.token.nft.capability }} <br/></span>
              <span v-if="input.token.amount > 0n"> Fungible amount: {{ input.token.amount }} <br/></span>
            </span>
            <p/>
          </div>
          <p class="text-lg">Outputs:</p>
          <div v-for="(output,idx) of tx.outputs"> 
            <span class="font-normal">{{`#${idx}:`}}</span>
            {{`${satoshiToBCHString(output.valueSatoshis)} ${output.address?.split("bitcoincash:")[1]}` }}
            <span v-if="output.token">
              <br/>
              Token: <span :style="{'background-color': `#${binToHex(output.token.category.slice(0, 3))}`}">{{ binToHex(output.token.category.slice(0, 3)) }} <br/></span>
              <span v-if="output.token.nft.commitment.length"> Commitment: {{ binToHex(output.token.nft.commitment) }} <br/></span>
              <span v-if="output.token.nft.capability"> Capability: {{ output.token.nft.capability }} <br/></span>
              <span v-if="output.token.amount > 0n"> Fungible amount: {{ output.token.amount }} <br/></span>
            </span>
            <p/>
          </div>
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
import { decodeAuthenticationInstructions, authenticationTemplateToCompilerBCH, generateTransaction, hash160, secp256k1, sha256, binToBase64, utf8ToBin, hexToBin, decodePrivateKeyWif, SigningSerializationAlgorithmIdentifier, cashAddressToLockingBytecode, Transaction, decodeTransaction, binToHex, lockingBytecodeToCashAddress, encodeTransaction, vmNumberToBigInt } from "@bitauth/libauth"

function _cashAddressToLockingBytecode(cashaddr) {
  const outputLockingBytecode = cashAddressToLockingBytecode(cashaddr);
    if (typeof outputLockingBytecode === "string")
      throw new Error(outputLockingBytecode);

    return outputLockingBytecode.bytecode;
}

    // const transactionHex = "020000000234e2db8c833a5d981c311dc053ee8c541280e80d34ef90ef7c6d4c4b2e619b0300000000e4004ce104c08fd6391456b6b22042b90dd67bf2fbfb9aff7d37fbee1124520390d0035479009c6300ce827701219d5379547a9dc3529d00cd00c78800d100ce8800cc00c65279939d00cf527f7781768b537aa16900d202feed52798b52807e8800d3009d02e80351cc789d51cd51c78851d3009d51d101207f7500ce01207f758851d27b52808802200351c6537a947c947c94760222029f63c4529d6751c752cd788852cc52799dc4539d52d181009d75686d755167547a519d5479a9537a88547a547aadc3519d00ce8277009e6300cd00c78800d100ce8800cc02e8039d686d755168feffffffff500c9993800865192de55d11c95a450495781127050c5c20cb9e43ff8e77ae000000006441f6e93b18a3ce51809b6da37d4aec108f26b1e6456d85d67a0b70684afba9099cc5b2b74116d4a721dffe24582c4bc5f71db8e9e21b1cf9cb227afc9b18dd1e314121032dac7eb4aee100c4ef38f3d51302716eb6c7ed73bafc56497bbfd4250ae98eb6feffffff03a0f70300000000003eef400ef3fba6ae584048b6ad38942925b304e038e9189c2373446a547335cbc0416204feed0100a9147432ddab77c7ac2b3a7a26b2177d12656521908a87e8030000000000003eef400ef3fba6ae584048b6ad38942925b304e038e9189c2373446a547335cbc0416002000076a914f9da345849ad4138318a2ed6f0014318835fadc488aca86a0b00000000001976a914f9da345849ad4138318a2ed6f0014318835fadc488acd7000000";
    // const transaction = decodeTransaction(hexToBin(transactionHex));
    // if (typeof transaction === "string") {
    //   throw transaction;
    // }
    // console.log(transaction);

const artifactMap = {"127183cef4d91bde0bb655f7a0092835319a23cf": {
  abi: [
    {
      "name": "mint",
      "inputs": []
    },
    {
      "name": "withdraw",
      "inputs": [
        {
          "name": "pk",
          "type": "pubkey"
        },
        {
          "name": "s",
          "type": "sig"
        }
      ]
    }
  ],
  bytecode: "04f1535f231456b6b22042b90dd67bf2fbfb9aff7d37fbee1124520390d0035479009c6300ce827701219d5379547a9dc3529d00cd00c78800d100ce8800cc00c65279939d00cf527f7781768b537aa16900d202feed52798b52807e8800d3009d02e80351cc789d51cd51c78851d3009d51d101207f7500ce01207f758851d27b52808802200351c6537a947c947c94760222029f63c4529d6751c752cd788852cc52799dc4539d52d181009d75686d755167547a519d5479a9537a88547a547aadc3519d00ce8277009e6300cd00c78800d100ce8800cc02e8039d686d755168"
}}

const parseExtendedJson = (jsonString) => {
  const uint8ArrayRegex = /^<Uint8Array: 0x(?<hex>[0-9a-f]*)>$/u;
  const bigIntRegex = /^<bigint: (?<bigint>[0-9]*)n>$/;

  return JSON.parse(jsonString, (_key, value) => {
    if (typeof value === "string") {
      const bigintMatch = value.match(bigIntRegex);
      if (bigintMatch) {
        return BigInt(bigintMatch[1]);
      }
      const uint8ArrayMatch = value.match(uint8ArrayRegex);
      if (uint8ArrayMatch) {
        return hexToBin(uint8ArrayMatch[1]);
      }
    }
    return value;
  });
}

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
      type: String,
      required: true,
      default: "02000000024fe91b370ab0ac67b3139d04f7ca253e51ad1e8a0be89efa9717abb2956b00b600000000e4004ce104f1535f231456b6b22042b90dd67bf2fbfb9aff7d37fbee1124520390d0035479009c6300ce827701219d5379547a9dc3529d00cd00c78800d100ce8800cc00c65279939d00cf527f7781768b537aa16900d202feed52798b52807e8800d3009d02e80351cc789d51cd51c78851d3009d51d101207f7500ce01207f758851d27b52808802200351c6537a947c947c94760222029f63c4529d6751c752cd788852cc52799dc4539d52d181009d75686d755167547a519d5479a9537a88547a547aadc3519d00ce8277009e6300cd00c78800d100ce8800cc02e8039d686d755168feffffffb2a383a2fae692a64df4a4a2dbd0b55cc255e4c0494b819f3475180e13b19e8b000000006441caa799abe82994546dd9f084dd8d909552e4b3afb7c16ee03bee3962bd93b1af743b83bc86d9d98220506caab83db4372046dabf9c4b0c8f36b00fc574cfa80f412103f8bb5d511c4a2b17c87f5feb9ed388ff0447f09d12c8009661d57b4af8c9bf31feffffff03a0f70300000000003eef371701661f46bc7db03191a53b845e8140c4106389a205d238caa034cebed1e36204feed0100a914127183cef4d91bde0bb655f7a0092835319a23cf87e8030000000000003eef371701661f46bc7db03191a53b845e8140c4106389a205d238caa034cebed1e36002000076a914323d1f07684c83dff656501d1e7cde75b01a930e88aca86a0b00000000001976a914323d1f07684c83dff656501d1e7cde75b01a930e88acd7000000"
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
    sourceOutputs: {
      type: String,
      required: false,
      default: '[{"lockingBytecode":"<Uint8Array: 0xa914127183cef4d91bde0bb655f7a0092835319a23cf87>","valueSatoshis":"<bigint: 10000n>","outpointIndex":0,"outpointTransactionHash":"<Uint8Array: 0xb6006b95b2ab1797fa9ee80b8a1ead513e25caf7049d13b367acb00a371be94f>","token":{"category":"<Uint8Array: 0xe3d1bece34a0ca38d205a2896310c440815e843ba59131b07dbc461f66011737>","nft":{"capability":"minting","commitment":"<Uint8Array: 0xfeed0000>"}}},{"lockingBytecode":"<Uint8Array: 0x76a914323d1f07684c83dff656501d1e7cde75b01a930e88ac>","valueSatoshis":"<bigint: 1000000n>","outpointIndex":0,"outpointTransactionHash":"<Uint8Array: 0x8b9eb1130e1875349f814b49c0e455c25cb5d0dba2a4f44da692e6faa283a3b2>"}]',
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
      sourceOutputsUnpacked: [],
      signedTransaction: "",
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
      this.signedTransaction = this.assetId === "sbch" ?
        await this.signSmartBCH() :
        await this.signBCH()
      this.$q.bex.send('background.paytaca.signTransactionResponse', {signedTransaction: this.signedTransaction, eventResponseKey: this.eventResponseKey});
      this.sentResponse = true;
      window.close()
    },

    async signBCH () {
      const template = importAuthenticationTemplate(
        authenticationTemplateP2pkhNonHd
      );
      if (typeof template === "string") {
        throw new Error("Transaction template error");
      }

      const compiler = authenticationTemplateToCompilerBCH(template);

      const privateKeyWif = await this.wallet.BCH.getPrivateKey(`0/${this.lastAddressIndex}`);
      const decodeResult = decodePrivateKeyWif(privateKeyWif);
      const privateKey = decodeResult.privateKey;

      this.tx.inputs.forEach((val, index) => {
        const sourceOutput = this.sourceOutputsUnpacked[index];
        if (!val.unlockingBytecode && val.address === this.lastAddress) {
          val.unlockingBytecode = {
            compiler,
            data: {
              keys: { privateKeys: { key: privateKey } },
            },
            valueSatoshis: sourceOutput.valueSatoshis,
            script: "unlock",
            token: sourceOutput.token,
          }
        }
      });

      const generated = generateTransaction(this.tx);
      if (!generated.success) {
        throw Error(generated.errors);
      }

      const encoded = encodeTransaction(generated.transaction);
      return binToHex(encoded);
    },

    async signSmartBCH () {
      return this.wallet.sBCH._wallet.signMessage(this.message)
    },

    async cancel () {
      this.$q.bex.send('background.paytaca.signTransactionResponse', {signedTransaction: undefined, eventResponseKey: this.eventResponseKey})
      this.sentResponse = true
      window.close()
    },
  },

  async beforeMount () {

    const walletInfo = this.$store.getters['global/getWallet'](this.assetId)
    if (walletInfo) {
      console.log(walletInfo)
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
      // this.fetchedInputs = 
      console.log(this.wallet)
      console.log(await this.wallet.BCH.watchtower.BCH.getBchUtxos(`wallet:${this.wallet.BCH.walletHash}`))
      // this.ownUtxos = this.wallet.watchtower.BCH.getBchUtxos(`wallet:${this.wallet.walletHash}`)
      // console.log(ownUtxos)
    }

    // console.log(this.transaction, this.sourceOutputs)

    if (typeof this.transaction === "string") {
      try {
        // first try to interpret the transaction as hex string
        this.tx = {...this.tx, ...decodeTransaction(hexToBin(this.transaction))};
      } catch (hexError) {
        try {
          // then try to parse it as libauth json
          this.tx = {...this.tx, ...parseExtendedJson(this.transaction)};
        } catch (jsonError) {
          throw Error("Transaction is neither valid hex nor json");
        }
      }
    }

    if (typeof this.sourceOutputs === "string") {
      try {
        this.sourceOutputsUnpacked = parseExtendedJson(this.sourceOutputs);
      } catch {

      }
    }

    // debug placeholders
    this.tx.inputs.forEach(val => val.address = "bitcoincash:qqsxtesttesttesttesttesttest");
    this.tx.inputs.forEach(val => val.sighash = SigningSerializationAlgorithmIdentifier.allOutputs);
    this.tx.inputs.forEach(val => val.valueSatoshis = 0n);

    console.log(this.sourceOutputsUnpacked)
    this.sourceOutputsUnpacked.forEach((sourceOutput, index) => {
      const input = this.tx.inputs[index];
      input.valueSatoshis = sourceOutput.valueSatoshis;
      const cashaddr = lockingBytecodeToCashAddress(sourceOutput.lockingBytecode);
      if (typeof cashaddr !== "string") {
        throw cashaddr;
      }
      input.address = cashaddr;
      input.token = sourceOutput.token;
    });

    this.tx.outputs.forEach((output) => {
      output.address = lockingBytecodeToCashAddress(output.lockingBytecode);
    });
// console.log(binToHex(hash160(hexToBin("04f1535f231456b6b22042b90dd67bf2fbfb9aff7d37fbee1124520390d0035479009c6300ce827701219d5379547a9dc3529d00cd00c78800d100ce8800cc00c65279939d00cf527f7781768b537aa16900d202feed52798b52807e8800d3009d02e80351cc789d51cd51c78851d3009d51d101207f7500ce01207f758851d27b52808802200351c6537a947c947c94760222029f63c4529d6751c752cd788852cc52799dc4539d52d181009d75686d755167547a519d5479a9537a88547a547aadc3519d00ce8277009e6300cd00c78800d100ce8800cc02e8039d686d755168"))), binToHex(this.tx.outputs[0].lockingBytecode));
    // console.log(binToHex(this.tx.inputs[0].unlockingBytecode), this.tx.inputs[0].unlockingBytecode)
// console.log(decodeAuthenticationInstructions(hexToBin("004ce104f1535f231456b6b22042b90dd67bf2fbfb9aff7d37fbee1124520390d0035479009c6300ce827701219d5379547a9dc3529d00cd00c78800d100ce8800cc00c65279939d00cf527f7781768b537aa16900d202feed52798b52807e8800d3009d02e80351cc789d51cd51c78851d3009d51d101207f7500ce01207f758851d27b52808802200351c6537a947c947c94760222029f63c4529d6751c752cd788852cc52799dc4539d52d181009d75686d755167547a519d5479a9537a88547a547aadc3519d00ce8277009e6300cd00c78800d100ce8800cc02e8039d686d755168")))
const decoded = decodeAuthenticationInstructions(this.tx.inputs[0].unlockingBytecode);
const redeemScript = decoded.splice(-1)[0].data;
const hash = binToHex(hash160(redeemScript));
console.log(decodeAuthenticationInstructions(redeemScript));
// console.log(decoded, artifactMap[hash], hash, binToHex(redeemScript), binToHex(this.tx.inputs[0].unlockingBytecode));
const artifact = artifactMap[hash];
let abiFunction;
if (artifact.abi.length > 1) {
  // expect to N abi parameters + 1 function index push
  const abiFunctionIndex = Number(vmNumberToBigInt(decoded.splice(-1)[0].data));
  abiFunction = artifact.abi[abiFunctionIndex];
} else {
  abiFunction = artifact[0];
}
console.log(abiFunction.name);
  },
}
</script>

<style lang="scss">
  // p {
  //   margin: 0;
  // }

  .m-0 {
    margin: 0
  }

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

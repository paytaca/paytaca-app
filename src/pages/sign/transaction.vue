<template>
  <div id="app-container" class="" :class="{'pt-dark': darkMode}">
    <header-nav
      backnavpath="/"
      :title="$t('Sign Transaction')"
    ></header-nav>
    <div class="">
      <div class="q-pa-md" style="padding-top: 40px;">
        <div class="col-12 q-mt-lg items-center">
          <p class="text-lg">Signer:</p><textarea readonly class="ro-text" v-text="connectedAddress"></textarea>
          <p class="text-lg">Origin:</p><textarea readonly class="ro-text" v-text="origin"></textarea>
          <p class="text-lg">Inputs:</p>
          <div v-for="(input,idx) of tx.inputs">
            <span class="font-normal">{{`#${idx}:`}}</span>
            {{`${satoshiToBCHString(input.valueSatoshis)} (${binToHex(input.outpointTransactionHash).slice(0,4)}...${binToHex(input.outpointTransactionHash).slice(-4)}:${input.outpointIndex} ${sighashText(input.sighash)}) ${input.address?.split("bitcoincash:")[1]}` }}
            <span v-if="input.token">
              <br/>
              <hr/>
              Token: <span :style="{'background-color': `#${binToHex(input.token.category.slice(0, 3))}`}">{{ binToHex(input.token.category.slice(0, 3)) }} <br/></span>
              <span v-if="input.token.nft.commitment.length"> Commitment: {{ binToHex(input.token.nft.commitment) }} <br/></span>
              <span v-if="input.token.nft.capability"> Capability: {{ input.token.nft.capability }} <br/></span>
              <span v-if="input.token.amount > 0n"> Fungible amount: {{ input.token.amount }} <br/></span>
            </span>
            <span v-if="input.contractName">
              <hr/>
              Contract: {{ input.contractName }} <br/>
              Function: {{ input.functionName }} <br/>
            </span>
            <p/>
          </div>
          <p class="text-lg">Outputs:</p>
          <div v-for="(output,idx) of tx.outputs"> 
            <span class="font-normal">{{`#${idx}:`}}</span>
            {{`${satoshiToBCHString(output.valueSatoshis)} ${output.address?.split("bitcoincash:")[1]}` }}
            <span v-if="output.token">
              <br/>
              <hr/>
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
import { getMnemonic, Wallet } from '../../wallet'
import HeaderNav from '../../components/header-nav'
import { authenticationTemplateP2pkhNonHd, importAuthenticationTemplate, decodeAuthenticationInstructions, authenticationTemplateToCompilerBCH, generateTransaction, hash160, hexToBin, decodePrivateKeyWif, SigningSerializationAlgorithmIdentifier, decodeTransaction, binToHex, lockingBytecodeToCashAddress, encodeTransaction, vmNumberToBigInt } from "@bitauth/libauth"

// contract lookup map, allows to figure out the contract name and function name
const artifactMap = {"127183cef4d91bde0bb655f7a0092835319a23cf": {
  contractName: "MintingCovenant",
  constructorInputs: [
    {
      name: "mintCost",
      type: "int"
    },
    {
      name: "maxAmount",
      type: "int"
    },
    {
      name: "owner",
      type: "bytes20"
    },
    {
      name: "nonce",
      type: "int"
    }
  ],
  abi: [
    {
      name: "mint",
      inputs: []
    },
    {
      name: "withdraw",
      inputs: [
        {
          name: "pk",
          type: "pubkey"
        },
        {
          name: "s",
          type: "sig"
        }
      ]
    }
  ],
  bytecode: "OP_4 OP_PICK OP_0 OP_NUMEQUAL OP_IF OP_0 OP_UTXOTOKENCATEGORY OP_SIZE OP_NIP 21 OP_NUMEQUALVERIFY OP_3 OP_PICK OP_4 OP_ROLL OP_NUMEQUALVERIFY OP_TXINPUTCOUNT OP_2 OP_NUMEQUALVERIFY OP_0 OP_OUTPUTBYTECODE OP_0 OP_UTXOBYTECODE OP_EQUALVERIFY OP_0 OP_OUTPUTTOKENCATEGORY OP_0 OP_UTXOTOKENCATEGORY OP_EQUALVERIFY OP_0 OP_OUTPUTVALUE OP_0 OP_UTXOVALUE OP_2 OP_PICK OP_ADD OP_NUMEQUALVERIFY OP_0 OP_UTXOTOKENCOMMITMENT OP_2 OP_SPLIT OP_NIP OP_BIN2NUM OP_DUP OP_1ADD OP_3 OP_ROLL OP_LESSTHANOREQUAL OP_VERIFY OP_0 OP_OUTPUTTOKENCOMMITMENT feed OP_2 OP_PICK OP_1ADD OP_2 OP_NUM2BIN OP_CAT OP_EQUALVERIFY OP_0 OP_OUTPUTTOKENAMOUNT OP_0 OP_NUMEQUALVERIFY e803 OP_1 OP_OUTPUTVALUE OP_OVER OP_NUMEQUALVERIFY OP_1 OP_OUTPUTBYTECODE OP_1 OP_UTXOBYTECODE OP_EQUALVERIFY OP_1 OP_OUTPUTTOKENAMOUNT OP_0 OP_NUMEQUALVERIFY OP_1 OP_OUTPUTTOKENCATEGORY 20 OP_SPLIT OP_DROP OP_0 OP_UTXOTOKENCATEGORY 20 OP_SPLIT OP_DROP OP_EQUALVERIFY OP_1 OP_OUTPUTTOKENCOMMITMENT OP_ROT OP_2 OP_NUM2BIN OP_EQUALVERIFY 2003 OP_1 OP_UTXOVALUE OP_3 OP_ROLL OP_SUB OP_SWAP OP_SUB OP_SWAP OP_SUB OP_DUP 2202 OP_LESSTHAN OP_IF OP_TXOUTPUTCOUNT OP_2 OP_NUMEQUALVERIFY OP_ELSE OP_1 OP_UTXOBYTECODE OP_2 OP_OUTPUTBYTECODE OP_OVER OP_EQUALVERIFY OP_2 OP_OUTPUTVALUE OP_2 OP_PICK OP_NUMEQUALVERIFY OP_TXOUTPUTCOUNT OP_3 OP_NUMEQUALVERIFY OP_2 OP_OUTPUTTOKENCATEGORY OP_BIN2NUM OP_0 OP_NUMEQUALVERIFY OP_DROP OP_ENDIF OP_2DROP OP_DROP OP_1 OP_ELSE OP_4 OP_ROLL OP_1 OP_NUMEQUALVERIFY OP_4 OP_PICK OP_HASH160 OP_3 OP_ROLL OP_EQUALVERIFY OP_4 OP_ROLL OP_4 OP_ROLL OP_CHECKSIGVERIFY OP_TXINPUTCOUNT OP_1 OP_NUMEQUALVERIFY OP_0 OP_UTXOTOKENCATEGORY OP_SIZE OP_NIP OP_0 OP_NUMNOTEQUAL OP_IF OP_0 OP_OUTPUTBYTECODE OP_0 OP_UTXOBYTECODE OP_EQUALVERIFY OP_0 OP_OUTPUTTOKENCATEGORY OP_0 OP_UTXOTOKENCATEGORY OP_EQUALVERIFY OP_0 OP_OUTPUTVALUE e803 OP_NUMEQUALVERIFY OP_ENDIF OP_2DROP OP_DROP OP_1 OP_ENDIF",
  source: "\n  contract MintingCovenant(int mintCost, int maxAmount, bytes20 owner, int nonce) {\n    function mint() {\n      require(tx.inputs[0].tokenCategory.length == 33);\n      // remove nonce after debug?\n      require(nonce == nonce);\n\n      // require(mintCost == mintCost);\n      // require(owner == owner);\n      // require(maxAmount == maxAmount);\n\n      // allow only 2 inputs\n      require(tx.inputs.length == 2);\n\n      // require the covenant contract always lives at index zero with a minting NFT\n      require(tx.outputs[0].lockingBytecode == tx.inputs[0].lockingBytecode);\n      require(tx.outputs[0].tokenCategory == tx.inputs[0].tokenCategory);\n\n      // require minting cost is payed to covenant\n      require(tx.outputs[0].value == tx.inputs[0].value + mintCost);\n\n      // get minted amount and validate it does not exceed max amount\n      int currentAmount = int(tx.inputs[0].nftCommitment.split(2)[1]);\n      require(currentAmount + 1 <= maxAmount);\n\n      // require new currentAmount is updated by one on the covenant, ft amount 0\n      require(tx.outputs[0].nftCommitment == 0xfeed + bytes2(currentAmount + 1));\n      require(tx.outputs[0].tokenAmount == 0);\n\n      // Check that the first output sends to the recipient a token of the same category, ft 0, commitment is as current minted amount\n      int tokenValue = 1000;\n      require(tx.outputs[1].value == tokenValue);\n      require(tx.outputs[1].lockingBytecode == tx.inputs[1].lockingBytecode);\n      require(tx.outputs[1].tokenAmount == 0);\n      require(tx.outputs[1].tokenCategory.split(32)[0] == tx.inputs[0].tokenCategory.split(32)[0]);\n      require(tx.outputs[1].nftCommitment == bytes2(currentAmount));\n\n      // Calculate the value that's left\n      int minerFee = 800;\n      int sentValue = tx.inputs[1].value;\n      int changeValue = sentValue - mintCost - minerFee - tokenValue;\n\n      // handle change\n      if (changeValue < 546) {\n        // discard change\n        require(tx.outputs.length == 2);\n      } else {\n        bytes changeBytecode = tx.inputs[1].lockingBytecode;\n        require(tx.outputs[2].lockingBytecode == changeBytecode);\n        require(tx.outputs[2].value == changeValue);\n        require(tx.outputs.length == 3);\n\n        // Require that the change output does not mint any NFTs\n        require(int(tx.outputs[2].tokenCategory) == 0);\n      }\n    }\n\n    function withdraw(pubkey pk, sig s) {\n      require(hash160(pk) == owner);\n      require(checkSig(s, pk));\n\n      require(tx.inputs.length == 1);\n\n      // if (tx.inputs[0].tokenCategory != bytes(0)) {\n      if (tx.inputs[0].tokenCategory.length != 0) {\n        // require covenant will not be closed\n        require(tx.outputs[0].lockingBytecode == tx.inputs[0].lockingBytecode);\n        // require token will not be burned\n        require(tx.outputs[0].tokenCategory == tx.inputs[0].tokenCategory);\n        require(tx.outputs[0].value == 1000);\n      }\n\n      // polluting non-covenant (with no minting NFT) p2sh outputs can be safely spent\n    }\n  }\n  ",
  compiler: {
    name: "cashc",
    version: "0.8.0-next.2"
  },
  updatedAt: "2023-04-09T18:30:58.714Z",
  bytecodeHex: "04f1535f231456b6b22042b90dd67bf2fbfb9aff7d37fbee1124520390d0035479009c6300ce827701219d5379547a9dc3529d00cd00c78800d100ce8800cc00c65279939d00cf527f7781768b537aa16900d202feed52798b52807e8800d3009d02e80351cc789d51cd51c78851d3009d51d101207f7500ce01207f758851d27b52808802200351c6537a947c947c94760222029f63c4529d6751c752cd788852cc52799dc4539d52d181009d75686d755167547a519d5479a9537a88547a547aadc3519d00ce8277009e6300cd00c78800d100ce8800cc02e8039d686d755168"
}}

// an extended json parser compatible with `stringify` from libauth
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
      // debug
      default: "02000000024fe91b370ab0ac67b3139d04f7ca253e51ad1e8a0be89efa9717abb2956b00b600000000e4004ce104f1535f231456b6b22042b90dd67bf2fbfb9aff7d37fbee1124520390d0035479009c6300ce827701219d5379547a9dc3529d00cd00c78800d100ce8800cc00c65279939d00cf527f7781768b537aa16900d202feed52798b52807e8800d3009d02e80351cc789d51cd51c78851d3009d51d101207f7500ce01207f758851d27b52808802200351c6537a947c947c94760222029f63c4529d6751c752cd788852cc52799dc4539d52d181009d75686d755167547a519d5479a9537a88547a547aadc3519d00ce8277009e6300cd00c78800d100ce8800cc02e8039d686d755168feffffffb2a383a2fae692a64df4a4a2dbd0b55cc255e4c0494b819f3475180e13b19e8b000000006441caa799abe82994546dd9f084dd8d909552e4b3afb7c16ee03bee3962bd93b1af743b83bc86d9d98220506caab83db4372046dabf9c4b0c8f36b00fc574cfa80f412103f8bb5d511c4a2b17c87f5feb9ed388ff0447f09d12c8009661d57b4af8c9bf31feffffff03a0f70300000000003eef371701661f46bc7db03191a53b845e8140c4106389a205d238caa034cebed1e36204feed0100a914127183cef4d91bde0bb655f7a0092835319a23cf87e8030000000000003eef371701661f46bc7db03191a53b845e8140c4106389a205d238caa034cebed1e36002000076a914323d1f07684c83dff656501d1e7cde75b01a930e88aca86a0b00000000001976a914323d1f07684c83dff656501d1e7cde75b01a930e88acd7000000"
    },
    sourceOutputs: {
      type: String,
      required: false,
      // debug
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

      darkMode: this.$store.getters['darkmode/getStatus'],
      connectedAddress: '',
      connectedAddressIndex: '0/0',
      fetchedInputs: [],
      tx: {},
      sourceOutputsUnpacked: [],
      signedTransaction: "",
      contractName: "",
      functionName: "",
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
      window.close()
    },

    async signBCH () {
      // prepare libauth template for input signing
      const template = importAuthenticationTemplate(
        authenticationTemplateP2pkhNonHd
      );
      if (typeof template === "string") {
        throw new Error("Transaction template error");
      }

      // configure compiler
      const compiler = authenticationTemplateToCompilerBCH(template);

      const mnemonic = await getMnemonic()
      const network = {bch: "BCH", slp: "BCH", sbch: "sBCH"}[this.assetId]
      const wallet = new Wallet(mnemonic, network)

      // decode private key for current signer
      const privateKeyWif = await wallet.BCH.getPrivateKey(this.connectedAddressIndex);
      const decodeResult = decodePrivateKeyWif(privateKeyWif);
      const privateKey = decodeResult.privateKey;

      // instruct compiler to produce signatures for relevant inputs
      this.tx.inputs.forEach((val, index) => {
        const sourceOutput = this.sourceOutputsUnpacked[index];
        if (!val.unlockingBytecode?.length && val.address === this.connectedAddress) {
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

      // generate and encode transaction
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
      window.close()
    },
  },

  async beforeMount () {
    // use the currently selected address as signer
    this.connectedAddress = localStorage.getItem("selectedAddress");
    this.connectedAddressIndex = localStorage.getItem("selectedAddressIndex");

    // decode the transaction, either a hex string or a json string
    if (typeof this.transaction === "string") {
      try {
        // first try to interpret the transaction as hex string
        const decoded = decodeTransaction(hexToBin(this.transaction));
        if (typeof decoded === "string") {
          throw decoded;
        }
        this.tx = {...this.tx, ...decoded};
      } catch (hexError) {
        try {
          // then try to parse it as libauth json
          this.tx = {...this.tx, ...parseExtendedJson(this.transaction)};
        } catch (jsonError) {
          throw Error("Transaction is neither valid hex nor json");
        }
      }
    }

    // decode sourceOutputs (extended info about inputs to be spent)
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

    // let's figure out the satoshi value and token information for the inputs
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

    this.tx.inputs.forEach(input => {
      // let us look at the inputs
      const decoded = decodeAuthenticationInstructions(input.unlockingBytecode);
      const redeemScript = decoded.splice(-1)[0]?.data;
      if (redeemScript?.length > 33) {
        // if input is a contract interaction, let's lookup the contract map and update UI
        const hash = binToHex(hash160(redeemScript));
        const artifact = artifactMap[hash];
        let abiFunction;
        if (artifact.abi.length > 1) {
          // expect to N abi parameters + 1 function index push
          const abiFunctionIndex = Number(vmNumberToBigInt(decoded.splice(-1)[0].data));
          abiFunction = artifact.abi[abiFunctionIndex];
        } else {
          abiFunction = artifact[0];
        }
        input.contractName = artifact.contractName;
        input.functionName = abiFunction.name;
      }
    });
  },
}
</script>

<style lang="scss">
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

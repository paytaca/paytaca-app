import axios from "axios";
import { addressToPkHash, pubkeyToAddress, toTokenAddress, wifToPubkey } from "src/utils/crypto";
import { buildPoolV0UnlockingBytecode, ExchangeLab } from "@cashlab/cauldron";
import { Contract, ElectrumNetworkProvider, SignatureTemplate, TransactionBuilder } from "cashscript";
import { getOutputSize } from "cashscript/dist/utils";
import { hexToBin } from "bitauth-libauth-v3";
import { binToHex } from "@bitauth/libauth";
import { cauldronManageArtifactWithPkh } from "./utils";
import { calculateInputSize } from "src/utils/cashscript-utils";


/**
 * @param {String} address 
 * @param {String} [tokenId]
 * @returns {Promise<import("./pool").MicroPool[]>}
 */
export async function fetchWalletPools(address, tokenId) {
  const pkhash = addressToPkHash(address)
  const params = { pkh: pkhash }
  if (tokenId) params.token = tokenId
  const path = 'cauldron/pool/active'
  const response = await axios.get('https://indexer2.cauldron.quest/' + path, { params })
  const activePools = response.data?.active
  if (!Array.isArray(activePools)) return Promise.reject({ response })
  
  return activePools.map(pool => {
    return {
      pkh: pool.owner_pkh,
      is_withdrawn: false,
      spent_utxo_hash: '',
      new_utxo_hash: pool.txid,
      new_utxo_txid: pool.txid,
      new_utxo_n: pool.tx_pos,
      token_id: pool.token_id,
      sats: pool.sats,
      token_amount: pool.tokens,
    }
  })
}



/**
 * @param {Object} opts 
 * @param {String} opts.tokenId
 * @param {BigInt} opts.tokens
 * @param {BigInt} opts.satoshis
 * @param {String} opts.ownerAddress
 * @param {import("./pool").MicroPool} [opts.existingPool]
 * @param {import('@cashlab/common').SpendableCoin[]} opts.spendableCoins
 */
export function createPoolTransaction(opts) {
  const exlab = new ExchangeLab()
  const ownerPkHash = addressToPkHash(opts.ownerAddress)
  const poolV0Parameters = { withdraw_pubkey_hash: hexToBin(ownerPkHash) }
  const lockingBytecode = exlab.generatePoolV0LockingBytecode(poolV0Parameters)
  const provider = new ElectrumNetworkProvider('mainnet')

  const balancer = { inputSats: 0n, outputSats: 0n, txSize: 10n }
  const builder = new TransactionBuilder({ provider })
  
  const poolOutput = {
    to: lockingBytecode,
    amount: opts?.satoshis,
    token: { category: opts?.tokenId, amount: opts?.tokens }
  }
  if(opts?.existingPool) {
    const existingPool = opts?.existingPool
    const unlockingBytecode = buildPoolV0UnlockingBytecode(poolV0Parameters)
    const unlocker = {
      generateLockingBytecode: () => lockingBytecode,
      generateUnlockingBytecode: () => unlockingBytecode,
    }

    builder.addInput({
      txid: existingPool.new_utxo_txid,
      vout: existingPool.new_utxo_n,
      satoshis: BigInt(existingPool.sats),
      token: {
        category: existingPool.token_id,
        amount: BigInt(existingPool.token_amount),
      }
    }, unlocker)
    balancer.inputSats += BigInt(existingPool.sats)
    balancer.txSize += 41n + BigInt(unlockingBytecode.byteLength);

    poolOutput.amount += BigInt(existingPool.sats)
    poolOutput.token.amount += BigInt(existingPool.token_amount)
  }

  balancer.outputSats += poolOutput.amount
  balancer.txSize += BigInt(getOutputSize(poolOutput))
  builder.addOutput(poolOutput)

  const opReturnOutput = constructPoolCreationOpReturn(ownerPkHash)
  balancer.txSize += BigInt(getOutputSize(opReturnOutput))
  builder.addOutput(opReturnOutput)

  const tokenCoins = opts.spendableCoins.filter(coin => {
    return coin?.output?.token?.token_id === opts?.tokenId
  })
  const bchCoins = opts.spendableCoins.filter(coin => !coin.output?.token?.token_id)

  let tokensToFund = opts?.tokens
  for(const tokenCoin of tokenCoins) {
    if (tokensToFund <= 0n) break
    
    const template = new SignatureTemplate(tokenCoin.key)
    builder.addInput({
      txid: binToHex(tokenCoin.outpoint.txhash),
      vout: tokenCoin.outpoint.index,
      satoshis: tokenCoin.output.amount,
      token: {
        category: tokenCoin.output.token.token_id,
        amount: tokenCoin.output.token.amount,
      }
    }, template.unlockP2PKH())
    balancer.inputSats += tokenCoin.output.amount
    balancer.txSize += 141n
    tokensToFund -= tokenCoin.output.token.amount
  }

  if (tokensToFund < 0n) {
    const tokenChangeOutput = {
      to: toTokenAddress(opts?.ownerAddress),
      amount: 800n,
      token: {
        category: opts?.tokenId,
        amount: tokensToFund * -1n,
      }
    }
    balancer.outputSats += tokenChangeOutput.amount
    balancer.txSize += BigInt(getOutputSize(tokenChangeOutput))
    builder.addOutput(tokenChangeOutput)
  }
  
  const satsDiff = () => balancer.inputSats - balancer.outputSats - balancer.txSize
  for(const bchCoin of bchCoins) {
    if (satsDiff() >= 0n) break
    const template = new SignatureTemplate(bchCoin.key)
    builder.addInput({
      txid: binToHex(bchCoin.outpoint.txhash),
      vout: bchCoin.outpoint.index,
      satoshis: bchCoin.output.amount,
    }, template.unlockP2PKH())
    balancer.inputSats += bchCoin.output.amount
    balancer.txSize += 141n
  }

  if (satsDiff() >= 546n + 34n) {
    const changeOutput = {
      to: opts?.ownerAddress,
      amount: satsDiff() - 34n,
    }
    builder.addOutput(changeOutput)
    balancer.outputSats += changeOutput.amount
    balancer.txSize += 34n
  }

  return builder.build()
}

function constructPoolCreationOpReturn(pkhash) {
  // 'SUMMON' text converted from utf8 to hex, 06 is byte length prefix
  const op_prefix = '0653554d4d4f4e'
  const opReturnData = '6a' + op_prefix + '14' + pkhash
  return { to: hexToBin(opReturnData), amount: 0n }
}

/**
 * 
 * @param {import("./pool").MicroPool} pool 
 * @param {String} wif 
 */
export function generateWithdrawPoolTx(pool, wif) {
  const template = new SignatureTemplate(wif)
  const provider = new ElectrumNetworkProvider('mainnet')
  

  const artifact = cauldronManageArtifactWithPkh(pool.pkh)
  const contract = new Contract(artifact, [], { provider, addressType: 'p2sh32'})
  const inputSize = calculateInputSize(contract.functions.managePool(template.getPublicKey(), template))

  const builder = new TransactionBuilder({ provider })
  builder.addInput({
    txid: pool.new_utxo_txid,
    vout: pool.new_utxo_n,
    satoshis: BigInt(pool.sats),
    token: { category: pool.token_id, amount: BigInt(pool.token_amount) }
  }, contract.unlock.managePool(template.getPublicKey(), template))

  const address = pubkeyToAddress(wifToPubkey(wif))
  const tokenAddress = toTokenAddress(address)
  const tokenOutput = {
    to: tokenAddress,
    amount: 1000n,
    token: { category: pool.token_id, amount: BigInt(pool.token_amount) },
  }
  builder.addOutput(tokenOutput)

  const txSize = 10 + inputSize + 34 + getOutputSize(tokenOutput);
  builder.addOutput({
    to: address,
    amount: BigInt(pool.sats - txSize) - 1000n,
  })

  return builder.build()
}
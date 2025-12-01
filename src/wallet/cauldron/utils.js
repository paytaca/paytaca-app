import { ExchangeLab } from '@cashlab/cauldron';
import { SpendableCoinType } from '@cashlab/common';
import { privateKeyToP2pkhLockingBytecode } from '@cashlab/common/libauth.js';
import { decodePrivateKeyWif, hexToBin } from '@bitauth/libauth';
import { i18n } from 'src/boot/i18n';
import cauldronManagePoolArtifact from './artifacts/manage_artifact.json'

const { t: $t } = i18n.global

const exlab = new ExchangeLab();

// https://github.com/mr-zwets/Cauldron_Swap_Test/blob/main/src/utils.ts#L10
export function cauldronManageArtifactWithPkh(pkhHex, ){
  const cauldronArtifact = cauldronManagePoolArtifact;
  const strigifiedCauldronArtifact = JSON.stringify(cauldronArtifact);
  const constructedArtifact = JSON.parse(strigifiedCauldronArtifact.replace('<withdraw_pkh>', pkhHex))
  // different contracts should have unique names
  constructedArtifact.contractName = `CauldronManagePool ${pkhHex}`;
  return constructedArtifact
}


/**
 * @param {import('./pool').MicroPool} pool
 */
export function microPoolToPoolV0(pool) {
 const pool0_params = { withdraw_pubkey_hash: hexToBin(pool.pkh) };  
 const pool0_locking_bytecode = exlab.generatePoolV0LockingBytecode(pool0_params)
 return {
    version: '0',
    parameters: pool0_params,
    outpoint: { index: pool.new_utxo_n, txhash: hexToBin(pool.new_utxo_txid) },
    output: {
      locking_bytecode: pool0_locking_bytecode,
      token: {
        amount: BigInt(pool.token_amount),
        token_id: pool.token_id,
      },
      amount: BigInt(pool.sats),
    }
  }
}


/**
 * @param {Object} opts
 * @param {import('src/utils/utxo-utils').WatchtowerUtxo[]} opts.utxos
 * @param {import("src/wallet/bch-libauth").LibauthHDWallet} opts.wallet
 * @returns {import('@cashlab/common').SpendableCoin[]}
 */
export function watchtowerUtxosToSpendableCoins(opts) {
  const { utxos, wallet } = opts

  const _addressPathPrivkeyMap = new Map();
  return utxos.map(utxo => {
    let privateKey;
    if (_addressPathPrivkeyMap.has(utxo.address_path)) {
      privateKey = _addressPathPrivkeyMap.get(utxo.address_path)
    } else {
      const wif = wallet.getPrivateKeyWifAt(utxo.address_path)
      const decodedWif = decodePrivateKeyWif(wif)
      if (typeof decodedWif === 'string') throw new Error(decodedWif)
      privateKey = decodedWif.privateKey;
    }

    return {
      type: SpendableCoinType.P2PKH,
      key: privateKey,
      outpoint: { txhash: hexToBin(utxo.txid), index: utxo.vout },
      output: {
        locking_bytecode: privateKeyToP2pkhLockingBytecode({ privateKey, throwErrors: true  }),
        amount: BigInt(utxo.value),
        token: !utxo?.is_cashtoken ? undefined : {
          token_id: utxo.tokenid,
          amount: BigInt(utxo.amount),
        }
      },
    }
  })
}

export function parseCauldronSwapAttribute(value='') {
  const jsonValue = JSON.parse(value)
  const tradeType = jsonValue?.tradeType
  const unitsSold = jsonValue?.unitsSold
  const unitsBought = jsonValue?.unitsBought
  const tokenData = jsonValue?.tokenData
  return { tradeType, unitsSold, unitsBought, tokenData }
}

export function formatCauldronSwapAttribute(value) {
  const { tradeType, unitsSold, unitsBought, tokenData } = parseCauldronSwapAttribute(value)

  if (tradeType === 'token-buy') {
    const _unitsBought = Number(unitsBought) / 10 ** (tokenData?.decimals || 0)
    return $t(
      'BoughtAmount',
      { amount: _unitsBought, symbol: tokenData?.symbol },
      `Bought ${_unitsBought} ${tokenData?.symbol}`
    )
  } else {
    const _unitsSold = Number(unitsSold) / 10 ** (tokenData?.decimals || 0)
    return $t(
      'SoldAmount',
      { amount: _unitsSold, symbol: tokenData?.symbol },
      `Sold ${_unitsSold} ${tokenData?.symbol}`
    )
  }
}

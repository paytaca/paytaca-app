import BCHJS from '@psf/bch-js'
import { utils, BigNumber } from 'ethers'
import { getProvider } from './sbch/utils'

const bchjs = new BCHJS()
const provider = getProvider(false)

const bchBridge = 'bitcoincash:qqa0dj5rwaw2s4tz88m3xmcpjyzry356gglq7zvu80'
const sbchBridge = '0x3207d65b4D45CF617253467625AF6C1b687F720b'

function toBigNumber(value) {
  return BigNumber.from('0x' + BigInt(value).toString(16)) 
}


export async function bchBridgeBalance() {
  const response = await bchjs.Electrumx.balance(bchBridge);
  if (response.success) {
    return {
      success: true,
      balance: toBigNumber(response.balance.confirmed),
    }
  }
  return {
    success: false,
    error: response,
  }
}

export async function sbchBridgeBalance() {
  const balance = await provider.getBalance(sbchBridge)
  return {
    success: true,
    balance: balance,
  }
}

/**
 * Sends a c2s,incoming type transaction
 * @param {number} amount in BCH 
 * @param {string} recipientAddress address of sbch wallet
 * @param {string} changeAddress bch address 
 * @returns 
 */
export async function c2s(wallet, amount, recipientAddress, changeAddress) {
  if (wallet && wallet._testnet) {
    return {
      success: false,
      error: 'Wallet used is in testnet.',
    }
  }
  if (!utils.isAddress(recipientAddress)) {
    return {
      success: false,
      error: 'Recipient address must be a valid SmartBCH address',
    }
  }

  const OP_RETURN = '6a', PUSH = '4c'
  const data = Buffer.from(recipientAddress, 'utf8').toString('hex');
  const dataLength = data.length.toString(16)
  const opReturnBuffer = Buffer.from(
    OP_RETURN + PUSH + dataLength + data,
    'hex',
  )

  const recipients = [
    { address: opReturnBuffer, amount: 0 },
    { address: bchBridge, amount: amount },
  ]

  return wallet.BCH.sendBchMultiple(recipients, changeAddress)
}

/**
 * Sends a c2s,incoming type transaction
 * @param {Wallet} amount in sBCH 
 * @param {number} amount in sBCH 
 * @param {string} recipientAddress address of bch wallet
 * @returns 
 */
export async function s2c(wallet, amount, recipientAddress) {
  if (wallet && wallet._testnet) {
    return {
      success: false,
      error: 'Wallet used is in testnet.',
    }
  }

  if (!bchjs.Address.isCashAddress(recipientAddress) && !bchjs.Address.isLegacyAddress(recipientAddress)) {
    return {
      success: false,
      error: 'Recipient address must be a valid cash/legacy address',
    }
  }

  return wallet.sBCH.sendBchWithData(
    amount,
    sbchBridge,
    '0x' + Buffer.from(bchjs.Address.toLegacyAddress(recipientAddress), 'utf8').toString('hex')
  )
}

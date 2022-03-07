import { ethers } from 'ethers'
import { getProvider } from '../sbch/utils'

export const provider = getProvider(false)

/*
  when performing an exchange, the user/wallet sends bch to the 'receiver' address; then
  wait or watch for transactions sent by the 'sender' address.
    - The amount to exchange must not exceed the 'sender' address' balance.
*/
export const addresses = {
  cash2smart: {
    receiver: 'bitcoincash:qqa0dj5rwaw2s4tz88m3xmcpjyzry356gglq7zvu80',
    sender: '0xa659c0434399a8D0e15b8286b39f8d97830F8F91',
  },

  smart2cash: {
    receiver: '0x3207d65b4D45CF617253467625AF6C1b687F720b',
    sender: 'bitcoincash:qzteyuny2hdvvcd4tu6dktwx9f04jarzkyt57qel0y',
  },

  sbchContractAddress: '0xBAe8Af26E08D3332C7163462538B82F0CBe45f2a',
}

export const bridgeContract = new ethers.Contract(
  addresses.sbchContractAddress,
  [
    'event Bridged(bytes32 indexed sourceTransaction, address indexed liquidityProviderAddress, address indexed outputAddress, uint256 outputAmount);',
  ],
  provider,
)

import { BLOCK_TIME_SEC } from './constants.js'
import { ElectrumNetworkProvider } from 'cashscript'

export async function getBlockHeight() {
  const provider = new ElectrumNetworkProvider('mainnet')
  const blockHeight = await provider.getBlockHeight()
  console.log('blockHeight:', blockHeight)
  return blockHeight
}

export async function convertTimeToBlock(timestamp) {
  const currentTime = Math.floor(Date.now() / 1000)
  const blocksAhead = Math.floor((timestamp - currentTime) / BLOCK_TIME_SEC)
  const currentBlockHeight = await getBlockHeight()
  const estimatedBlockHeight = currentBlockHeight + blocksAhead
  console.log('estimatedBlockHeight:', estimatedBlockHeight)
  return estimatedBlockHeight
}
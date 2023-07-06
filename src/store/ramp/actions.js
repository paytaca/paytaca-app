import { axiosInstance } from '../../boot/axios'

export async function fetchPeerProfile (context, walletHash) {
  const apiURL = process.env.WATCHTOWER_BASE_URL + '/ramp-p2p/peer'
  const headers = {
    'wallet-hash': walletHash
  }
  const { data: peerProfile } = await axiosInstance.get(apiURL, { headers: headers })
  if (peerProfile) {
    context.commit('updatePeerProfile', { peerProfile })
    return peerProfile
  }
  return null
}

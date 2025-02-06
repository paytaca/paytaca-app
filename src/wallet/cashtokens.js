import axios from "axios"
import { getBlockChainNetwork } from './chipnet'
import { setupCache } from 'axios-cache-interceptor'


function getBcmrBackend() {
  const network = getBlockChainNetwork()
  if (network === 'chipnet') {
    return setupCache(axios.create({
      baseURL: 'https://bcmr-chipnet.paytaca.com/api',
    }))
  } else {
    return setupCache(axios.create({
      baseURL: 'https://bcmr.paytaca.com/api',
    }))
  }
}


export const IPFS_DOMAINS = [
  'https://ipfs.paytaca.com/ipfs/',
  'https://nftstorage.link/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
]
export function convertIpfsUrl(url='', baseURL='https://ipfs.paytaca.com/ipfs/') {
  if (typeof url !== 'string') return url
  if (!url.startsWith('ipfs://')) return url
  return url.replace('ipfs://', baseURL)
}

export class CashNonFungibleToken {
  static parse(...args) {
    return new CashNonFungibleToken(...args)    
  }

  constructor (data) {
    this.$state = {
      metadataInitialized: false,
      fetchingMetadata: false,
    }
    this.updateData(data)
    this.ipfsBaseUrl = IPFS_DOMAINS[0]
  }

  toIpfsUrl(url) {
    return convertIpfsUrl(url, this.ipfsBaseUrl)
  }

  changeIpfsBaseUrl() {
    const index = IPFS_DOMAINS.indexOf(this.ipfsBaseUrl)
    const newIndex = (index + 1) % IPFS_DOMAINS.length
    this.ipfsBaseUrl = IPFS_DOMAINS[newIndex]
    return this.ipfsBaseUrl
  }

  get imageUrl() {
    const imageUrl = this.toIpfsUrl(this.metadata?.type_metadata?.uris?.icon)
    if (imageUrl) return imageUrl
    return this.toIpfsUrl(this.metadata?.type_metadata?.uris?.icon)
  }

  get parsedGroupMetadata() {
    return {
      name: this.metadata?.name,
      description: this.metadata?.description,
      symbol: this.metadata?.symbol,
      imageUrl: this.imageUrl
    }
  }

  get parsedNftMetadata() {
    let data = this.metadata
    if (data) {
      if (data.type_metadata) {
        data = this.metadata?.type_metadata
        return {
          name: data?.name || this?.parsedGroupMetadata?.name,
          description: data?.description || this?.parsedGroupMetadata?.name,
          imageUrl: this.imageUrl,
          imageUrlFull: this.toIpfsUrl(data?.uris?.image),
          attributes: data?.extensions?.attributes
        }
      } else {
        return {
          name: data?.name || this?.parsedGroupMetadata?.name,
          description: data?.description || this?.parsedGroupMetadata?.name,
          imageUrl: this.imageUrl,
        }
      }
    }
  }

  get parsedMetadata() {
    if (!this.$state.metadataInitialized) return

    return {
      name: this.parsedNftMetadata?.name || this.parsedGroupMetadata?.name,
      description: this.parsedNftMetadata?.description || this.parsedGroupMetadata?.description,
      symbol: this.parsedGroupMetadata?.symbol,
      imageUrl: this.parsedNftMetadata?.imageUrl || this.parsedGroupMetadata?.imageUrl || this.metadata?.uris?.icon,
      imageUrlFull: this.parsedNftMetadata?.imageUrlFull || this.parsedGroupMetadata?.imageUrl || this.metadata?.uris?.icon,
      attributes: this.parsedNftMetadata?.attributes,
    }
  }

  get rawMetadata() {
    return this?.metadata || this?.info
  }

  get extensions() {
    return this.info?.nftDetails?.extensions || this.metadata?.types?.[this.commitment]?.extensions
  }

  /**
   * @param {Object} data 
   * @param {Number} data.id 
   * @param {String} data.commitment 
   * @param {'mutable' | 'minting' | 'none' | ''} data.capability
   * @param {String} data.current_txid
   * @param {String} data.current_index
   */
  updateData(data) {
    this.id = data?.id
    this.category = data?.category
    this.commitment = data?.commitment
    this.capability = data?.capability
    this.currentTxid = data?.currentTxid || data?.current_txid
    this.currentIndex = data?.currentIndex || data?.current_index
  }

  async fetchMetadata() {
    let url = `tokens/${this.category}/`
    if (this.commitment) url += `${this.commitment}/`
    this.$state.fetchingMetadata = true
    return getBcmrBackend().get(url)
      .then(response => {
        this.metadata = response?.data
        return response
      })
      .finally(() => {
        this.$state.fetchingMetadata = false
        this.$state.metadataInitialized = true
      })
  }
}

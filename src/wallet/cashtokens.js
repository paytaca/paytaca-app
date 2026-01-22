import axios from "axios"
import { getBlockChainNetwork } from './chipnet'
import { setupCache } from 'axios-cache-interceptor'

const BCMR_BACKEND_CHIP = setupCache(axios.create({
  baseURL: 'https://bcmr-chipnet.paytaca.com/api',
}))
const BCMR_BACKEND_MAIN = setupCache(axios.create({
  baseURL: 'https://bcmr.paytaca.com/api',
}))

export function getBcmrBackend() {
  const network = getBlockChainNetwork()
  if (network === 'chipnet') {
    return BCMR_BACKEND_CHIP
  } else {
    return BCMR_BACKEND_MAIN
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
    // For groups: use metadata.uris.icon or metadata.uris.image
    if (this.metadata?.uris?.icon) {
      return this.toIpfsUrl(this.metadata.uris.icon)
    }
    if (this.metadata?.uris?.image) {
      return this.toIpfsUrl(this.metadata.uris.image)
    }
    // For items: use type_metadata.uris.icon or type_metadata.uris.image
    if (this.metadata?.type_metadata?.uris?.icon) {
      return this.toIpfsUrl(this.metadata.type_metadata.uris.icon)
    }
    if (this.metadata?.type_metadata?.uris?.image) {
      return this.toIpfsUrl(this.metadata.type_metadata.uris.image)
    }
    return null
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
    if (!this.$state.metadataInitialized && !this.metadata) return

    // For new API structure, metadata might be directly available
    // Groups have full metadata, items have type_metadata
    const nftMeta = this.parsedNftMetadata
    const groupMeta = this.parsedGroupMetadata
    
    return {
      name: nftMeta?.name || groupMeta?.name,
      description: nftMeta?.description || groupMeta?.description,
      symbol: groupMeta?.symbol,
      imageUrl: nftMeta?.imageUrl || groupMeta?.imageUrl || this.imageUrl || this.metadata?.uris?.icon,
      imageUrlFull: nftMeta?.imageUrlFull || groupMeta?.imageUrl || this.imageUrl || this.metadata?.uris?.image || this.metadata?.uris?.icon,
      attributes: nftMeta?.attributes,
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
   * @param {Object} data.metadata - Pre-populated metadata from API (new endpoints)
   */
  updateData(data) {
    this.id = data?.id
    this.category = data?.category
    this.commitment = data?.commitment
    this.capability = data?.capability
    this.currentTxid = data?.currentTxid || data?.current_txid
    this.currentIndex = data?.currentIndex || data?.current_index
    
    // Handle new API structure where metadata is pre-populated
    if (data?.metadata && Object.keys(data.metadata).length > 0) {
      this.metadata = data.metadata
      this.$state.metadataInitialized = true
      this.$state.fetchingMetadata = false
    }
  }

  async fetchMetadata() {
    // Skip if metadata is already initialized (from new API endpoints)
    if (this.$state.metadataInitialized && this.metadata) {
      return Promise.resolve({ data: this.metadata })
    }
    
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

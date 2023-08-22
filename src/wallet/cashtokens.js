import axios from "axios"
import { setupCache } from 'axios-cache-interceptor';

const bcmrBackend = setupCache(axios.create({
  baseURL: 'https://bcmr.paytaca.com/api',
}))

export function convertIpfsUrl(url='') {
  if (typeof url !== 'string') return url
  if (!url.startsWith('ipfs://')) return url
  return url.replace('ipfs://', 'https://cloudflare-ipfs.com/ipfs/')
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
  }

  get parsedGroupMetadata() {
    return {
      name: this.metadata?.name,
      description: this.metadata?.description,
      symbol: this.metadata?.symbol,
      imageUrl: convertIpfsUrl(this.metadata?.uris?.icon)
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
          imageUrl: convertIpfsUrl(data?.uris?.icon) || this?.parsedGroupMetadata?.imageUrl,
          imageUrlFull: convertIpfsUrl(data?.uris?.image),
          attributes: data?.extensions?.attributes
        }
      } else {
        return {
          name: data?.name || this?.parsedGroupMetadata?.name,
          description: data?.description || this?.parsedGroupMetadata?.name,
          imageUrl: convertIpfsUrl(data?.uris?.icon) || this?.parsedGroupMetadata?.imageUrl
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
      imageUrl: this.parsedNftMetadata?.imageUrl || this.parsedGroupMetadata?.imageUrl,
      imageUrlFull: this.parsedNftMetadata?.imageUrlFull || this.parsedGroupMetadata?.imageUrl,
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
    return bcmrBackend.get(url)
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

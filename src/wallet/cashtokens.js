import axios from "axios"
import { setupCache } from 'axios-cache-interceptor';

const bcmrBackend = setupCache(axios.create({
  baseURL: 'https://bcmr.paytaca.com/api',
}))

function getAnyProperty(obj) {
 if (!obj || !typeof obj === 'object') return

 return Object.getOwnPropertyNames(obj).map(propertyName => obj?.[propertyName])?.find(Boolean)
}

function convertIpfsUrl(ipfsUrl='') {
  if (typeof ipfsUrl !== 'string') return ipfsUrl
  if (!ipfsUrl.startsWith('ipfs://')) return ipfsUrl
  return ipfsUrl.replace('ipfs://', 'https://cloudflare-ipfs.com/ipfs/')
}

export class CashNonFungibleToken {
  static parse(...args) {
    return new CashNonFungibleToken(...args)    
  }

  constructor (data) {
    this.updateData(data)
  }

  get parsedGroupMetadata() {
    return {
      name: this.metadata?.name || this.info?.name,
      description: this.metadata?.description || this?.info?.description,
      imageUrl: convertIpfsUrl(getAnyProperty(this.metadata?.uris) || this.info?.imageUrl),
    }
  }

  get parsedNftMetadata() {
    const data = this.metadata?.types?.[this.commitment]
    return {
      name: data?.name || this?.parsedGroupMetadata?.name || this.info?.name,
      description: data?.description || this?.parsedGroupMetadata?.name || this.info?.description,
      imageUrl: convertIpfsUrl(getAnyProperty(data?.uris) || this?.parsedGroupMetadata?.imageUrl || this.info?.imageUrl),
      attributes: data?.extensions?.attributes || this.info?.nftDetails?.extensions?.attributes,
    }
  }

  get parsedMetadata() {
    return {
      name: this.parsedNftMetadata?.name || this.parsedGroupMetadata?.name,
      description: this.parsedNftMetadata?.description || this.parsedGroupMetadata?.description,
      imageUrl: this.parsedNftMetadata?.imageUrl || this.parsedGroupMetadata?.imageUrl,
      attributes: this.parsedNftMetadata?.attributes,
    }
  }

  get rawMetadata() {
    return this?.metadata || this?.info
  }


  /**
   * @param {Object} data 
   * @param {Number} data.id 
   * @param {String} data.commitment 
   * @param {'mutable' | 'minting' | 'none' | ''} data.capability
   * @param {String} data.current_txid
   * @param {String} data.current_index
   * @param {Object} data.info
   * @param {String} data.info.name
   * @param {String} data.info.description
   * @param {String} data.info.symbol
   * @param {Number} data.info.decimals
   * @param {String} data.info.image_url
   * @param {Object} data.info.nft_details
   */
  updateData(data) {
    this.id = data?.id
    this.category = data?.category
    this.commitment = data?.commitment
    this.capability = data?.capability
    this.currentTxid = data?.currentTxid || data?.current_txid
    this.currentIndex = data?.currentIndex || data?.current_index

    // for backwards compatibility
    this.info = {
      name: data?.info?.name,
      description: data?.info?.description,
      symbol: data?.info?.symbol,
      decimals: data?.info?.decimals,
      imageUrl: data?.info?.imageUrl || data?.info?.image_url,
      nftDetails: data?.info?.nftDetails || data?.info?.nft_details,
    }
  }

  async fetchMetadata() {
    let url = `tokens/${this.category}/`
    if (this.commitment) url += `${this.commitment}/`

    return bcmrBackend.get(url)
      .then(response => {
        this.metadata = response?.data
        return response
      })
  }
}

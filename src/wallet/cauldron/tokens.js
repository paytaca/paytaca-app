import axios from 'axios';


/**
 * 
 * @typedef {Object} BCMRData
 * @property {String} name
 * @property {String} description
 * @property {{ category:String, decimals:Number, symbol:String }} token
 * @property {{ icon:String, web:String }} uris
 * 
 * @typedef {Object} CauldronTokenMarketInfo
 * @property {Number} apy_30d_bp
 * @property {Number} change_24h_bp
 * @property {Number} change_24h_usd_bp
 * @property {Number} change_7d_bp
 * @property {Number} change_7d_usd_bp
 * @property {String} display_name
 * @property {String} display_symbol
 * @property {Number} price_24h
 * @property {Number} price_24h_usd
 * @property {Number} price_7d
 * @property {Number} price_7d_usd
 * @property {Number} price_now
 * @property {Number} price_now_usd
 * @property {Number} score
 * @property {Number} score_rank
 * @property {String} token_id
 * @property {Number} trade_count
 * @property {Number} trade_volume
 * @property {Number} tvl_sats
 * @property {Number} tvl_tokens
 * 
 * @typedef {{ bcmr:BCMRData, bcmr_well_known:BCMRData[] } & CauldronTokenMarketInfo} CauldronTokenData
 */

/**
 * @param {Object} opts 
 * @property {String} opts.token_id The token ids to filter by
 * @property {Number} opts.limit The number of tokens to return
 * @property {Number} opts.offset The offset of the tokens to return
 * @property {String} opts.by The field to sort by
 * @property {String} opts.order The order to sort by
 * @property {String} opts.q The query to search for
 * @returns {Promise<CauldronTokenData[]>}
 */
export async function fetchTokensList(opts) {
  const params =  {
    limit: opts?.limit || 20,
    offset: opts?.offset || 0,
    by: opts?.by || 'score',
    order: opts?.order || 'desc',
    q: opts?.q || undefined
  }
  let path = 'cauldron/tokens/list_cached'
  if (opts?.q) {
    path = 'cauldron/tokens/search_cached'
  } else if (opts?.token_id) {
    params.ids = opts?.token_id
    path = 'cauldron/tokens/list_cached_by_ids'
  }
  const response = await axios.get('https://indexer2.cauldron.quest/' + path, { params })
  return response.data
}

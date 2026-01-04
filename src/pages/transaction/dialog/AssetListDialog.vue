<template>
	<q-dialog 
		ref="dialog" 
		full-width		
	    position="top"
	    transition-show="fade"
	    transition-hide="fade"
	>
		<q-card  class="br-15 q-mt-xl q-mx-sm wallet-card" :class="getDarkModeClass(darkMode)">
			<div class="row no-wrap items-center justify-center q-pl-lg q-pr-sm q-pt-md">
		        <div class="text-bold q-space q-mt-sm pt-label" :class="getDarkModeClass(darkMode)"></div>
		        <q-btn
		          flat
		          padding="sm"
		          icon="close"
		          class="close-button"
		          v-close-popup
		        />
		    </div>
		    <q-card-section>
		        <q-input
		          dense
		          outlined
		          rounded
		          v-model="searchText"
		          :placeholder="$t('SearchAsset')"
		          :loading="loading"
		        >
		          <template v-slot:append>
		            <q-icon name="search" color="grey-5" />
		          </template>
		        </q-input>
		      </q-card-section>
			<div v-if="loading" class="q-pa-md text-center">
				<q-spinner color="primary" size="40px" />
				<p class="q-mt-sm">{{ $t('LoadingAssets', {}, 'Loading assets') }}...</p>
			</div>
			<div v-else :class="darkMode ? 'text-white' : 'text-black'">
				<q-list separator class="q-px-lg">
					<!-- Add "All" option at the top -->
					<q-item class="q-py-md" clickable v-ripple @click="onOKClick({ id: 'all', symbol: 'All', name: 'All Assets', logo: null })" :key="'all'">
						<q-item-section avatar>
							<q-avatar>
								<q-icon name="list" size="md" />
							</q-avatar>
						</q-item-section>
						<q-item-section class="text-bold">{{ $t('All') }}</q-item-section>
					</q-item>
					
					<q-item class="q-py-md" clickable v-ripple v-for="asset in filteredList" @click="onOKClick(asset)" :key="asset.id">
						<q-item-section avatar>
		          <q-avatar>
		            <img 
		              :src="getImageUrl(asset)" 
		              class="asset-icon"
		              @touchstart.prevent.stop
		              @touchmove.prevent.stop
		              @touchend.prevent.stop
		              @contextmenu.prevent.stop
		              @selectstart.prevent
		            >
		          </q-avatar>
		        </q-item-section>
		        <q-item-section class="text-bold">{{ asset.name }}</q-item-section>
					</q-item>

				</q-list>
			</div>
		</q-card>
	</q-dialog>	
</template>
<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { cachedLoadWallet } from 'src/wallet'
import { getWatchtowerApiUrl } from 'src/wallet/chipnet'
import { convertIpfsUrl } from 'src/wallet/cashtokens'
import axios from 'axios'

export default {
	data () {
		return {
			searchText: '',
			allTokensFromAPI: [], // Store tokens fetched from API
			wallet: null,
			loading: false
		}
	},
	computed: {
		darkMode () {
	    return this.$store.getters['darkmode/getStatus']
	  },
	  assets () {
			// Get BCH asset from store
			const bchAsset = this.$store.getters['assets/getAssets'].find(asset => asset?.id === 'bch')
			
			// Use tokens from API - they already have favorite and favorite_order
			// Filter out tokens without an id to prevent rendering errors
			const apiTokens = (this.allTokensFromAPI || [])
				.filter(token => token && token.id) // Only include tokens with valid id
				.map(token => ({
					id: token.id,
					name: token.name || 'Unknown Token',
					symbol: token.symbol || '',
					decimals: token.decimals || 0,
					logo: token.logo,
					balance: token.balance !== undefined ? token.balance : 0,
					favorite: token.favorite === true ? 1 : 0,
					favorite_order: token.favorite_order !== null && token.favorite_order !== undefined ? token.favorite_order : null
				}))

			// Sort: favorites first (by favorite_order), then non-favorites
			const sortedTokens = apiTokens.sort((a, b) => {
				// If one is favorite and other is not, favorite comes first
				if (a.favorite === 1 && b.favorite === 0) return -1
				if (a.favorite === 0 && b.favorite === 1) return 1
				// If both are favorites, sort by favorite_order
				if (a.favorite === 1 && b.favorite === 1) {
					const orderA = a.favorite_order || 0
					const orderB = b.favorite_order || 0
					return orderA - orderB
				}
				// If both are non-favorites, maintain their relative order
				return 0
			})

			// Return: BCH first, then sorted tokens
			return [
				...(bchAsset ? [bchAsset] : []),
				...sortedTokens
			].filter(asset => asset && asset.id) // Extra safety
		},
	  filteredList () {
      if (!this.searchText) return this.assets

      const needle = String(this.searchText).toLowerCase()

      return this.assets
        .filter(asset => {
          if (!this.searchText) return true
          if (!asset) return false
          if (/0x[0-9a-f]+/.test(needle) && (asset.symbol.toLowerCase() === needle || asset.name.toLowerCase() === needle)) return true

          return String(asset.symbol).toLowerCase().includes(needle) || String(asset.name).toLowerCase().includes(needle)
        })
    }
	},
	props: {
		// Removed assets prop - we fetch directly from API now
	},
	async mounted () {
		// Load wallet and fetch tokens
		const walletIndex = this.$store.getters['global/getWalletIndex']
		this.wallet = await cachedLoadWallet('BCH', walletIndex)
		await this.fetchTokensFromAPI()
	},
	methods: {
		getDarkModeClass,
		async fetchTokensFromAPI () {
			if (!this.wallet) {
				console.warn('[AssetListDialog] Wallet not loaded, cannot fetch tokens')
				return []
			}

			const walletHash = this.wallet.BCH?.walletHash || this.wallet.bch?.walletHash
			if (!walletHash) {
				console.warn('[AssetListDialog] Wallet hash not available')
				return []
			}

			const isChipnet = this.$store.getters['global/isChipnet']
			const baseUrl = getWatchtowerApiUrl(isChipnet)

			const filterParams = {
				has_balance: true,
				token_type: 1,
				wallet_hash: walletHash,
				limit: 100 // Fetch more tokens per page
			}

			this.loading = true
			try {
				const url = `${baseUrl}/cashtokens/fungible/`
				let allTokens = []
				let nextUrl = url
				let params = filterParams

				// Fetch all pages if there are more results
				while (nextUrl) {
					const { data } = await axios.get(nextUrl, { params })

					if (!Array.isArray(data.results)) {
						break
					}

					// Map API response to asset format
					const tokens = data.results
						.filter(result => {
							if (!result || !result.id) {
								console.warn('[AssetListDialog] Token from API missing id:', result)
								return false
							}
							return true
						})
						.map(result => {
							// Convert IPFS URLs if needed
							const logo = result.image_url ? convertIpfsUrl(result.image_url) : null

							return {
								id: result.id,
								name: result.name || 'Unknown Token',
								symbol: result.symbol || '',
								decimals: result.decimals || 0,
								logo: logo,
								balance: result.balance !== undefined ? result.balance : 0,
								favorite: result.favorite === true ? 1 : 0,
								favorite_order: result.favorite_order !== null && result.favorite_order !== undefined ? result.favorite_order : null
							}
						})

					allTokens = [...allTokens, ...tokens]

					// Check if there's a next page
					if (data.next) {
						nextUrl = data.next
						params = {} // Don't send params again, URL already has them
					} else {
						nextUrl = null
					}
				}

				this.allTokensFromAPI = allTokens
				return allTokens
			} catch (error) {
				console.error('[AssetListDialog] Error fetching tokens from API:', error)
				return []
			} finally {
				this.loading = false
			}
		},
		getImageUrl (asset) {
			if (asset?.logo) {
				if (asset.logo.startsWith('https://ipfs.paytaca.com/ipfs')) {
					return asset.logo + '?pinataGatewayToken=' + process.env.PINATA_GATEWAY_TOKEN
				} else {
					return asset.logo
				}
			}
			return ''
		},
		onOKClick (asset) {
      // if (coin.offline === false) {
      this.$emit('ok', asset)
      this.$refs.dialog.hide()
      // }
    },
	}
}
</script>
<style lang="scss" scoped>
.wallet-card {
  height: 525px;
  .title {
    font-size: 18px;
  }
  .bottom-border {
    border-bottom-width: 1px;
    border-bottom-style: solid;
  }
  .address, .market-currency {
    font-size: 12px;
  }
}
</style>
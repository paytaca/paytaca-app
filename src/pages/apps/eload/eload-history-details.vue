<template>
	<HeaderNav title="Eload Service" :backnavpath="{ name: 'eload-service-orders'}" class="header-nav"/>

	<div class="q-pt-md q-mx-lg" v-if="!loading" :class="darkMode ? 'text-white' : 'text-black'">
		<div class="text-center q-mb-md">
			<div class="text-capitalize status">{{ order.status }}</div>
			<div class="order-id">ORDER ID: {{ order.txn_id }}</div>
		</div>
		<q-card class="q-pa-md br-15">			
			<div class="lg-font-size text-weight-bold">
				{{ promoSnapshot.name }}
			</div>

			<div class="q-gutter-sm q-py-sm">				
				<q-badge class="q-px-sm" rounded outline color="primary" :label="promoSnapshot.service" />
		    	<q-badge class="q-px-sm" rounded outline color="primary" :label="promoSnapshot.service_group" />
			</div>

			<div class=" q-py-xs">
				<span class="md-font-size">PHP {{ promoSnapshot.amount}}</span> &nbsp;|&nbsp; <span class="sm-font-size subtext">{{ order.bch_amount }} BCH</span>
			</div>		
			
			<div class="q-py-xs">{{ promoSnapshot.description }}</div>

			<div class="sm-font-size subtext">{{ promoSnapshot.validity }}</div>
		</q-card>

		<div v-if="order.bch_txid && order.bch_txid !== 'balance-confirmed'" class="transaction-id-section section-block-ss text-center" style="margin-top: 25px;">
          <div class="text-weight-medium sm-font-size q-mb-sm" :class="darkMode ? 'text-white' : 'text-grey'">&nbsp;{{ $t('TransactionId')}}</div>         

          <div class="txid-container-ss" :class="getDarkModeClass(darkMode)" @click="order.bch_txid && copyToClipboard(order.bch_txid)">
            <span class="txid-text-ss">{{ order.bch_txid ? `${order.bch_txid.slice(0, 8)}...${order.bch_txid.slice(-8)}` : '' }}</span>
            <q-icon name="content_copy" size="18px" class="copy-icon-ss" />
          </div>
          <div class="view-explorer-container q-mt-sm">
            <a class="view-explorer-link-ss text-grad" :class="getDarkModeClass(darkMode)" :href="explorerLink" target="_blank">
              <q-icon name="open_in_new" size="16px" class="q-mr-xs" />
              {{ $t('ViewInExplorer') }}
            </a>
          </div>
        </div>

        <div v-if="order.completed_at">
        	<div class="text-weight-medium sm-font-size text-center" :class="darkMode ? 'text-white' : 'text-grey'" style="margin-top: 14px;">&nbsp;Completed at</div>
	        <div class="date-prominent q-mt-xs q-mb-lg date-block-ss" :class="getDarkModeClass(darkMode)" style="margin-top: 10px;">
	          {{ formatDate(order.completed_at) }}
	        </div>
        </div>        
	</div>

	<div v-else class="q-pt-md">
		<div class="skeleton-center">
	    	<q-skeleton type="text" width="75px" height="30px" class="q-mb-xs" style="margin: 0 auto;" />
	        <q-skeleton type="text" width="50%" height="20px" style="margin: 0 auto;" />
	    </div>

	    <q-skeleton	animation="wave" type="rect" height="180px" class="br-15 q-mx-lg q-mt-md"/>

	    <div class="skeleton-center q-mt-md">
	    	<q-skeleton	animation="wave" type="text" width="30%" height="30px" style="margin: 0 auto;"/>
	    	<q-skeleton	animation="wave" type="text" width="60%" height="50px" class="br-15" style="margin: 0 auto;"/>
	    	<q-skeleton	animation="wave" type="text" width="30%" height="30px" style="margin: 0 auto;"/>

	    	<q-skeleton	animation="wave" type="text" width="30%" height="30px" style="margin: 0 auto;"/>
	    	<q-skeleton	animation="wave" type="text" width="60%" height="40px" style="margin: 0 auto;"/>
	    	
	    </div>	    
	</div>
</template>
<script>
import * as eloadServiceAPI from 'src/utils/eload-service.js'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import HeaderNav from 'src/components/header-nav.vue'

export default {
	data () {
		return {
			darkMode: this.$store.getters['darkmode/getStatus'],
			order: null,
			loading: true,
			promoSnapshot: null
		}
	},
	components: {
		HeaderNav
	},
	computed: {
		explorerLink () {
	      const txid = this.order.bch_txid
	      let url = 'https://explorer.paytaca.com/tx/'
	      if (this.$store.getters['global/isChipnet']) {
	        url = `${process.env.TESTNET_EXPLORER_URL}/tx/`
	      }
	      return `${url}${txid || ''}`
	    },
	},
	async mounted () {
		await this.fetchOrder()
	},
	methods: {	
		getDarkModeClass,	
		async fetchOrder () {
			this.loading = true
			const orderID = this.$route.params.orderId

			const result = await eloadServiceAPI.fetchOrderDetails(orderID)

			if (result.success) {
				this.order = result.data
				this.promoSnapshot = result.data.promo_snapshot
			}			

			this.loading = false
		},
		copyToClipboard (value) {
	      this.$copyText(value)
	      this.$q.notify({ color: 'blue-9', message: this.$t('CopiedToClipboard'), icon: 'mdi-clipboard-check', timeout: 200 })
	    },
	    formatDate (date) {
	      const dateObj = new Date(date)
	      const langs = [this.$store.getters['global/language'], 'en-US']
	      return new Intl.DateTimeFormat(langs, {
	        year: 'numeric',
	        month: 'short',
	        day: 'numeric',
	        hour: 'numeric',
	        minute: '2-digit',
	        second: '2-digit',
	        timeZoneName: 'short'
	      }).format(dateObj)
	    },
	}
}
</script>
<style lang="scss" scoped>
  /* ==================== FONT SIZES ==================== */
  .sm-font-size {
    font-size: small;
  }
  .md-font-size {
    font-size: medium;
  }
  .lg-font-size {
    font-size: large;
  }

/* ==================== CUSTOM STYLE ==================== */
.subtext {
	opacity: .5;
}
.order-id {
    font-size: 12px;
    opacity: 0.5;
    font-weight: 400;
    letter-spacing: 0;
    word-wrap: break-word;
    overflow-wrap: break-word;
  }
.status {
    font-size: 16px;
    font-weight: 500;
    line-height: 1.4;
    margin-bottom: 2px;
    word-wrap: break-word;
    overflow-wrap: break-word;
  }
 /* Reference + Txid blocks to mirror SendSuccessBlock */
.reference-id-value-ss {
  font-size: 32px;
  font-weight: 700;
  letter-spacing: 8px;
  margin-top: 8px;
  font-family: 'Courier New', monospace;
}
.txid-container-ss {
  cursor: pointer;
  padding: 12px 20px;
  border-radius: 12px;
  transition: all 0.25s ease;
  display: inline-flex;
  align-items: center;
  gap: 12px;
  background: rgba(128, 128, 128, 0.08);
  border: 1px solid rgba(128, 128, 128, 0.2);
}
.txid-text-ss {
  font-family: 'Courier New', monospace;
  font-size: 15px;
  font-weight: 500;
  letter-spacing: 0.5px;
}
.copy-icon-ss { opacity: 0.7; transition: all 0.2s ease; }
.view-explorer-link-ss { display: inline-flex; align-items: center; text-decoration: none; font-size: 15px; font-weight: 500; padding: 8px 16px; border-radius: 8px; color: var(--q-primary); transition: all 0.2s ease; }
.view-explorer-link-ss.dark { color: #4ade80; }
.date-prominent { text-align: center; font-size: 16px; font-weight: 500; }
.date-prominent.dark { color: rgba(255,255,255,0.85); }
.date-prominent:not(.dark) { color: rgba(0,0,0,0.85); }
.content-container-ss { min-width: 320px; max-width: 700px; margin: 0 auto; padding-top: 8px; }
.section-block-ss { margin-top: 12px; }
.date-block-ss { opacity: 0.9; }

  // Skeleton Loader Styles
  .skeleton-header {
    flex-shrink: 0;
    padding: 16px 20px;
    text-align: center;
    max-width: 100%;
    overflow-x: hidden;
    box-sizing: border-box;
  }
</style>
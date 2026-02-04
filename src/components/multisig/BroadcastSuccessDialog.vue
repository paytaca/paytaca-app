<template>
  <q-dialog ref="dialogRef" full-width full-height maximized transition-show="slide-up" transition-hide="slide-down">
    <q-card class="q-dialog-plugin pt-card row items-center justify-center text-bow" :class="getDarkModeClass(darkMode)">
      <q-card-section class="col-12 justify-center q-gutter-y-sm">
        <div class="text-grad text-center text-h6">{{$t('Success')}}</div>
	  <div class="q-px-md text-center sent-success-container">
	    <q-icon size="70px" name="check_circle" color="green-5" />
	    <div>
	      <p style="font-size: 22px;">{{ successMessage }}</p>
	      <template v-if="isNft">
		<p class="amount-label">{{ name }}</p>
	      </template>
	      <template v-else>
		<p v-if="amountSent && Number(amountSent) > 0" class="amount-label">{{ amountSent }} {{ assetSymbol }}</p>
	      </template>
	      <!-- Reference ID Section -->
	      <div class="reference-id-section q-mt-lg">
		<div class="text-grey text-weight-medium text-caption">{{ $t('ReferenceId')}}</div>
		<div class="reference-id-value">{{ hexToRef(txid.substring(0, 6)) }}</div>
		<q-separator color="grey" class="q-mt-sm"/>
	      </div>
	      
	      <!-- Transaction ID Section -->
	      <div class="transaction-id-section q-mt-lg">
		<div class="text-grey text-weight-medium text-caption q-mb-sm">{{ $t('TransactionId')}}</div>
		<div class="txid-container" :class="getDarkModeClass(darkMode)">
		  <span class="txid-text">{{ txid.slice(0, 8) }}...{{ txid.slice(-8) }}</span>
		</div>
		<div class="view-explorer-container q-mt-sm">
		  <a
		    class="view-explorer-link"
		    :class="getDarkModeClass(darkMode)"
		    :href="getExplorerLink(txid)"
		    target="_blank"
		  >
		    <q-icon name="open_in_new" size="16px" class="q-mr-xs" />
		    {{ $t('ViewInExplorer') }}
		  </a>
		</div>
	      </div>
	    </div>
	  </div>
        </q-card-section>
        <q-card-actions>
         <q-btn
          :label="$t('Close')"
          no-caps
          @click="onCloseClick"
          color="red"
         />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>
<script setup>
import { useStore } from 'vuex'
import { ref, onMounted, computed } from 'vue'
import { useDialogPluginComponent } from 'quasar'
import { getExplorerLink } from 'src/utils/send-page-utils'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { hexToRef } from 'src/utils/reference-id-utils'

const props = defineProps({
  successMessage: String,
  amountSent: {
     type: [String, Number]
  },
  isNft: Boolean,
  assetSymbol: {
    type: String,
    default: 'BCH'
  },
  txid: String,
  darkMode: Boolean
})

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()

const onCloseClick = () => {
  onDialogOK()
}
</script>

<style lang="scss" scoped>
/* unset default style for active item */
.q-item.q-router-link--active, .q-item--active {
 color: inherit;
}

.sent-success-container {
  .amount-label {
    font-size: 24px;
    font-weight: 600;
    margin-top: 8px;
  }

  // Reference ID Section
  .reference-id-section {
    .reference-id-value {
      font-size: 28px;
      font-weight: 700;
      letter-spacing: 8px;
      margin-top: 8px;
      font-family: 'Courier New', monospace;
    }
  }

  // Transaction ID Section
  .transaction-id-section {
    .txid-container {
      padding: 12px 20px;
      border-radius: 12px;
      display: inline-block;
      background: rgba(128, 128, 128, 0.08);
      border: 1px solid rgba(128, 128, 128, 0.2);
      margin: 8px auto;

      .txid-text {
        font-family: 'Courier New', monospace;
        font-size: 15px;
        font-weight: 500;
        letter-spacing: 0.5px;
      }
    }

    .view-explorer-container {
      display: block;
      text-align: center;
      
      .view-explorer-link {
        display: inline-flex;
        align-items: center;
        text-decoration: none;
        color: var(--q-primary);
        font-size: 15px;
        font-weight: 500;
        padding: 8px 16px;
        border-radius: 8px;
        transition: all 0.2s ease;
        
        &:hover {
          background: rgba(0, 128, 0, 0.08);
          transform: translateX(2px);
        }
        
        &.dark {
          color: #4ade80;
        }
      }
    }
  }
}
</style>

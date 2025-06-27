<template>
  <q-dialog ref="dialogRef" full-width full-height maximized transition-show="slide-up" transition-hide="slide-down">
    <q-card class="q-dialog-plugin pt-card row items-center justify-center text-bow" :class="getDarkModeClass(darkMode)">
      <q-card-section class="col-12 justify-center q-gutter-y-sm">
        <div class="text-grad text-center text-h6">{{$t('Success')}}</div>
	  <div class="q-px-md text-center sent-success-container">
	    <q-icon size="70px" name="check_circle" color="green-5" />
	    <div>
	      <p style="font-size: 22px;">{{ $t('SuccessfullySent') }}</p>
	      <template v-if="isNft">
		<p class="amount-label">{{ name }}</p>
	      </template>
	      <template v-else>
		<p class="amount-label">{{ amountSent }} {{ assetSymbol }}</p>
	      </template>
	      <div class="text-center q-mt-lg">
		<div class="text-grey">{{ $t('ReferenceId')}}</div>
		<div class="text-h4" style="letter-spacing: 6px;">{{ txid.substring(0, 6).toUpperCase() }}</div>
		<q-separator color="grey"/>
	      </div>
	      <div class="q-px-xs q-mt-sm text-subtitle1">
		<div class="text-grey">{{ $t('TransactionId')}}</div>
		<p style="font-family: monospace;" :class="getDarkModeClass(darkMode)">{{ txid.slice(0, 8) }}...{{ txid.slice(-8) }}</p>
		<a
		  class="button button-text-primary view-explorer-button"
		  style="text-decoration: none;"
		  :class="getDarkModeClass(darkMode)"
		  :href="getExplorerLink(txid)"
		  target="_blank"
		>
		  {{ $t('ViewInExplorer') }}
		</a>
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

<style scoped>
/* unset default style for active item */
.q-item.q-router-link--active, .q-item--active {
 color: inherit
}
</style>

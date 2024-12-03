<template>
  <q-dialog ref="dialogRef" persistent seamless>
    <q-card class="q-dialog-plugin br-15 q-pb-xs pt-card" :class="getDarkModeClass(darkMode)">
      <q-card-section class="text-grey-10">
        <div class="row items-start justify-start no-wrap q-gutter-x-sm">
          <PeerInfo v-if="sessionProposal?.proposer?.metadata" 
            :metadata="sessionProposal.proposer.metadata"
            :session-id="sessionProposal.id" :session-topic="sessionProposal.pairingTopic"
          />
        </div>
      </q-card-section>
      <div class="text-grad text-center q-my-sm">{{$t('SelectAddress')}}</div>
      <q-card-section>
        <q-list bordered separator>
        <q-item
          v-for="item in addressOptions"
            :key="item.address"
            clickable
            @click="selectAddress(item.address)"
            :active="item.selected"
            :focused="item.selected"
          >
            <q-item-section>
              <div>{{ `${item.index} - ${item.label}` }}</div>
            </q-item-section>

            <q-item-section side>
              <q-icon
                v-if="item.selected"
                name="check"
                color="primary"
                size="sm"
              />
              <q-badge 
                v-if="!item.selected && 
                lastUsedWalletAddress && 
                lastUsedWalletAddress.wallet_address === item.address">
                Last Used
              </q-badge>
            </q-item-section>
          </q-item>
        </q-list>
        
      </q-card-section>
      <q-card-actions>
        <q-space />
        <q-btn
          outline
          color="grey"
          :label="$t('Cancel')"
          rounded
          flat
          @click="onCancelClick"
          no-caps
        />

        <q-btn
          color="green"
          :label="$t('Connect')"
          rounded
          no-caps
          @click="onConnectClick"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>
<script setup>
import { ref , computed, onMounted } from 'vue'
import { useDialogPluginComponent } from 'quasar'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { shortenAddressForDisplay } from 'src/utils/address-utils'
import PeerInfo from './PeerInfo.vue'
const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } 
  = useDialogPluginComponent()
const emit = defineEmits(['ok', 'hide'])
const props = defineProps({
  peerId: String,
  sessionProposal: Object,
  darkMode: Boolean,
  walletAddresses: Array,
  lastUsedWalletAddress: null /*{ wallet_address: string, app_url: string, app_icon: string }*/
})


const addressSelected = ref /*<string>*/ ('')
const addressOptions  = ref /*<{label: string, value: string }[]>*/ ([])

const selectAddress = (address) => {
  addressOptions.value.forEach(item => {
    item.selected = (item.address === address);
    if (item.selected) {
      addressSelected.value = address
    }
  });
}
const onConnectClick = () => {
  onDialogOK(
    props.walletAddresses.find((walletAddress) => walletAddress.address === addressSelected.value)
  )
}
const onCancelClick = () => {
  onDialogCancel()
  onDialogHide()
}

onMounted(() => {
  addressOptions.value = props.walletAddresses?.map((item) => ({ label: shortenAddressForDisplay(item.address), address: item.address, index: item.address_index }))
  if (props.walletAddresses) {
    addressSelected.value = props.walletAddresses[0].address
  }
  if (props.lastUsedWalletAddress?.wallet_address) {
    // const foundLastUsed = props.walletAddresses.find((walletAddress) => {
    //   return walletAddress.address == props.lastUsedWalletAddress.wallet_address
    // })
    // addressSelected.value = foundLastUsed ? foundLastUsed.address: addressSelected.value

    const foundLastUsed = addressOptions.value.find((item) => {
      return item.address == props.lastUsedWalletAddress.wallet_address
    })
    addressSelected.value = foundLastUsed ? foundLastUsed.address: addressSelected.value
  }
  console.log('ADDRESSES', props.walletAddresses)
  console.log('selected', addressSelected.value)
  console.log('LAST USED', props.lastUsedWalletAddress)
})
</script>

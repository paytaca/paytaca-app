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
import { ref, onMounted } from 'vue'
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

const onConnectClick = () => {
  onDialogOK(
    props.walletAddresses.find((walletAddress) => walletAddress.address === addressSelected.value)
  )
}
const onCancelClick = () => {
  onDialogCancel()
  onDialogHide()
}

const selectAddress = (address) => {
  addressOptions.value.forEach(addressOption => {
    addressOption.selected = (addressOption.address === address);
    if (addressOption.selected) {
      addressSelected.value = address
    }
  });
}

const selectLastAddressUsedIfFound = () => {
  if (props.lastUsedWalletAddress?.wallet_address) {
    const foundLastUsed = addressOptions.value.find((addressOption) => {
      return addressOption.address == props.lastUsedWalletAddress.wallet_address
    })

    if (foundLastUsed) {
      foundLastUsed.selected = true
      addressSelected.value = foundLastUsed.address
    }
  }
}

onMounted(() => {
  // walletAddresses has wif we don't want to pass it as options to the dialog
  addressOptions.value = props.walletAddresses?.map((item) => ({ label: shortenAddressForDisplay(item.address), address: item.address, index: item.address_index }))
  if (props.walletAddresses) {
    addressSelected.value = props.walletAddresses[0].address
    addressOptions.value[0].selected = true
  }
  selectLastAddressUsedIfFound()
})
</script>

<template>
  <q-dialog ref="dialogRef" persistent seamless full-width position="bottom">
    <q-card class="q-dialog-plugin q-pb-xs pt-card" :class="getDarkModeClass(darkMode, '', 'text-black')">
      <q-card-section class="text-grey-10">
        <div class="row items-start justify-start no-wrap q-gutter-x-sm">
          <PeerInfo v-if="sessionProposal?.proposer?.metadata" 
            :metadata="sessionProposal.proposer.metadata"
            :session-id="sessionProposal.id" :session-topic="sessionProposal.pairingTopic"
          />
        </div>
      </q-card-section>
      <div class="text-grad text-center q-my-sm text-h6">{{$t('SelectAddress')}}</div>
      <div class="row justify-center q-mt-sm">
        <q-btn-group rounded>
          <q-btn 
            @click="() => $store.commit('walletconnect/setAddressDisplayFormatSetting', 'cashaddr')" 
            :color="settings.addressDisplayFormat === 'cashaddr' ? 'primary': 'grey'" 
            :outline="settings.addressDisplayFormat !== 'cashaddr'"
            size="sm"
            no-caps
            >
            cashaddr 
          </q-btn>
          <q-btn 
            @click="() => $store.commit('walletconnect/setAddressDisplayFormatSetting', 'tokenaddr')" 
            :color="settings.addressDisplayFormat === 'tokenaddr' ? 'primary': 'grey'" 
            :outline="settings.addressDisplayFormat !== 'tokenaddr'"
            size="sm"
            no-caps
            >
            tokenaddr 
          </q-btn>
        </q-btn-group>
      </div>
      <q-card-section>
        <q-list bordered separator style="max-height:calc(80vh - 18rem);overflow-y: auto;">
        <q-item-label header class="text-justify">
          <p>{{ $t('SingleSigAddressSelectionHeader', 'Shows the last used address on this peer app (if any) and at most the last 4 receiving addresses of your wallet. The format is n-address where n is the address index.') }}</p>
        </q-item-label>
        <q-item
          v-for="item in addressOptions"
            :key="item.address"
            clickable
            @click="selectAddress(item.address)"
            :active="item.selected"
            :focused="item.selected"
          >
            <q-item-section>
              <div class="text-caption" >{{ `${item.index}-${formatAddressForDisplay(item.label)}` }} </div>
            </q-item-section>

            <q-item-section side>
              <div class="row flex q-gutter-x-sm">
                <q-badge
                  v-if="lastUsedWalletAddress?.wallet_address === item.address">
                  Last Used
                </q-badge>
                <q-icon
                  v-if="item.selected"
                  name="check"
                  color="primary"
                  size="sm"
                />
              </div>
            </q-item-section>
          </q-item>
        <q-separator></q-separator>
        <q-item-label v-if="multisigAddressOptions?.length > 0" header>Multisig Address</q-item-label>
        <q-item
          v-for="item in multisigAddressOptions"
            :key="item.address"
            clickable
            @click="selectMultisigAddress(item.address)"
            :active="item.selected"
            :focused="item.selected"
          >
            <q-item-section>
              <q-item-label>{{ item.name }}</q-item-label>
              <q-item-label caption lines="2">{{ `${formatAddressForDisplay(item.address)}` }} </q-item-label>
            </q-item-section>

            <q-item-section side>
              <div class="row flex q-gutter-x-sm">
                <q-badge
                  v-if="lastUsedWalletAddress?.wallet_address === item.address">
                  Last Used
                </q-badge>
                <q-icon
                  v-if="item.selected"
                  name="check"
                  color="primary"
                  size="sm"
                />
              </div>
            </q-item-section>
          </q-item>
        </q-list>
      </q-card-section>
      <q-card-actions class="q-pa-md">
        <q-space />
        <q-btn
          outline
          :label="$t('Cancel')"
          rounded
          @click="onCancelClick"
          no-caps
        />
        <q-btn
          rounded
          color="primary"
          :label="$t('Connect', 'Connect')"
          no-caps
          @click="onConnectClick"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>
<script setup>
import { ref, onMounted, computed } from 'vue'
import { useDialogPluginComponent } from 'quasar'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { useStore } from 'vuex'
import { shortenAddressForDisplay } from 'src/utils/address-utils'
import { convertCashAddress } from 'src/wallet/chipnet'
import PeerInfo from './PeerInfo.vue'

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()
const $store = useStore()
const settings = computed(() => $store.getters['walletconnect/settings'])

const formatAddressForDisplay = (address) => {
  if (settings.value?.addressDisplayFormat === 'tokenaddr') {
    return shortenAddressForDisplay(convertCashAddress(address, $store.getters['global/isChipnet'], true))
  }
  return shortenAddressForDisplay(address)
}

const props = defineProps({
  peerId: String,
  sessionProposal: Object,
  darkMode: Boolean,
  walletAddresses: Array, /* walletObject[] */
  multisigWallets: { type: Array, default: () => [], required: false }, /* multisigWallets[] */
  lastUsedWalletAddress: null /* { wallet_address: string, app_url: string, app_icon: string } */
})

const addressSelected = ref('') /* <string> */
const addressSelectedIsMultisig = ref()
const addressOptions = ref([]) /* <{label: string, value: string, selected?: boolean }[]> */
const multisigAddressOptions = ref([]) /* <{label: string, value: string, selected?: boolean }[]> */

const onConnectClick = () => {
  let selectedWalletAddress = props.walletAddresses.find((walletAddress) => walletAddress.address === addressSelected.value)
  if (addressSelectedIsMultisig.value) {
    selectedWalletAddress = props.multisigWallets.find((walletAddress) => walletAddress.address === addressSelected.value)
  }
  onDialogOK({
    selectedWalletAddress,
    isMultisig: addressSelectedIsMultisig.value
  })
}
const onCancelClick = () => {
  onDialogCancel()
  onDialogHide()
}

const selectAddress = (address) => {
  addressOptions.value.forEach(addressOption => {
    addressOption.selected = (addressOption.address === address)
    if (addressOption.selected) {
      addressSelected.value = address
      addressSelectedIsMultisig.value = false
      multisigAddressOptions.value.forEach(ao => ao.selected = false)
    }
  })
}

const selectMultisigAddress = (address) => {
  multisigAddressOptions.value.forEach(addressOption => {
    addressOption.selected = (addressOption.address === address)
    if (addressOption.selected) {
      addressSelected.value = address
      addressSelectedIsMultisig.value = true
      addressOptions.value.forEach(ao => ao.selected = false)
    }
  })
}

onMounted(() => {
  // walletAddresses has wif we don't want to pass it as options to the dialog
  addressOptions.value = props.walletAddresses?.map((item) => ({ label: item.address, address: item.address, index: item.address_index }))
  multisigAddressOptions.value = props.multisigWallets?.map((item) => ({ label: item.template.name, address: item.address, isMultisig: true }))
  if (props.walletAddresses) {
    addressSelected.value = props.walletAddresses[0].address
    addressOptions.value[0].selected = true
  }
  if (props.lastUsedWalletAddress?.wallet_address) {
    selectAddress(props.lastUsedWalletAddress?.wallet_address)
  }
})
</script>

<style scoped>
/* unset default style for active item */
.q-item.q-router-link--active, .q-item--active {
 color: inherit 
}
</style>

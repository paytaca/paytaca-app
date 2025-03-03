<template>
  <q-dialog ref="dialogRef" persistent seamless>
    <q-card class="q-dialog-plugin br-15 q-pb-xs pt-card text-bow" :class="getDarkModeClass(darkMode)">
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
            :color="settings.addressDisplayFormat === 'cashaddr' ? 'brandblue': 'grey'" 
            :outline="settings.addressDisplayFormat !== 'cashaddr'"
            size="sm"
            no-caps
            >
            cashaddr 
          </q-btn>
          <q-btn 
            @click="() => $store.commit('walletconnect/setAddressDisplayFormatSetting', 'tokenaddr')" 
            :color="settings.addressDisplayFormat === 'tokenaddr' ? 'brandblue': 'grey'" 
            :outline="settings.addressDisplayFormat !== 'tokenaddr'"
            size="sm"
            no-caps
            >
            tokenaddr 
          </q-btn>
        </q-btn-group>
      </div>
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
import { ref, onMounted, computed } from 'vue'
import { useDialogPluginComponent, useQuasar } from 'quasar'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { useStore } from 'vuex';
import { shortenAddressForDisplay } from 'src/utils/address-utils'
import { convertCashAddress } from 'src/wallet/chipnet';
import PeerInfo from './PeerInfo.vue'
const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } 
  = useDialogPluginComponent()
const emit = defineEmits(['ok', 'hide'])
const $q = useQuasar()
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
  walletAddresses: Array,
  lastUsedWalletAddress: null, /*{ wallet_address: string, app_url: string, app_icon: string }*/
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

onMounted(() => {
  // walletAddresses has wif we don't want to pass it as options to the dialog
  addressOptions.value = props.walletAddresses?.map((item) => ({ label: item.address, address: item.address, index: item.address_index }))
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

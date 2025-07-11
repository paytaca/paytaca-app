<template>
  <q-dialog ref="dialogRef" full-width maximized position="bottom">
    <q-card class="q-dialog-plugin q-pb-xs pt-card text-bow" :class="getDarkModeClass(darkMode)">
      <div class="text-grad text-center q-my-sm text-h6">{{$t('Select Wallet')}}</div>
      <q-card-section>
        <q-list separator>
        <q-item>
          <q-item-section>
            <q-item-label class="text-justify text-overline">
              Use one of your wallets for signing transactions as {{ signerName || `Signer ${signerIndex}` }}.
            </q-item-label>
          </q-item-section>
        </q-item>
        <q-item
          v-for="(localWallet, i) in localWallets"
            :key="i"
            clickable
            @click="() => onSelect(localWallet)"
            :active="localWallet.wallet.bch.xPubKey === selectedWallet?.wallet?.bch?.xPubKey"
            :focused="localWallet.wallet.bch.xPubKey === selectedWallet?.wallet?.bch?.xPubKey"
          >
          <q-item-section>
            <q-item-label>{{ localWallet.name || 'Unnamed Wallet' }}</q-item-label>
            <q-item-label caption lines="2">
              {{ shortenString(localWallet.wallet.bch.xPubKey, 20) }}
            </q-item-label>
            <q-item-label caption lines="2">
              {{ shortenString(localWallet.wallet.bch.addresses?.[0] || '', 20) }}
            </q-item-label>
          </q-item-section>
          <q-item-section side>
            <div class="row flex q-gutter-x-sm">
              <q-icon
                v-if="localWallet.wallet.bch.xPubKey === selectedWallet?.wallet?.bch?.xPubKey"
                name="check"
                color="primary"
                size="sm"
              />
            </div>
          </q-item-section>
        </q-item>
        <q-separator></q-separator>
        </q-list>

      </q-card-section>
      <q-card-actions align="right">
        <q-btn
          :label="$t('Cancel')"
          no-caps
          @click="onDialogCancel"
          color="primary"
          flat
        />
        <q-btn
          :label="$t('Ok')"
          no-caps
          @click="onOkClick"
          color="primary"
          :disable="!selectedWallet"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>
<script setup>
import { useStore } from 'vuex'
import { ref, onMounted, computed } from 'vue'
import { useDialogPluginComponent } from 'quasar'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
// import { useStore } from 'vuex'
import { useMultisigHelpers } from 'src/composables/multisig/helpers'
import { shortenString } from 'src/lib/multisig'

defineProps({
  signerName: String,
  signerIndex: Number
})

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()
const { localWallets } = useMultisigHelpers()
const selectedWallet = ref()
const $store = useStore()

const darkMode = computed(() => {
  return $store.getters['darkmode/getStatus']
})

const onSelect = (localWallet) => {
  selectedWallet.value = localWallet
}
const onOkClick = () => {
  onDialogOK(selectedWallet.value)
}
onMounted(() => {
  console.log(localWallets)
})
</script>

<style scoped>
/* unset default style for active item */
.q-item.q-router-link--active, .q-item--active {
 color: inherit
}
</style>

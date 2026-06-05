<template>
  <q-dialog ref="dialogRef" full-width maximized position="bottom">
    <q-card class="q-dialog-plugin q-pb-xs pt-card text-bow bottom-card" :class="getDarkModeClass(darkMode)">
      <div class="text-grad text-center q-my-sm text-h6">{{$t('Select Wallet From This Device')}}</div>
      <q-card-section>
        <q-list separator>
        <q-item>
          <q-item-section>
            <q-item-label class="text-justify text-overline">
              Use one of your wallets on this device for signing transactions as {{ signerName || `Signer ${signerIndex + 1}` }}.
            </q-item-label>
          </q-item-section>
        </q-item>
        <q-item
          v-for="(localWallet, i) in localWallets"
            :key="i"
            clickable
            @click="() => onSelect(localWallet)"
            :active="localWallet.xpub === selectedWallet?.xpub"
            :focused="localWallet.xpub === selectedWallet?.xpub"
          >
          <q-item-section>
            <q-item-label>{{ localWallet.name || 'Unnamed Wallet' }}</q-item-label>
            <q-item-label caption lines="2">
              {{ shortenString(localWallet.xpub, 20) }}
            </q-item-label>
          </q-item-section>
          <q-item-section side>
            <div class="row flex q-gutter-x-sm">
              <q-icon
                v-if="localWallet.xpub === selectedWallet?.xpub"
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
      <q-card-actions align="right" class="q-pa-lg q-gutter-x-md">
        <q-btn
          :label="$t('Cancel')"
          no-caps
          @click="onDialogCancel"
          color="primary"
          flat
          rounded
        />
        <q-btn
          :label="$t('Ok')"
          no-caps
          @click="onOkClick"
          color="primary"
          rounded
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
import { useMultisigHelpers } from 'src/composables/multisig/helpers'
import { shortenString } from 'src/lib/multisig'

defineProps({
  signerName: String,
  signerIndex: Number
})

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()
const { getWalletsFromVault } = useMultisigHelpers()
const selectedWallet = ref()
const $store = useStore()

const localWallets = ref()
const darkMode = computed(() => {
  return $store.getters['darkmode/getStatus']
})

const onSelect = (localWallet) => {
  selectedWallet.value = localWallet
}
const onOkClick = () => {
  onDialogOK(selectedWallet.value)
}

onMounted(async () => {
  localWallets.value = await getWalletsFromVault()
  console.log(localWallets.value)
})
</script>

<style scoped>
/* unset default style for active item */
.q-item.q-router-link--active, .q-item--active {
 color: inherit
}
</style>

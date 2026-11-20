<template>
  <q-dialog ref="dialogRef" persistent @hide="onDialogHide">
    <q-card class="br-15 pt-card text-bow bex-connect-card" :class="getDarkModeClass(darkMode)">
      <div class="row no-wrap items-center q-pl-md q-pr-sm q-pt-sm">
        <div class="text-h6 q-space">{{ $t('Connect to Paytaca') }}</div>
        <q-btn flat round dense icon="close" @click="onDialogCancel" />
      </div>

      <q-item>
        <q-item-section v-if="icon" avatar>
          <q-avatar rounded size="48px">
            <img :src="icon" alt="">
          </q-avatar>
        </q-item-section>
        <q-item-section>
          <q-item-label class="text-bold ellipsis-2-lines">{{ metadata?.name || origin }}</q-item-label>
          <q-item-label caption class="text-bow bex-break" :class="getDarkModeClass(darkMode)">{{ origin }}</q-item-label>
          <q-item-label v-if="metadata?.description" caption class="ellipsis-3-lines">{{ metadata.description }}</q-item-label>
        </q-item-section>
      </q-item>

      <q-card-section v-if="warning" class="q-py-sm">
        <q-banner dense rounded class="bg-warning text-black">{{ warning }}</q-banner>
      </q-card-section>

      <q-card-section class="q-py-sm">
        <div class="text-subtitle2">{{ $t('BexSelectAddress', {}, 'Select the address to share with this site') }}</div>
        <q-list dense>
          <q-item v-for="option in addresses" :key="option.index" tag="label" v-ripple class="q-px-none">
            <q-item-section side>
              <q-radio v-model="selectedIndex" :val="option.index" />
            </q-item-section>
            <q-item-section>
              <q-item-label class="text-caption bex-break">#{{ option.index }} {{ option.address }}</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </q-card-section>

      <q-card-section class="q-py-sm text-caption">
        <div>{{ $t('Network', {}, 'Network') }}: {{ network === 'chipnet' ? 'Chipnet' : 'Mainnet' }}</div>
        <div class="q-mt-xs">
          {{ $t('BexConnectNotice', {}, 'This site will see this address and can ask you to sign messages and transactions. Each signature needs your approval.') }}
        </div>
        <div class="q-mt-xs text-weight-medium">{{ $t('OnlyConnect') }}</div>
      </q-card-section>

      <q-card-actions class="row justify-around q-pa-md">
        <q-btn outline rounded no-caps color="grey" :label="$t('Cancel')" class="col-5" @click="onDialogCancel" />
        <q-btn
          rounded
          no-caps
          color="primary"
          :label="$t('Connect')"
          class="col-5"
          :disable="selectedIndex === undefined"
          @click="onDialogOK({ index: selectedIndex })"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useDialogPluginComponent } from 'quasar'
import { useStore } from 'vuex'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

const props = defineProps({
  origin: { type: String, required: true },
  metadata: { type: Object, default: () => ({}) },
  network: { type: String, default: 'mainnet' },
  addresses: { type: Array, default: () => [] },
  warning: { type: String, default: '' }
})

defineEmits([...useDialogPluginComponent.emits])

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()
const $store = useStore()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])
const icon = computed(() => props.metadata?.icons?.[0])
const selectedIndex = ref(props.addresses[0]?.index)
</script>

<style scoped>
.bex-connect-card {
  width: 380px;
  max-width: 95vw;
}
.bex-break {
  word-break: break-all;
}
</style>

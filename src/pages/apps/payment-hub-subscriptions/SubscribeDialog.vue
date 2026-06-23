<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" persistent>
    <q-card class="br-15 pt-card-2 text-bow" :class="getDarkModeClass(darkMode)" style="width: 400px; max-width: 90vw;">
      <q-form ref="formRef" @submit="onOKClick">
        <q-card-section>
          <div class="text-h6">{{ $t('SubscribeToPlan') || 'Subscribe to Plan' }}</div>
          <div class="text-caption text-grey">Enter a Plan ID to create a new subscription.</div>
        </q-card-section>

        <q-card-section class="q-pt-none q-gutter-y-md">
          <q-input
            v-model="form.plan"
            :label="($t('PlanID') || 'Plan ID') + ' *'"
            outlined
            dense
            autofocus
            lazy-rules
            :rules="[val => !!val || $t('Required')]"
            hide-bottom-space
          />
          <!-- <q-input
            v-model="form.merchant_address"
            :label="$t('MerchantAddress') || 'Merchant Address (Public Mode)'"
            outlined
            dense
            hide-bottom-space
          />
          <q-input
            v-model="form.funder_address"
            :label="$t('FunderAddress') || 'Funder Address'"
            outlined
            dense
            hide-bottom-space
          /> -->
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat :label="$t('Cancel')" color="grey" @click="onCancelClick" />
          <q-btn unelevated rounded :label="$t('Subscribe') || 'Subscribe'" color="pt-primary1" type="submit" />
        </q-card-actions>
      </q-form>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'
import { useDialogPluginComponent, useQuasar } from 'quasar'
import { useStore } from 'vuex'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { authToken } from 'src/wallet/payment-hub'
import { cachedLoadWallet } from 'src/wallet'

defineEmits([
  ...useDialogPluginComponent.emits
])

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()
const $store = useStore()
const $q = useQuasar()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])
const formRef = ref(null)

const form = reactive({
  plan: '',
  // merchant_address: '',
  // funder_address: ''
})

async function onOKClick() {
  const isValid = await formRef.value.validate()
  if (!isValid) return

  $q.loading.show({ message: 'Authenticating...' })
  try {
    const walletIndex = $store.getters['global/getWalletIndex']
    const wallet = await cachedLoadWallet('BCH', walletIndex)
    const token = await authToken.get(wallet)

    const payload = { 
      plan: form.plan,
      oauth: token
    }

    onDialogOK(payload)
  } catch (error) {
    console.error('Failed to get auth token:', error)
    $q.notify({ type: 'negative', message: 'Authentication failed' })
  } finally {
    $q.loading.hide()
  }
}

function onCancelClick() {
  onDialogCancel()
}
</script>

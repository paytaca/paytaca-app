<template>
  <q-form @submit="addLiquidity" class="q-gutter-y-md">
    <q-banner v-if="errors.length > 0" dense rounded class="text-white bg-red q-my-sm">
      <ul class="q-pl-md">
        <li v-for="(error, index) in errors" :key="index">
          {{ error }}
        </li>
      </ul>
    </q-banner>
    <q-input
      :dark="darkMode"
      outlined
      dense
      label="Allowance"
      suffix="BCH"
      :disable="loading"
      inputmode="numeric"
      v-model="addLiquidityForm.approvedAmount"
      :rules="[
        val => val >= 0 || 'Invalid amount',
      ]"
    />
    <DurationField
      :dark="darkMode"
      outlined
      dense
      label="Min Duration"
      v-model="addLiquidityForm.minAutoAcceptDuration"
      :rules="[
        val => val >= 0 || 'Invalid duration',
      ]"
    />
    <DurationField
      :dark="darkMode"
      outlined
      dense
      label="Max Duration"
      v-model="addLiquidityForm.maxAutoAcceptDuration"
      :rules="[
        val => val >= 0 || 'Invalid duration',
      ]"
    />
    <div class="q-gutter-y-md">
      <div v-if="loading" class="text-center">
        {{ loadingMsg }}
      </div>
      <q-btn
        no-caps
        :loading="loading"
        :disable="loading"
        :label="longAccount?.wallet_hash ? 'Update' : 'Add'"
        type="submit"
        color="brandblue"
        class="full-width"
      />
      <q-btn
        no-caps
        outline
        :loading="loading"
        :disable="loading"
        label="Cancel"
        color="grey"
        class="full-width"
        @click="$emit('cancel')"
      />
    </div>
  </q-form>
</template>
<script setup>
import { anyhedgeBackend } from '../../wallet/anyhedge/backend'
import { ref, computed, onMounted } from 'vue'
import { useStore } from 'vuex'
import DurationField from './DurationField.vue';

// misc
const $store = useStore()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])

const $emit = defineEmits(['cancel', 'new-long-account', 'update-long-account'])

const props = defineProps({
  wallet: Object,
  longAccount: {
    type: Object,
    required: false,
  }
})


const addLiquidityForm = ref({
  approvedAmount: 0,
  minAutoAcceptDuration: 0,
  maxAutoAcceptDuration: 0,
})

onMounted(() => syncLongAccountToFormData())
function syncLongAccountToFormData() {
  if (props?.longAccount?.auto_accept_allowance)
    addLiquidityForm.value.approvedAmount = props.longAccount.auto_accept_allowance / 10 ** 8

  if (props?.longAccount?.min_auto_accept_duration)
    addLiquidityForm.value.minAutoAcceptDuration = props.longAccount.min_auto_accept_duration

  if (props?.longAccount?.max_auto_accept_duration)
    addLiquidityForm.value.maxAutoAcceptDuration = props.longAccount.max_auto_accept_duration
}

const errors = ref([])
const loading = ref(false)
const loadingMsg = ref('')
async function addLiquidity() {
  if (!props?.longAccount?.address) {
    createNewLongAccount()
  } else {
    updateLongAccount()
  }
}

async function updateLongAccount() {
  const data = {
    min_auto_accept_duration: addLiquidityForm.value.minAutoAcceptDuration,
    max_auto_accept_duration: addLiquidityForm.value.maxAutoAcceptDuration,
    auto_accept_allowance: addLiquidityForm.value.approvedAmount * 10 ** 8,
  }

  try {
    loading.value = true
    loading.loadingMsg = 'Updating long account preferences'
    anyhedgeBackend.patch(`anyhedge/long-accounts/${props.longAccount.wallet_hash}/`, data)
      .then(response => {
        if (!response?.data?.wallet_hash) {
          throw new Error('Expected wallet_hash')
        } else {
          $emit('update-long-account', response.data)
          errors.value = []
          return response.data
        }
      })

  } catch(error) {
    console.error(error)
    errors.value = ['Error encountered in updating long account']
    return
  } finally {
    loading.value = false
    loadingMsg.value = ''
  }
}

async function createNewLongAccount() {
  const response = await getAddressSetForNewLongAccount()
  if (!response?.addressSet?.receiving || !response?.addressSet?.pubkey || !response?.addressIndex) return

  const data = {
    wallet_hash: props.wallet.BCH.getWalletHash(),
    address_path: `0/${response.addressIndex}`,
    address: response.addressSet.receiving,
    pubkey: response.addressSet.pubkey,
    min_auto_accept_duration: addLiquidityForm.value.minAutoAcceptDuration,
    max_auto_accept_duration: addLiquidityForm.value.maxAutoAcceptDuration,
    auto_accept_allowance: addLiquidityForm.value.approvedAmount * 10 ** 8,
  }

  loading.value = true
  loadingMsg.value = 'Saving long account'
  try {
    const response = await anyhedgeBackend.post('anyhedge/long-accounts/', data)
    if (!response?.data?.address || !response?.data?.pubkey ) {
      throw new Error('Expected address and pubkey')
    } else {
      $emit('new-long-account', response.data)
      errors.value = []
      return response.data
    }
  } catch(error) {
    console.error(error)
    errors.value = ['Error encountered in registering long accounts']
    return
  } finally {
    loading.value = false
    loadingMsg.value = ''
  }
}

async function getAddressSetForNewLongAccount() {
  const addressIndex = 100
  try{
    loading.value = true
    loadingMsg.value = 'Generating address set'
    const addressSet = await props.wallet.BCH.getNewAddressSet(addressIndex)
    const pubkey = await props.wallet.BCH.getPublicKey(`0/${addressIndex}`)
    addressSet.pubkey = pubkey
    if (!addressSet?.receiving || !addressSet?.pubkey) throw new Error('Expected receiving address & pubkey')
    return { addressSet, addressIndex }
    errors.value = []
  }catch(error) {
    console.error(error)
    errors.value = ['Error generating addresses']
    return
  } finally {
    loading.value = false
    loadingMsg.value = ''
  }
}
</script>

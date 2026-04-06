<template>
  <q-dialog :model-value="true" position="bottom" persistent seamless>
    <q-card class="pt-card text-bow bottom-card" :class="getDarkModeClass(darkMode)">
      <div class="row items-center q-pa-md header">
        <div class="text-h5 q-space">
          Sign Request
          <q-spinner v-if="signing" />
        </div>
        <q-badge
          v-if="pendingCount > 1"
          color="primary"
          :label="`+${pendingCount - 1} more`"
          class="q-ml-sm"
        />
      </div>

      <q-card-section class="q-pt-none transaction-details">
        <!-- dApp info -->
        <q-item dense class="q-mb-md">
          <q-item-section v-if="connection?.dappIcon" avatar>
            <img :src="connection.dappIcon" width="50" alt="" />
          </q-item-section>
          <q-item-section>
            <q-item-label>{{ connection?.dappName || 'dApp' }}</q-item-label>
          </q-item-section>
        </q-item>

        <!-- User prompt -->
        <q-banner
          v-if="request?.userPrompt"
          class="rounded-borders pt-card-2 text-bow q-mb-md"
          :class="getDarkModeClass(darkMode)"
        >
          {{ request.userPrompt }}
        </q-banner>

        <!-- Transaction details -->
        <TransactionDetailsPanel
          v-if="parsedTransaction"
          :transaction="parsedTransaction"
          :address-display-formatter="formatAddress"
          address-display-format="cashaddr"
          class="q-ma-sm"
        />
      </q-card-section>

      <q-card-actions class="row justify-around q-pa-md action-buttons">
        <q-btn
          outline
          color="negative"
          no-caps
          label="Reject"
          class="col-5 col-sm-3"
          :disable="signing"
          @click="emitReject"
        />
        <q-btn
          color="primary"
          label="Approve"
          rounded
          class="col-5 col-sm-3"
          no-caps
          :loading="signing"
          @click="emitApprove"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useStore } from 'vuex'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import TransactionDetailsPanel from 'src/components/walletconnect/TransactionDetailsPanel.vue'
import { parseExtendedJson } from 'src/wallet/walletconnect2/tx-sign-utils'
import { decodeTransaction, hexToBin, binToHex } from 'bitauth-libauth-v3'

const props = defineProps({
  request: { type: Object, required: true },
  connection: { type: Object, default: null },
  pendingCount: { type: Number, default: 1 }
})

const emit = defineEmits(['approve', 'reject'])

const store = useStore()
const signing = ref(false)

const darkMode = computed(() => store.getters['darkmode/getStatus'])

function formatAddress (address) {
  return address || ''
}

const parsedTransaction = computed(() => {
  try {
    const txRequest = JSON.parse(props.request.transactionJson)
    const txHex = txRequest.transaction?.transaction
    if (!txHex) return null

    const decoded = decodeTransaction(hexToBin(txHex))
    if (typeof decoded === 'string') return null

    let sourceOutputs = txRequest.transaction?.sourceOutputs
    if (typeof sourceOutputs === 'string') {
      sourceOutputs = parseExtendedJson(sourceOutputs)
    }

    // Attach sourceOutput data to inputs for display
    const inputs = decoded.inputs.map((input, i) => {
      const so = sourceOutputs?.[i]
      return {
        outpointTransactionHash: input.outpointTransactionHash,
        outpointIndex: input.outpointIndex,
        sourceOutput: so ? {
          valueSatoshis: so.valueSatoshis,
          lockingBytecode: so.lockingBytecode,
          token: so.token
        } : undefined
      }
    })

    return {
      inputs,
      outputs: decoded.outputs
    }
  } catch {
    return null
  }
})

function emitApprove () {
  signing.value = true
  emit('approve', {
    connectionId: props.request.connectionId,
    sequence: props.request.sequence,
    transactionJson: props.request.transactionJson
  })
  // signing state will be cleaned up when the request is removed from pending
  setTimeout(() => { signing.value = false }, 5000)
}

function emitReject () {
  emit('reject', {
    connectionId: props.request.connectionId,
    sequence: props.request.sequence
  })
}
</script>

<style scoped>
.bottom-card {
  width: 100%;
  max-width: 500px;
  padding-bottom: calc(1.5rem + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
}

.bottom-card > * {
  width: 100%;
}

.bottom-card .header, .bottom-card .action-buttons {
  flex: 0 0 auto;      /* take only their natural height */
}

.bottom-card .action-buttons {
  margin-top: 2rem;
}

.bottom-card .transaction-details {
  flex: 1 1 auto;      /* take remaining space */
  overflow-y: auto;    /* ONLY this scrolls */
  min-height: 0;       /* IMPORTANT: allows shrinking */
}

@media (max-height: 700px) {
  .bottom-card {
    padding-bottom: calc(0.75 + env(safe-area-inset-bottom));
  }

  .bottom-card .action-buttons {
    margin-top: 0rem;
  }
}
</style>

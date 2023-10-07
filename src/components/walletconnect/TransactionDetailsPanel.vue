<template>
  <div>
    <div class="text-subtitle1">Inputs</div>
    <div v-for="(input, index) in parsedTx.inputs" :key="index" class="q-mb-md">
      <div class="row items-start">
        <div>#{{ index }}</div>
        <q-space/>
        <div v-if="input?.value !== undefined">
          {{ input?.value }} sats
          <span v-if="formatUnits(input?.value, 8)">
            ({{ formatUnits(input?.value, 8) }} BCH)
          </span>
        </div>
      </div>
      <div class="row items-start">
        <div>TX output</div>
        <q-space/>
        <q-btn no-caps flat padding="none" @click="copyToClipboard(input?.txid)">
          {{ ellipsisText(input?.txid) }}:{{ input?.index }}
          <q-icon name="content_copy" size="1em" class="q-ml-xs"/>
        </q-btn>
      </div>
      <div v-if="input?.address" class="row items-start">
        <div>Address:</div>
        <q-space/>
        <q-btn no-caps flat padding="none" @click="copyToClipboard(input?.address)">
          {{ ellipsisText(input?.address) }}
          <q-icon name="content_copy" size="1em" class="q-ml-xs"/>
        </q-btn>
      </div>
      <div v-else-if="input?.lockingBytecode" class="row items-start">
        <div>Bytecode:</div>
        <q-space/>
        <q-btn no-caps flat padding="none" @click="copyToClipboard(input?.lockingBytecode)">
          {{ ellipsisText(input?.lockingBytecode) }}
          <q-icon name="content_copy" size="1em" class="q-ml-xs"/>
        </q-btn>
      </div>

      <div v-if="input?.token">
        <div>Token:</div>
        <div class="q-pl-sm">
          <div class="row items-start">
            <div>Category:</div>
            <q-space/>
            <q-btn no-caps flat padding="none" @click="copyToClipboard(input?.token?.category)">
              {{ ellipsisText(input?.token?.category) }}
              <q-icon name="content_copy" size="1em" class="q-ml-xs"/>
            </q-btn>
          </div>
          <div v-if="input?.token?.amount" class="row items-start">
            <div>Amount:</div>
            <q-space/>
            <div>{{ input?.token?.amount }}</div>
          </div>
          <div v-if="input?.token?.nft" class="row items-start">
            <div>NFT ({{ input?.token?.nft?.capability }}):</div>
            <q-space/>
            <q-btn no-caps flat padding="none" @click="copyToClipboard(input?.token?.nft?.commitment)">
              {{ ellipsisText(input?.token?.nft?.commitment) }}
              <q-icon name="content_copy" size="1em" class="q-ml-xs"/>
            </q-btn>
          </div>
        </div>
      </div>
    </div>
    <q-separator spaced/>
    <div>Outputs</div>
    <div v-for="(output, index) in parsedTx.outputs" :key="index" class="q-mb-md">
      <div class="row items-start">
        <div>#{{ index }}</div>
        <q-space/>
        <div>
          {{ output?.value }} sats
          <span v-if="formatUnits(output?.value, 8)">
            ({{ formatUnits(output?.value, 8) }} BCH)
          </span>
        </div>
      </div>

      <div v-if="output?.opData" class="row items-start">
        <div>Data:</div>
        <q-space/>
        <q-btn no-caps flat padding="none" @click="copyToClipboard(output?.opData)">
          <span class="text-right" style="word-break:break-all;">
            {{ output?.opData }}
            <q-icon name="content_copy" size="1em" class="q-ml-xs"/>
          </span>
        </q-btn>
      </div>
      <div v-if="output?.address" class="row items-start">
        <div>Address:</div>
        <q-space/>
        <q-btn no-caps flat padding="none" @click="copyToClipboard(output?.address)">
          {{ ellipsisText(output?.address) }}
          <q-icon name="content_copy" size="1em" class="q-ml-xs"/>
        </q-btn>
      </div>
      <div v-else-if="output?.lockingBytecode" class="row items-start">
        <div>Bytecode:</div>
        <q-space/>
        <q-btn no-caps flat padding="none" @click="copyToClipboard(output?.lockingBytecode)">
          {{ ellipsisText(output?.lockingBytecode) }}
          <q-icon name="content_copy" size="1em" class="q-ml-xs"/>
        </q-btn>
      </div>
      <div v-if="output?.token">
        <div>Token:</div>
        <div class="q-pl-sm">
          <div class="row items-start">
            <div>Category:</div>
            <q-space/>
            <q-btn no-caps flat padding="none" @click="copyToClipboard(output?.token?.category)">
              {{ ellipsisText(output?.token?.category) }}
              <q-icon name="content_copy" size="1em" class="q-ml-xs"/>
            </q-btn>
          </div>
          <div v-if="output?.token?.amount" class="row items-start">
            <div>Amount:</div>
            <q-space/>
            <div>{{ output?.token?.amount }}</div>
          </div>
          <div v-if="output?.token?.nft" class="row items-start">
            <div>NFT ({{ output?.token?.nft?.capability }}):</div>
            <q-space/>
            <q-btn no-caps flat padding="none" @click="copyToClipboard(output?.token?.nft?.commitment)">
              {{ ellipsisText(output?.token?.nft?.commitment) }}
              <q-icon name="content_copy" size="1em" class="q-ml-xs"/>
            </q-btn>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup>
import { binToHex, isArbitraryDataOutput } from "@bitauth/libauth"
import { ellipsisText, formatUnits } from "src/wallet/anyhedge/formatters"
import { useQuasar } from "quasar"
import { computed, inject } from "vue"

const props = defineProps({
  transaction: Object,
})


const $copyText = inject('$copyText')
const $q = useQuasar()

const parsedTx = computed(() => {
  return {
    ...props.transaction,
    inputs: props.transaction?.inputs?.map(input => {
      const data = parseUtxo(input?.sourceOutput)
      if (!data.txid) data.txid = binToHexSafe(input?.outpointTransactionHash)
      if (!data.index) data.index = binToHexSafe(input?.outpointIndex)
      return data
    }),
    outputs: props.transaction?.outputs?.map?.(parseUtxo),
  }
})

function parseUtxo(output) {
  
  return {
    txid: binToHexSafe(output?.outpointTransactionHash),
    index: output?.outpointIndex,
    value: toBigIntSafe(output?.valueSatoshis),
    address: output?.address,
    lockingBytecode: binToHexSafe(output?.lockingBytecode),
    opData: isArbitraryDataOutput(output?.lockingBytecode) ? binToHexSafe(output?.lockingBytecode) : undefined,
    token: !output?.token ? undefined : {
      category: binToHexSafe(output?.token?.category),
      amount: toBigIntSafe(output?.token?.amount),
      nft: !output?.token?.nft ? undefined: {
        capability: output?.token?.nft?.capability,
        commitment: binToHexSafe(output?.token?.nft?.commitment),
      }
    }
  }
}

function toBigIntSafe(value) {
  try {
    return BigInt(value)
  } catch {}
}

function binToHexSafe(value) {
  try {
    return binToHex(value)
  } catch {
    return ''
  }
}

function copyToClipboard(value, message) {
  $copyText(value)
  $q.notify({
    message: message || 'Copied to clipboard',
    timeout: 800,
    color: 'blue-9',
    icon: 'mdi-clipboard-check'
  })
}

</script>

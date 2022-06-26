<template>
  <q-dialog v-model="val" :persistent="persistent">
    <q-card style="max-width:90vw; min-width:300px;" class="br-15 q-pb-xs" :class="{'pt-dark-card': darkMode, 'text-white': darkMode, 'text-black': !darkMode }">
      <q-card-section class="row no-wrap items-center q-pb-xs">
        <div>
          <div class="text-subtitle1 text-grad text-weight-medium">Call Request</div>
          <div v-if="parsedCallRequest.payload.id" class="text-caption" :class="darkMode ? 'text-grey-5' : 'text-grey-7'">
            #{{ parsedCallRequest.payload.id }}
          </div>
        </div>
        <q-space/>
        <q-btn
          icon="close"
          :disable="persistent"
          flat
          round
          dense
          v-close-popup
          :color="darkMode ? 'grey' : ''"
        />
      </q-card-section>

      <q-separator inset class="q-my-sm" />

      <q-card-section
        v-if="hasDecoded"
        class="row justify-end items-center q-py-xs"
        style="margin-bottom: -10px"
      >
        <q-btn-toggle
          v-model="showDecoded"
          toggle-color="brandblue"
          dense
          rounded
          padding="xs md"
          no-caps
          :options="[
            {label: 'Raw', value: false},
            {label: 'Decoded', value: true},
          ]"
        />
      </q-card-section>
      <q-card-section
        v-if="parsedCallRequest.payload.method === 'eth_sign' && showDecoded"
        class="call-request-body"
      >
        <div class="text-subtitle2 q-mb-xs">Sign Message</div>
        <div class="q-gutter-y-sm params-section">
          <div>
            <div class="text-caption" :class="darkMode ? 'text-grey' : 'text-grey-8'">Account:</div>
            <div class="break-word">{{ parsedCallRequest.payload.params[0] }}</div>
          </div>
          <div>
            <div class="text-caption" :class="darkMode ? 'text-grey' : 'text-grey-8'">Message:</div>
            <div class="break-word">{{ decodeHex(parsedCallRequest.payload.params[1]) }}</div>
          </div>
        </div>
      </q-card-section>
      <q-card-section
        v-else-if="parsedCallRequest.payload.method === 'personal_sign' && showDecoded"
        class="call-request-body"
      >
        <div class="text-subtitle2 q-mb-xs">Sign Message</div>
        <div class="q-gutter-y-sm params-section">
          <div>
            <div class="text-caption" :class="darkMode ? 'text-grey' : 'text-grey-8'">Account:</div>
            <div class="break-word">{{ parsedCallRequest.payload.params[1] }}</div>
          </div>
          <div>
            <div class="text-caption" :class="darkMode ? 'text-grey' : 'text-grey-8'">Message:</div>
            <div class="break-word">{{ decodeHex(parsedCallRequest.payload.params[0]) }}</div>
          </div>
        </div>
      </q-card-section>
      <q-card-section
        v-else-if="parsedCallRequest.payload.method === 'eth_signTransaction' || parsedCallRequest.payload.method === 'eth_sendTransaction' && showDecoded"
        class="call-request-body q-mt-md"
      >
        <div class="text-subtitle2 q-mb-md">
          <template v-if="parsedCallRequest.payload.method === 'eth_signTransaction'">
            Sign Transaction
          </template>
          <template v-else-if="parsedCallRequest.payload.method === 'eth_sendTransaction'">
            Send Transaction
          </template>
        </div>
        <div class="q-gutter-y-sm params-section q-px-md q-pb-md br-15" :class="darkMode ? 'pt-dark-card-2' : 'bg-grey-4'">
          <div>
            <div class="text-caption" :class="darkMode ? 'text-grey' : 'text-grey-8'">From:</div>
            <div class="break-word">{{ parsedCallRequest.payload.params[0].from }}</div>
          </div>
          <div>
            <div class="text-caption" :class="darkMode ? 'text-grey' : 'text-grey-8'">To:</div>
            <div class="break-word">{{ parsedCallRequest.payload.params[0].to }}</div>
          </div>
          <div v-if="parsedCallRequest.payload.params[0].gasPrice">
            <div class="text-caption" :class="darkMode ? 'text-grey' : 'text-grey-8'">Gas Price:</div>
            <div class="break-word">{{ hexToNumber(parsedCallRequest.payload.params[0].gasPrice) }}</div>
          </div>
          <div v-if="parsedCallRequest.payload.params[0].gas">
            <div class="text-caption" :class="darkMode ? 'text-grey' : 'text-grey-8'">Gas:</div>
            <div class="break-word">{{ hexToNumber(parsedCallRequest.payload.params[0].gas) }}</div>
          </div>
          <div v-if="parsedCallRequest.payload.params[0].value">
            <div class="text-caption" :class="darkMode ? 'text-grey' : 'text-grey-8'">Value:</div>
            <div class="break-word">{{ hexToNumber(parsedCallRequest.payload.params[0].value) }}</div>
          </div>
          <div v-if="parsedCallRequest.payload.params[0].data">
            <div class="text-caption" :class="darkMode ? 'text-grey' : 'text-grey-8'">Data:</div>
            <div class="break-word">{{ parsedCallRequest.payload.params[0].data }}</div>
          </div>
        </div>
      </q-card-section>
      <q-card-section v-else class="call-request-body q-mt-sm">
        <div class="text-subtitle2">
          {{ parsedCallRequest.payload.method }}
        </div>
        <q-list
          v-if="Array.isArray(parsedCallRequest.payload.params)"
          class="params-section"
          separator
        >
          <q-item
            v-for="(param, index) in parsedCallRequest.payload.params"
            :key="index"
            style="word-break:break-all"
            class="q-px-xs q-mt-sm"
          >
            <q-item-section class="q-mt-xs">
              <q-item-label>#{{ index }}</q-item-label>
              <JSONRenderer :value="param" :darkMode="darkMode" />
            </q-item-section>
          </q-item>
        </q-list>
      </q-card-section>
      <q-card-actions>
        <q-btn
          no-caps
          :loading="loading"
          :disable="loading"
          padding="xs md"
          color="grey"
          flat
          rounded
          label="Reject"
          @click="$emit('reject', parsedCallRequest)"
        />
        <q-space/>
        <q-btn
          no-caps
          rounded
          :loading="loading"
          :disable="loading"
          padding="xs md"
          color="brandblue"
          label="Accept"
          @click="$emit('accept', parsedCallRequest)"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>
<script>
import JSONRenderer from 'components/JSONRenderer.vue'
import { BigNumber } from 'ethers'

export default {
  name: 'WalletConnectCallRequestDialog',
  components: { JSONRenderer },
  props: {
    value: {
      type: Boolean,
      default: false
    },
    persistent: {
      type: Boolean,
      default: false
    },
    loading: {
      type: Boolean,
      default: false
    },
    callRequest: {
      type: Object,
      default: () => {
        return {
          timestamp: null,
          payload: { id: null, jsonrpc: '2.0', method: '', params: [] }
        }
      }
    },
    darkMode: Boolean
  },
  data () {
    return {
      val: this.value,
      showDecoded: true
    }
  },
  computed: {
    hasDecoded () {
      if (!this.parsedCallRequest.payload.method) return false

      return ['eth_sign', 'personal_sign', 'eth_signTransaction', 'eth_sendTransaction']
        .indexOf(this.parsedCallRequest.payload.method) >= 0
    },
    parsedCallRequest () {
      const data = {
        timestamp: null,
        payload: { id: null, jsonrpc: '2.0', method: '', params: [] }
      }

      if (this.callRequest && this.callRequest.payload) {
        data.payload.id = this.callRequest.payload.id || null
        data.payload.jsonrpc = this.callRequest.payload.jsonrpc || ''
        data.payload.method = this.callRequest.payload.method || ''

        if (Array.isArray(this.callRequest.payload.params)) {
          data.payload.params = this.callRequest.payload.params || []
        }
      }

      return data
    }
  },
  methods: {
    decodeHex (value) {
      if (!/(0x)?[0-9a-f]*/i.test(value)) return ''
      return Buffer.from(value.replace('0x', ''), 'hex').toString('utf8')
    },
    hexToNumber (value) {
      if (!/(0x)?[0-9a-f]*/i.test(value)) return null

      return BigNumber.from(value).toBigInt()
    }
  },
  watch: {
    value () {
      this.val = this.value
    },
    val () {
      this.$emit('input', this.val)
    },
    'parsedCallRequest.payload.id': {
      handler () {
        this.showDecoded = this.hasDecoded
      }
    }
  }

}
</script>
<style scoped lang="scss">
.break-word {
  word-break: break-all;
}
.params-section {
  max-height: 40vh;
  overflow-y: auto;
}
.call-request-body {
  padding-top: 0.5rem;
}
</style>

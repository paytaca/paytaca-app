<template>
  <q-btn
    flat
    round
    dense
    icon="tune"
    :aria-label="$t('TransactionDisplaySettings', {}, 'Transaction display settings')"
    @click.stop
  >
    <q-menu anchor="bottom right" self="top right" :offset="[0, 8]">
      <q-list style="min-width: 220px">
        <q-item clickable dense @click.stop="relativeTxTimestamp = !relativeTxTimestamp">
          <q-item-section>
            <q-item-label>{{ $t('RelativeTimestamp', {}, 'Relative timestamp') }}</q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-checkbox v-model="relativeTxTimestamp" dense @click.stop />
          </q-item-section>
        </q-item>
      </q-list>
    </q-menu>
  </q-btn>
</template>

<script setup>
import { computed } from 'vue'
import { useStore } from 'vuex'
import { useI18n } from 'vue-i18n'

const $store = useStore()
const $t = useI18n().t

const relativeTxTimestamp = computed({
  get: () => Boolean($store.getters['global/relativeTxTimestamp']),
  set: (value) => {
    $store.commit('global/saveWalletSetting', {
      key: 'relativeTxTimestamp',
      value: Boolean(value)
    })
  }
})
</script>


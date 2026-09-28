<template>
  <q-item class="elite-row">
    <q-item-section avatar>
      <div class="elite-row-icon">
        <q-icon :name="EliteAssetIcons[item.asset]" />
      </div>
    </q-item-section>

    <q-item-section>
      <q-item-label class="elite-row-title">
        <span class="row elite-row-type">
          {{ getEliteAssetLabel(item.asset) }}
        </span>
        <span class="row elite-row-tx" @click="redirect">
          Ref. ID {{ item.ref_id }}
          <q-icon name="open_in_new" size="14px" />
        </span>
      </q-item-label>
    </q-item-section>

    <q-item-section side>
      <div class="elite-row-amt">
        <template v-if="item.asset === EliteAsset.BCH">
          +{{ parseFiatCurrencyWrapper(item.top_up_amount) }}
        </template>
        <template v-else>
          +{{ parseLiftToken(item.top_up_amount, true) }}
        </template>
      </div>
    </q-item-section>

    <div class="elite-row-date text-caption" :class="darkMode ? 'text-grey-5' : 'text-grey-7'">
      {{ formatDateLocaleRelative(item.created_at, false) }}
    </div>
  </q-item>
</template>

<script>
import { formatDateLocaleRelative } from 'src/utils/time'
import { parseFiatCurrencyWrapper } from 'src/utils/denomination-utils'
import { LIFT_TOKEN_DECIMALS } from 'src/utils/subscription-utils'
import { parseLiftToken } from 'src/utils/engagementhub-utils/shared'
import {
  EliteAsset,
  EliteAssetIcons,
  getEliteAssetLabel
} from 'src/utils/engagementhub-utils/rewards'

export default {
  name: 'EliteTopupRow',

  props: {
    item: {
      type: Object,
      required: true
    }
  },

  data () {
    return {
      LIFT_TOKEN_DECIMALS,
      EliteAsset,
      EliteAssetIcons
    }
  },

  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    }
  },

  methods: {
    formatDateLocaleRelative,
    parseLiftToken,
    parseFiatCurrencyWrapper,
    getEliteAssetLabel,

    redirect () {
      this.$router.push({
        name: 'transaction-detail',
        params: { txid: this.item.tx_id },
        query: { from: 'app-rewards-elite-history' }
      })
    }
  }
}
</script>

<style lang="scss" scoped>
@import 'src/css/rewards/elite-row-styles.scss';
</style>
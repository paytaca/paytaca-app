<template>
  <div class="text-center q-px-lg" :style="`margin-top: 50px;`">
    <q-icon name="wifi_off" size="100px" color="primary"/>
    <div :class="darkMode ? '' : 'text-grey-8'" style="font-size: large;">{{ $t('CashinNetworkError1') }}... ☹</div>
    <div class="q-pt-sm" :class="darkMode ? 'text-grey-5' : 'text-grey-6'" style="font-size: medium;">{{ $t('CashinNetworkError2') }}</div>
    <div class="q-mt-lg" v-if="loading">
      <q-spinner
        color="primary"
        size="50px"
      />
    </div>
    <q-btn
      v-else
      round
      unelevated
      ripple
      dense
      size="30px"
      icon="refresh"
      class="button button-text-primary"
      :class="getDarkModeClass(darkMode)"
      @click="retry"
      >
    </q-btn>
  </div>
</template>
<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

export default {
  data () {
    return {
      loading: false
    }
  },
  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    }
  },
  emits: ['retry'],
  methods: {
    getDarkModeClass,
    retry () {
      this.$emit('retry')
    }
  }
}
</script>

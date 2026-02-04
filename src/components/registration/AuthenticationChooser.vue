<template>
  <div class="text-bow" :class="[getDarkModeClass(darkMode), importSeedPhrase ? 'q-px-lg' : '']">
    <h5 class="q-ma-none text-bow" :class="getDarkModeClass(darkMode)">
      {{ $t('ChooseBackupPhase') }}
    </h5>
    <p style="margin-top: 10px;">
      {{ $t('ChooseBackupPhaseDescription') }}
    </p>

    <template v-if="importSeedPhrase">
      <p>{{ $t('ImportShardsDescription') }}</p>
      <p>{{ $t('ImportSeedPhraseDescription') }}</p>
    </template>
    <template v-else>
      <p>{{ $t('CreateShardsDescription') }}</p>
      <p>{{ $t('CreateSeedPhraseDescription') }}</p>
    </template>
  </div>

  <div class="row q-px-lg q-pt-sm">
    <q-btn
      rounded
      :label="$t('ProceedWithShards')"
      class="full-width button"
      @click="$emit('change-authentication-phase', true)"
    />
    <div class="col-12 text-center q-py-sm">
      <p
        style="font-size: 14px"
        class="q-my-none q-py-none text-uppercase text-weight-bold button button-text-primary"
        :class="getDarkModeClass(darkMode)"
      >
        {{ $t('or') }}
      </p>
    </div>
    <q-btn
      rounded
      :label="$t('ProceedWithSeedPhrase')"
      class="full-width button"
      @click="$emit('change-authentication-phase', false)"
    />
  </div>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

export default {
  name: 'AuthenticationChooser',

  props: {
    importSeedPhrase: Boolean
  },

  emits: [
    'change-authentication-phase'
  ],

  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    }
  },

  methods: {
    getDarkModeClass
  }
}
</script>

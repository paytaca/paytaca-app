<template>
  <div class="text-bow" :class="[getDarkModeClass(darkMode), importSeedPhrase ? 'q-px-lg' : '']">
    <h5 class="q-ma-none text-bow" :class="getDarkModeClass(darkMode)">
      Choose Authentication Phase
    </h5>
    <p class="dim-text" style="margin-top: 10px;">
      Choose the authentication method you want to use to proceed to the next phase.
    </p>

    <template v-if="importSeedPhrase">
      <p class="dim-text">If you have QR code images of the shards, proceed with using the Shard Authentication Phase.</p>
      <p class="dim-text">Else, proceed with using the Seed Phrase Authentication Phase.</p>
    </template>
    <template v-else>
      <p class="dim-text">
        The Shard Authentication Phase is recommended for beginners, which is a simple but very secure method.
        The method works by encrypting the seed phrase and splitting it into 3 shards. One is stored securely
        by us, and the other two are for you to store and share. You can still view the seed phrase later in
        you wallet info.
      </p>
      <p class="dim-text">
        If you are an advanced user or just want to use the old authentication phase, you may opt to proceed
        with using the Seed Phrase Authentication Phase.
      </p>
    </template>
  </div>

  <div class="row q-px-lg q-pt-sm">
    <q-btn
      rounded
      label="Proceed with Using Shards"
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
      label="Proceed with Using Seed Phrase"
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

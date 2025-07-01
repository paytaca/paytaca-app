<template>
  <template v-if="!showAdvanceMethods">
    <h5 class="q-ma-none text-bow" :class="getDarkModeClass(darkMode)">{{ $t('MnemonicBackupPhrase') }}</h5>
    <p v-if="importSeedPhrase" class="dim-text" style="margin-top: 10px;">
      {{ $t('MnemonicBackupPhraseDescription1') }}
    </p>
    <p v-else class="dim-text" style="margin-top: 10px;">
      {{ $t('MnemonicBackupPhraseDescription2') }}
    </p>

    <div class="row" id="mnemonic">
      <template v-if="isFinalStep">
        <div v-if="mnemonicVerified || !showMnemonicTest" class="col q-mb-sm text-caption">
          <SeedPhraseContainer :mnemonic="mnemonic" />
        </div>
        <div v-else>
          <div>
            <q-btn
              flat
              no-caps
              padding="xs sm"
              icon="arrow_back"
              color="black"
              class="button button-text-primary"
              :class="getDarkModeClass(darkMode)"
              :label="$t('MnemonicBackupPhrase')"
              @click="showMnemonicTest = false"
            />
          </div>
          <MnemonicTest
            :mnemonic="mnemonic"
            @matched="$emit('mnemonic-verified', true)"
            class="q-mb-md"
          />
        </div>
      </template>
    </div>

    <div class="row q=mt-md" v-if="isFinalStep">
     
      <q-btn id="continue-verify-phrase-button"
        v-if="mnemonicVerified"
        rounded
        class="full-width button"
        :label="$t('Continue')"
        @click="$emit('open-settings', true)"
      />

      <template v-else>
        <template v-if="$q.platform.is.mobile">
          <q-btn 
            id="mnem-continue-btn1"
            v-if="showMnemonicTest"
            no-caps
            rounded
            class="full-width bg-blue-9 q-mt-md"
            @click="$emit('confirm-skip-verification')"
          >
            {{ $t('SkipVerification') }}
          </q-btn>
        
          <q-btn 
            id="mnem-continue-btn2"
            v-else
            rounded
            class="full-width bg-blue-9 text-white"
            :label="$t('Continue')"
            @click="showMnemonicTest = true"
          />
        
        </template>

        <template v-else>
          
          <q-btn 
            id="mnem-continue-btn3"
            rounded
            class="full-width bg-blue-9 text-white"
            :label="$t('Continue')"
            @click="showMnemonicTest = true"
          />
        </template>
      </template>
    </div>

    <div
      v-if="!showMnemonicTest"
      class="q-mt-lg flex flex-center text-subtitle1"

    >
      <q-btn
        flat
        no-caps
        padding="xs sm"
        class="button button-text-primary"
        :class="getDarkModeClass(darkMode)"
        :label="$t('AdvanceBackupMethods')"
        @click="showAdvanceMethods = true"
      />
    </div>
  </template>

  <template v-else>
    <AuthenticationChooser
      :importSeedPhrase="false"
      @change-authentication-phase="onSelectedAdvanceMethod"
    />
  </template>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

import SeedPhraseContainer from 'src/components/SeedPhraseContainer'
import MnemonicTest from 'src/components/MnemonicTest.vue'
import AuthenticationChooser from 'src/components/registration/AuthenticationChooser'

export default {
  name: 'MnemonicProcessContainer',

  props: {
    importSeedPhrase: Boolean,
    isFinalStep: Boolean,
    mnemonic: {
      type: String,
      default: ''
    },
    mnemonicVerified: Boolean
  },

  emits: [
    'mnemonic-verified',
    'open-settings',
    'confirm-skip-verification',
    'change-authentication-phase'
  ],

  components: {
    SeedPhraseContainer,
    MnemonicTest,
    AuthenticationChooser
  },

  data () {
    return {
      showMnemonicTest: false,
      showAdvanceMethods: false
    }
  },

  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    }
  },

  methods: {
    getDarkModeClass,
    onSelectedAdvanceMethod (value) {
      const vm = this

      if (!value) { // seed phrase
        vm.showAdvanceMethods = false
      } else { // shard
        vm.$emit('change-authentication-phase', true)
      }
    }
  }
}
</script>

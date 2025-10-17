<template>
  <div class="row q-mb-md">
    <!-- create wallet / view wallet mnemonic -->
    <template v-if="!isImport">
      <template v-for="(word, index) in mnemonic.split(' ')" :key="`${word}-${index}`">
        <div class="row col-6 items-center" style="font-size: 17px;">
          <div class="col-2 number" :class="getDarkModeClass(darkMode)">
            <pre>{{ index + 1 }}</pre>
          </div>
          <div class="col-10">
            <span class="word" :class="getDarkModeClass(darkMode)">
              {{ word }}
            </span>
          </div>
        </div>
      </template>
    </template>
    <!-- import seed phrase -->
    <template v-else>
      <template v-for="index in 12" :key="index">
        <div class="row col-6 items-center" style="font-size: 17px;">
          <div class="col-2 number">
            <pre>{{ index }}</pre>
          </div>
          <div class="col-10 q-pr-md">
            <q-input
              dense
              class="q-mt-sm bg-grey-3 q-px-md q-py-xs"
              style="border-radius: 10px;"
              v-model="inputArray[index - 1]"
              @update:model-value="onInputEnter(index)"
              :dark="darkMode"
            />
          </div>
        </div>
      </template>
    </template>
  </div>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils';

export default {
  name: 'SeedPhraseContainer',

  props: {
    mnemonic: {
      type: String,
      default: ''
    },
    isImport: {
      type: Boolean,
      default: false
    }
  },

  emits: [
    'on-input-enter'
  ],

  data () {
    return {
      inputArray: Array(12).fill('')
    }
  },

  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    }
  },

  methods: {
    getDarkModeClass,
    onInputEnter (index) {
      this.inputArray[index - 1] = this.cleanUpSeedPhrase(this.inputArray[index - 1])
      this.$emit('on-input-enter', this.inputArray)
    },
    cleanUpSeedPhrase (seedPhrase) {
      return seedPhrase.toLowerCase().trim()
        .replace(/\s{2,}/g, ' ') // Remove extra internal whitespaces
        // eslint-disable-next-line no-control-regex
        .replace(/[^\x00-\x7F]/g, '') // Remove non-ascii characters
        .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '') // Remove punctuations
    }
  }
}
</script>

<style lang="scss" scoped>
  .number {
    &.dark {
      color: #D36EE1;
    }

    &.light {
      color: #940aa6;
    }

    pre {
      margin: 10px 0;
    }
  }
  .word {
    padding: 5px 10px;
    border-radius: 20px;
    
    &.dark {
      background: #AAB2E9;
      color: #000000;
    }

    &.light {
      background: #6c75ad;
      color: #fff;
    }
  }
</style>

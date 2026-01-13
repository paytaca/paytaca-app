<template>
  <div class="seed-phrase-container q-mb-md">
    <!-- create wallet / view wallet mnemonic -->
    <template v-if="!isImport">
      <div class="words-wrapper">
        <span
          v-for="(word, index) in mnemonic.split(' ')"
          :key="`${word}-${index}`"
          class="word-chip"
          :class="[getDarkModeClass(darkMode), { 'word-visible': isWordVisible(index) }]"
          :style="{ animationDelay: `${index * 300}ms` }"
        >
          {{ word }}
        </span>
      </div>
      <!-- Replay Button -->
      <div v-if="showReplayButton" class="replay-button-container">
        <q-btn
          flat
          no-caps
          class="replay-button"
          :class="getDarkModeClass(darkMode)"
          @click="replayAnimation"
        >
          <q-icon name="replay" class="q-mr-sm" />
          <span>{{ $t('ReplaySequenceAnimation', {}, 'Replay Sequence Animation') }}</span>
        </q-btn>
      </div>
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
      inputArray: Array(12).fill(''),
      animationStarted: false,
      showReplayButton: false,
      animationTimeout: null
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
    },
    isWordVisible (index) {
      // Start animation when mnemonic is available and not in import mode
      if (this.isImport || !this.mnemonic) {
        return true // Show immediately for import mode
      }
      // For view mode, show words sequentially
      return this.animationStarted
    },
    replayAnimation () {
      // Reset animation state
      this.animationStarted = false
      this.showReplayButton = false
      
      // Clear any existing timeout
      if (this.animationTimeout) {
        clearTimeout(this.animationTimeout)
      }
      
      // Restart animation after a brief delay
      this.$nextTick(() => {
        setTimeout(() => {
          this.animationStarted = true
          this.scheduleReplayButton()
        }, 100)
      })
    },
    scheduleReplayButton () {
      // Calculate when animation completes: last word (index 11) starts at 11 * 300ms = 3300ms, animation takes 800ms
      // Total: 3300ms + 800ms = 4100ms
      const words = this.mnemonic ? this.mnemonic.split(' ') : []
      const lastWordIndex = words.length - 1
      const animationDelay = lastWordIndex * 300 // delay for last word
      const animationDuration = 800 // animation duration
      const totalTime = animationDelay + animationDuration + 200 // add small buffer
      
      // Clear any existing timeout
      if (this.animationTimeout) {
        clearTimeout(this.animationTimeout)
      }
      
      this.animationTimeout = setTimeout(() => {
        this.showReplayButton = true
      }, totalTime)
    }
  },
  
  watch: {
    mnemonic: {
      immediate: true,
      handler (newVal, oldVal) {
        // Reset animation when mnemonic changes
        if (newVal !== oldVal) {
          this.animationStarted = false
        }
        
        if (newVal && !this.isImport) {
          // Start animation after a brief delay to ensure DOM is ready
          this.$nextTick(() => {
            setTimeout(() => {
              this.animationStarted = true
              this.scheduleReplayButton()
            }, 100)
          })
        } else if (!newVal) {
          this.animationStarted = false
          this.showReplayButton = false
          if (this.animationTimeout) {
            clearTimeout(this.animationTimeout)
          }
        }
      }
    }
  },
  
  beforeUnmount () {
    // Clean up timeout when component is destroyed
    if (this.animationTimeout) {
      clearTimeout(this.animationTimeout)
    }
  }
}
</script>

<style lang="scss" scoped>
  .seed-phrase-container {
    .words-wrapper {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      justify-content: center;
      padding: 20px;
      
      .word-chip {
        padding: 10px 16px;
        border-radius: 12px;
        font-size: 16px;
        font-weight: 500;
        letter-spacing: 0.3px;
        transition: all 0.2s ease;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        opacity: 0;
        transform: translateY(10px);
        
        &.word-visible {
          animation: wordAppear 0.8s ease-out forwards;
        }
        
        &.dark {
          background: rgba(170, 178, 233, 0.85);
          color: #000000;
        }

        &.light {
          background: rgba(108, 117, 173, 0.9);
          color: #ffffff;
        }
      }
      
      @keyframes wordAppear {
        from {
          opacity: 0;
          transform: translateY(10px) scale(0.95);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
    }
    
    .replay-button-container {
      display: flex;
      justify-content: center;
      margin-top: 12px;
      padding: 0 20px;
      
      .replay-button {
        padding: 6px 12px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 500;
        transition: all 0.2s ease;
        min-height: auto;
        
        &.dark {
          background: rgba(170, 178, 233, 0.2);
          color: rgba(170, 178, 233, 1);
          
          &:hover {
            background: rgba(170, 178, 233, 0.3);
          }
        }
        
        &.light {
          background: rgba(108, 117, 173, 0.15);
          color: rgba(108, 117, 173, 1);
          
          &:hover {
            background: rgba(108, 117, 173, 0.25);
          }
        }
        
        .q-icon {
          font-size: 14px;
        }
      }
    }
  }

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
</style>

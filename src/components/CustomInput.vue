<template>
  <q-input
    filled
    type="text"
    inputmode="none"
    ref="inputRef"
    v-model="valFormatted"
    @focus="keyboardState = 'show'"
    :label="$t('Amount')"
    :dark="darkMode"
    :rules="inputRules"
  >
    <template v-slot:append>
      <div class="q-pr-sm text-weight-bold" style="font-size: 15px;">
        {{ inputSymbol }}
      </div>
    </template>
  </q-input>

  <custom-keyboard
    :custom-keyboard-state="keyboardState"
    v-on:addKey="setAmount"
    v-on:makeKeyAction="makeKeyAction"
  />
</template>

<script>
import {
  adjustSplicedAmount,
  formatWithLocaleSelective,
  parseKey
} from 'src/utils/custom-keyboard-utils';
import { formatWithLocale, getLocaleSeparators } from 'src/utils/denomination-utils';

import CustomKeyboard from './CustomKeyboard.vue';

export default {
  name: 'CustomInput',

  props: {
    modelValue: { type: [String, Number], default: '' },
    inputSymbol: { type: String, default: '' },

    inputRules: { type: Array, default: new Array(() => {}) },
    asset: { type: Object, default: {} },
    decimalObj: {
      type: { min: Number, max: Number },
      default: { min: 0, max: 2 }
    }
  },

  // can be set optionally if further processing is necessary
  // after triggering either setAmount or makeKeyAction
  emits: [
    'on-amount-click', // after triggering setAmount
    'on-backspace-click', // after triggering makeKeyAction backspace
    'on-delete-click', // after triggering makeKeyAction delete
    'on-check-click', // after triggering makeKeyAction check/ok
    'update:model-value'
  ],

  components: {
    CustomKeyboard
  },

  data () {
    return {
      val: this.modelValue,
      valFormatted: '',
      keyboardState: '',
      keyPressed: ''
    }
  },

  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    }
  },

  mounted () {
    this.valFormatted = formatWithLocale(this.modelValue, this.decimalObj)
  },

  watch: {
    val () {
      this.$emit('update:model-value', this.val)
    },
    modelValue (value) {
      this.val = this.modelValue

      if (this.keyPressed === '.' || this.keyPressed === '0') {
        this.valFormatted = formatWithLocaleSelective(
          this.val, this.valFormatted, this.keyPressed, this.decimalObj
        )
      } else this.valFormatted = formatWithLocale(this.val, this.decimalObj)
      
      if (
        this.keyPressed === 'backspace' && 
        String(value).split('.').length === 2 && 
        String(value).split('.')[1] === ''
      )
        this.valFormatted += getLocaleSeparators().decimal
    }
  },

  methods: {
    setAmount (key) {
      const inputNativeEl = this.$refs.inputRef.nativeEl
      inputNativeEl.focus({ focusVisible: true })

      const caretPosition = inputNativeEl.selectionStart
      const amount = this.val ?? '0'

      const parsedAmount = parseKey(key, amount, caretPosition, this.asset)
      this.keyPressed = String(key)
      this.val = parsedAmount
      this.$emit('on-amount-click', this.val)
    },
    makeKeyAction (key) {
      const inputNativeEl = this.$refs.inputRef.nativeEl
      this.keyPressed = String(key)

      if (key === 'backspace') {
        inputNativeEl.focus({ focusVisible: true });
        let caretPosition = inputNativeEl.selectionStart - 1

        if (caretPosition >= this.val.length)
          caretPosition = this.val.length - 1

        try {
          this.val = adjustSplicedAmount(this.val, caretPosition)
        } catch {
          this.val = ''
        }
        this.$emit('on-backspace-click', this.val)
      } else if (key === 'delete') {
        inputNativeEl.focus({ focusVisible: true });
        this.val = ''
        this.$emit('on-delete-click', this.val)
      } else {
        this.keyboardState = 'dismiss'
        this.$emit('on-check-click', this.val)
      }
    }
  }
}
</script>
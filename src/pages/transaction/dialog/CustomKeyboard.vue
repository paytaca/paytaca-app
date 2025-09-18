<template>
  <div class="pt-custom-keyboard" v-if="keyboard">
    <div class="pt-keyboard-container shadow-2 br-top-15 pt-card" :class="getDarkModeClass(darkMode)">
      <div class="row q-px-sm q-mb-none q-py-sm pt-custom-keyboard-row br-top-15 full-height bg-grad q-pb-lg q-pt-md">
        <div class="col-3 pt-col-key" v-for="(key, index) in 15" :key="index">
          <q-btn
            push
            v-if="[4, 8, 12].includes(key)"
            @click="makeKeyAction(key === 4 ? 'delete' : key === 8 ? 'backspace' : key === 12 ? 'ready to submit' : '')"
            class="pt-key-del"
            style="width: 95%; height: 95%"
            :class="[key === 12 ? 'pt-check-key' : 'pt-remove-key', {'bg-grey-9 text-white': darkMode && key !== 12}]"
            :icon="key === 4 ? 'delete' : key === 8 ? 'backspace' : key === 12 ? 'done' : ''" />
          <q-btn
            push
            class="pt-key-num"
            color="white"
            text-color="dark"
            style="width: 95%; height: 95%; font-weight: 400; line-height: 200%"
            :class="{'pt-bg-dark': darkMode}"
            v-else-if="key !== 13"
            :label="key > 3 ? key > 8 ? key === 13 ? '' : key === 14 ? 0 : key === 15 ? getLocaleSeparators().decimal : (key-2) : (key-1) : key"
            @click="enterKey(key > 3 ? key > 8 ? key === 13 ? '' : key === 14 ? 0 : key === 15 ? '.' : (key-2) : (key-1) : key)" />
        </div>
      </div>
    </div>
  </div>
</template>
<script>
import { getLocaleSeparators } from 'src/utils/denomination-utils'

export default {
  props: {
    customKeyboardState: {},
    modelValue: {
      type: [String, Number],
      default: ''
    }
  },
  data () {
    return {
      val: this.modelValue,
      keyboard: this.customKeyboardState === 'show',
      darkMode: this.$store.getters['darkmode/getStatus']
    }
  },
  computed: {
    parsedValue () {
      return Number(this.val)
    }
  },
  methods: {
    getLocaleSeparators,

    enterKey (num) {
      this.$emit('addKey', num)
      this.updateValueOnKeyEnter(num)
    },
    makeKeyAction (action) {
      this.$emit('makeKeyAction', action)
      this.updateValueOnAction(action)
    },
    updateValueOnKeyEnter (num) {
      let val = isNaN(Number(this.val)) ? '' : String(this.val)
      const hasPeriod = val.indexOf('.') >= 0

      if (num === '.' && hasPeriod) return
      if (num === '.' && val === '') val = '0'
      if (/[0]+/.test(val) && !hasPeriod && Number(num) === 0) return

      val += num

      // Set the new val
      this.val = val
    },
    updateValueOnAction (action) {
      if (action === 'backspace') {
        // Backspace
        if (this.val && typeof this.val === 'string') this.val = this.val.slice(0, -1)
      } else if (action === 'delete') {
        // Delete
        this.val = ''
      }
    },
    getDarkModeClass (darkModeClass = '', lightModeClass = '') {
      return this.darkMode ? `dark ${darkModeClass}` : `light ${lightModeClass}`
    }
  },
  watch: {
    val () {
      this.$emit('update:modelValue', this.val)
    },
    modelValue () {
      this.val = this.modelValue
    },
    customKeyboardState () {
      if (this.customKeyboardState === 'show') {
        this.keyboard = true
      } else {
        this.keyboard = false
      }
    }
  }
}
</script>

<style scoped>
.pt-custom-keyboard {
  position: fixed !important;
  display: flex;
  justify-content: center;
  width: 100%;
  bottom: 0pt !important;
  z-index: 1;
}
.pt-keyboard-container {
  height: 250px;
  background: #fff;
}
.br-top-15 {
  border-top-left-radius: 15px;
  border-top-right-radius: 15px;
}
.pt-custom-keyboard-row {
  width: 100%;
  color: #515151;
}
.pt-key-num {
  height: 45px;
  font-size: 16px;
  font-weight: bolder;
}
.pt-key-del {
  height: 45px;
  font-weight: bolder;
  background: #fff;
}
.pt-check-key {
  color: #fff;
  background-color: #3b7bf6;
}
.pt-remove-key {
  background: #D7DBDE;
}
.pt-col-key {
  padding: 2px;
}
.pt-bg-dark {
  color: #fff !important;
  background: #273746 !important;
}
</style>

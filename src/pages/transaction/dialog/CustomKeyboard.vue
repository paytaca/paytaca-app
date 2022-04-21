<template>
  <div class="pt-custom-keyboard" v-if="keyboard">
    <div class="pt-keyboard-container shadow-2" :class="{'pt-dark-card-2': $q.dark.mode}">
      <div class="row q-px-sm q-mb-none q-py-sm pt-custom-keyboard-row">
        <div class="col-3 pt-col-key" v-for="(key, index) in 15" :key="index">
          <q-btn
            push
            v-if="[4, 8, 12].includes(key)"
            @click="makeKeyAction(key === 4 ? 'delete' : key === 8 ? 'backspace' : key === 12 ? 'ready to submit' : '')"
            class="full-width pt-key-del"
            :class="[key === 12 ? 'pt-check-key' : 'pt-remove-key', {'pt-bg-dark': $q.dark.mode}]"
            :icon="key === 4 ? 'delete' : key === 8 ? 'backspace' : key === 12 ? 'done' : ''" />
          <q-btn
            push
            class="full-width pt-key-num"
            :class="{'pt-bg-dark-2': $q.dark.mode}"
            v-else-if="key !== 13" :label="key > 3 ? key > 8 ? key === 13 ? '' : key === 14 ? 0 : key === 15 ? '.' : (key-2) : (key-1) : key"
            @click="enterKey(key > 3 ? key > 8 ? key === 13 ? '' : key === 14 ? 0 : key === 15 ? '.' : (key-2) : (key-1) : key)" />
        </div>
      </div>
    </div>
  </div>
</template>
<script>
export default {
  props: {
    customKeyboardState: {},
    value: {
      type: [String, Number],
      default: '',
    },
  },
  data () {
    return {
      val: this.value,
      keyboard: this.customKeyboardState === 'show'
    }
  },
  computed: {
    parsedValue () {
      return Number(this.val)
    }
  },
  methods: {
    enterKey (num) {
      this.$emit('addKey', num)
      this.updateValueOnKeyEnter(num)
    },
    makeKeyAction (action) {
      this.$emit('makeKeyAction', action)
      this.updateValueOnAction(action)
    },
    updateValueOnKeyEnter(num) {
      let val = isNaN(Number(this.val)) ? '' : String(this.val)
      const hasPeriod = val.indexOf('.') >= 0

      if (num === '.' && hasPeriod) return
      if (num === '.' && val === '') val = '0'
      if (/[0]+/.test(val) && !hasPeriod && Number(num) === 0) return

      val += num

      // Set the new val
      this.val = val
    },
    updateValueOnAction(action) {
      if (action === 'backspace') {
        // Backspace
        if (this.val && typeof this.val === 'string') this.val = this.val.slice(0, -1)
      } else if (action === 'delete') {
        // Delete
        this.val = ''
      }
    }
  },
  watch: {
    val () {
      this.$emit('input', this.val)
    },
    value () {
      this.val = this.value
    },
    customKeyboardState () {
      if (this.customKeyboardState === 'show') {
        console.log('Open keyboard')
        this.keyboard = true
      } else {
        console.log('Close keyboard')
        this.keyboard = false
      }
    }
  }
}
</script>

<style>
.pt-custom-keyboard {
  position: fixed !important;
  display: flex;
  justify-content: center;
  width: 100%;
  bottom: 30pt !important;
}
.pt-keyboard-container {
  height: 250px;
  background: #fff;
}
.pt-custom-keyboard-row {
  /* width: 95%; */
  width: 100%;
  /* border-radius: 12px; */
  color: #515151;
  /* background: #ececec; */
}
.pt-key-num {
  height: 45px;
  font-size: 16px;
  font-weight: bolder;
  background: #fff;
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
.pt-bg-dark-2 {
  color: #fff !important;
  background: #5D6D7E !important;
}
</style>

<template>
    <div class="pt-custom-keyboard q-mt-lg" v-if="keyboard">
        <div class="row q-px-sm q-my-md q-py-md pt-custom-keyboard-row">
            <div class="col-3 q-px-xs q-py-xs" v-for="(key, index) in 15" :key="index">
                <q-btn
                    push
                    v-if="[4, 8, 12].includes(key)"
                    @click="removeKey(key)"
                    class="full-width pt-key-amount"
                    :class="[key === 12 ? 'pt-btn-custom-key' : '']"
                    :icon="key === 4 ? 'delete' : key === 8 ? 'backspace' : key === 12 ? 'east' : ''" />
                <q-btn
                    push
                    class="full-width pt-key-amount"
                    v-else-if="key !== 13" :label="key > 3 ? key > 8 ? key === 13 ? '' : key === 14 ? 0 : key === 15 ? '.' : (key-2) : (key-1) : key"
                    @click="enterKey(key > 3 ? key > 8 ? key === 13 ? '' : key === 14 ? 0 : key === 15 ? '.' : (key-2) : (key-1) : key)" />
            </div>
        </div>
    </div>
</template>

<script>
export default {
  data () {
    return {
      keyboard: false
    }
  },
  props: ['customKeyboardState'],
  watch: {
    customKeyboardState () {
      if (this.customKeyboardState === 'show') {
        this.keyboard = true
      } else {
        this.keyboard = false
      }
    }
  },
  methods: {
    enterKey (num) {
      this.$emit('addKey', num)
    },
    removeKey (action) {
      console.log('Action: ', action)
    }
  }
}
</script>

<style>
.pt-custom-keyboard {
    position: absolute;
    width: 100%;
    bottom: 80pt;
    z-index: 1000;
}
.pt-custom-keyboard-row {
    background: #ececec;
}
.pt-key-amount {
    background: #fff;
}
.pt-btn-custom-key {
  color: #fff;
  background-color: #2E73D2;
}
</style>

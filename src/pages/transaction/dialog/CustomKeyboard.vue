<template>
    <div class="pt-custom-keyboard" v-if="keyboard">
      <div class="pt-keyboard-container shadow-2">
        <div class="row q-px-sm q-mb-none q-py-sm pt-custom-keyboard-row">
          <div class="col-3 pt-col-key" v-for="(key, index) in 15" :key="index">
            <q-btn
              push
              v-if="[4, 8, 12].includes(key)"
              @click="makeKeyAction(key === 4 ? 'delete' : key === 8 ? 'backspace' : key === 12 ? 'ready to submit' : '')"
              class="full-width"
              :class="[key === 12 ? 'pt-check-key' : 'pt-del-key']"
              :icon="key === 4 ? 'delete' : key === 8 ? 'backspace' : key === 12 ? 'done' : ''" />
            <q-btn
              push
              class="full-width pt-num-key"
              v-else-if="key !== 13" :label="key > 3 ? key > 8 ? key === 13 ? '' : key === 14 ? 0 : key === 15 ? '.' : (key-2) : (key-1) : key"
              @click="enterKey(key > 3 ? key > 8 ? key === 13 ? '' : key === 14 ? 0 : key === 15 ? '.' : (key-2) : (key-1) : key)" />
          </div>
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
        console.log('Open keyboard')
        this.keyboard = true
      } else {
        console.log('Close keyboard')
        this.keyboard = false
      }
    }
  },
  methods: {
    enterKey (num) {
      this.$emit('addKey', num)
    },
    makeKeyAction (action) {
      this.$emit('makeKeyAction', action)
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
@media (prefers-color-scheme: light) {
  .pt-num-key {
    height: 45px;
    font-size: 16px;
    font-weight: bolder;
    color: #333;
    background: #FFF;
  }
  .pt-del-key {
    height: 45px;
    font-weight: bolder;
    background: #D7DBDE;
  }
}
@media (prefers-color-scheme: dark) {
  .pt-num-key {
    height: 45px;
    font-size: 16px;
    font-weight: bolder;
    color: #FFF;
    background: #D7DBDE;
  }
  .pt-del-key {
    height: 45px;
    font-weight: bolder;
    background: #c6d1db;
  }
}
.pt-check-key {
  color: #fff;
  background-color: #3b7bf6;
}
.pt-col-key {
  padding: 2px;
}
</style>

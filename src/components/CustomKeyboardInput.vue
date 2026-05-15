<template>
  <div style="position: relative;">
    <q-skeleton v-if="fieldProps.wait" type="rect"/>
    <q-field v-else v-model="val" ref="field" v-bind="fieldProps" @keydown="onKeyboardInput">
      <template v-slot:control="ctx">
        {{ ctx.modelValue }}
        <CustomKeyboard
          :modelValue="ctx.modelValue"
          :customKeyboardState="ctx.focused ? 'show': ''"
           @update:modelValue="val => { ctx.emitValue(val); clearTimeout(keyboardTipTimer); showKeyboardTooltip = false }"
           @makeKeyAction="action => { if (action === 'ready to submit') $refs.field.blur(); clearTimeout(keyboardTipTimer); showKeyboardTooltip = false }"
          :style="{
            left:0,
            right:0,
            bottom:'0 !important',
            zIndex: 100,
          }"
        />
      </template>
      <div v-if="showKeyboardTooltip" class="keyboard-tooltip-bubble" :class="darkMode ? 'dark' : 'light'" :key="keyboardTipCounter">
        {{ $t('PleaseUseCustomKeyboard') }}
      </div>
    </q-field>
  </div>
</template>
<script>
import CustomKeyboard from './CustomKeyboard.vue';

export default {
  name: 'CustomKeyboardInput',
  components: { CustomKeyboard },
  props: {
    modelValue: {
      type: [Number, String],
      default: ''
    },
    fieldProps: {
      type: Object,
      default: Object
    }
  },
  data () {
    return {
      val: this.modelValue,
      keyboardTipTimer: null,
      keyboardTipCounter: 0,
      showKeyboardTooltip: false
    }
  },
  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    }
  },
  methods: {
    onKeyboardInput (e) {
      e.preventDefault()
      clearTimeout(this.keyboardTipTimer)
      this.showKeyboardTooltip = true
      this.keyboardTipCounter++
      this.keyboardTipTimer = setTimeout(() => { this.showKeyboardTooltip = false }, 10000)
    },
    clearKeyboardTooltip () {
      clearTimeout(this.keyboardTipTimer)
      this.showKeyboardTooltip = false
    }
  },
  watch: {
    val () {
      this.$emit('update:model-value', this.val)
    },
    modelValue () {
      this.val = this.modelValue
    }
  }
}
</script>

<style scoped>
.keyboard-tooltip-bubble {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  bottom: calc(100% + 10px);
  z-index: 10;
  white-space: nowrap;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.4;
  font-weight: 700;
  pointer-events: none;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  animation: shake 0.4s ease-in-out;

  &::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 7px solid transparent;
  }

  &.dark {
    background: #d32f2f;
    color: #fff;
    &::after { border-top-color: #d32f2f; }
  }

  &.light {
    background: #e53935;
    color: #fff;
    &::after { border-top-color: #e53935; }
  }
}

@keyframes shake {
  0%, 100% { transform: translateX(-50%); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(calc(-50% - 4px)); }
  20%, 40%, 60%, 80% { transform: translateX(calc(-50% + 4px)); }
}
</style>

<template>
  <div style="position: relative;">
    <q-skeleton v-if="fieldProps.wait" type="rect"/>
    <q-field v-else v-model="val" ref="field" v-bind="fieldProps" @keydown="onKeyboardInput">
      <template v-slot:control="ctx">
        {{ ctx.modelValue }}
        <CustomKeyboard
          :modelValue="ctx.modelValue"
          :customKeyboardState="ctx.focused ? 'show': ''"
@update:modelValue="val => { ctx.emitValue(val); this.hideKeyboardTooltip() }"
            @makeKeyAction="action => { if (action === 'ready to submit') $refs.field.blur(); this.hideKeyboardTooltip() }"
          :style="{
            left:0,
            right:0,
            bottom:'0 !important',
            zIndex: 100,
          }"
        />
      </template>
    </q-field>
    <KeyboardTooltip v-if="showTooltip" :dark-mode="darkMode" :key="'tip-' + tipCounter" />
  </div>
</template>
<script>
import CustomKeyboard from './CustomKeyboard.vue';
import KeyboardTooltip from 'src/components/KeyboardTooltip.vue'
import { useKeyboardTooltip } from 'src/composables/useKeyboardTooltip'

export default {
  name: 'CustomKeyboardInput',
  components: { CustomKeyboard, KeyboardTooltip },
  setup() {
    const { showTooltip, tipCounter, showKeyboardTooltip, hideKeyboardTooltip } = useKeyboardTooltip()
    return { showTooltip, tipCounter, showKeyboardTooltip, hideKeyboardTooltip }
  },
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
      this.showKeyboardTooltip()
    },
    clearKeyboardTooltip () {
      this.hideKeyboardTooltip()
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
</style>

<template>
  <div>
    <q-skeleton v-if="fieldProps.wait" type="rect"/>
    <q-field v-else v-model="val" ref="field" v-bind="fieldProps" @keydown="onKeyboardInput">
      <template v-slot:control="ctx">
        {{ ctx.modelValue }}
        <CustomKeyboard
          :modelValue="ctx.modelValue"
          :customKeyboardState="ctx.focused ? 'show': ''"
           @update:modelValue="val => { ctx.emitValue(val); showKeyboardTooltip = false }"
           @makeKeyAction="action => { if (action === 'ready to submit') $refs.field.blur(); showKeyboardTooltip = false }"
          :style="{
            left:0,
            right:0,
            bottom:'0 !important',
            zIndex: 100,
          }"
        />
      </template>
      <div v-if="showKeyboardTooltip" class="text-caption text-negative q-mt-xs">
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
      showKeyboardTooltip: false
    }
  },
  methods: {
    onKeyboardInput (e) {
      e.preventDefault()
      this.showKeyboardTooltip = true
    },
    clearKeyboardTooltip () {
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

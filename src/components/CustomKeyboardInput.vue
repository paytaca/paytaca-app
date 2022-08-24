<template>
  <div>
    <q-skeleton v-if="fieldProps.wait" type="rect"/>
    <q-field v-else v-model="val" ref="field" v-bind="fieldProps">
      <template v-slot:control="ctx">
        {{ ctx.modelValue }}
        <CustomKeyboard
          :value="ctx.modelValue"
          :customKeyboardState="ctx.focused ? 'show': ''"
          @input="ctx.emitValue"
          @makeKeyAction="action => action === 'ready to submit' ? $refs.field.blur(): null"
          :style="{
            left:0,
            right:0,
            bottom:'0 !important',
            zIndex: 100,
          }"
        />
      </template>
    </q-field>
  </div>
</template>
<script>
import CustomKeyboard from 'pages/transaction/dialog/CustomKeyboard.vue'

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
      val: this.modelValue
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

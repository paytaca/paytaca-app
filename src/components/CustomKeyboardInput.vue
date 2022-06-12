<template>
  <div>
    <q-skeleton v-if="fieldProps.wait" type="rect"/>
    <q-field v-else v-model="val" ref="field" v-bind="fieldProps">
      <template v-slot:control="ctx">
        {{ ctx.value }}
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
    value: {
      type: [Number, String],
      default: '',
    },
    fieldProps: {
      type: Object,
      default: Object
    }
  },
  data() {
    return {
      val: this.value
    }
  },
  watch: {
    val() {
      this.$emit('input', this.val)
    },
    value() {
      this.val = this.value
    }
  }
}
</script>

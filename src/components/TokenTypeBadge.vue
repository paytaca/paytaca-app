<template>
  <q-badge :color="color">
    <span :style="labelStyle">{{ tokenType }}</span>
  </q-badge>
</template>

<script>
export default {
  props: {
    assetId: {
      type: String,
      required: true
    }
  },
  computed: {
    labelStyle () {
      if (this.tokenType.length > 4) {
        return 'font-size: 9px'
      }
      return ''
    },
    tokenType () {
      return this.assetId.split('/')[0].toUpperCase()
    },
    color () {
      const type = this.tokenType
      if (type === 'SLP')
        return 'green-5'
      if (type === 'CT')
        return 'green-9'
      return 'blue-5'
    },
  }
}
</script>

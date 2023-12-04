<template>
  <q-dialog
    v-model="openChat" @hide="$emit('close')"
    position="bottom"
    full-width
  >
  <q-card class="br-15" :style="`max-height: ${maxHeight}px;`">
    <div>Hello World</div>
    <!-- <div>Chat Title</div>
    <div>Chat Body</div>
    <div>Input Here + Button</div> -->
  </q-card>
  </q-dialog>
</template>
<script>

export default {
  data () {
    return {
      openChat: this.openDialog,
      maxHeight: this.$q.screen.height * 0.75
    }
  },
  props: {
    openDialog: Boolean
  },
  emits: ['close'],
  async mounted () {
    console.log('Hello World')
  }
}
</script>

<template>
  <q-dialog seamless position="bottom" full-width>
    <q-card style="height: 500px;" class="br-15">
      <q-btn
          flat
          padding="sm"
          icon="close"
          v-close-popup
        />
      Hello World
    </q-card>
  </q-dialog>
</template>
<script>
export default {
  async mounted () {
    console.log('Hello World')
  }
}
</script>

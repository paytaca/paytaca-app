<template>
  <div class="q-pb-md">
    <div>
      <q-btn
        flat
        padding="md"
        icon="arrow_back"
        @click="$emit('back')"
      />
    </div>
  </div>
</template>
<script>
export default {
  // props: {
  //   transactionType: String,
  //   adsState: String
  // },
  emits: ['back'],
  async mounted () {
    const vm = this

    // console.log(vm.transactionType)
    // console.log(vm.adsState)
  }
}
</script>

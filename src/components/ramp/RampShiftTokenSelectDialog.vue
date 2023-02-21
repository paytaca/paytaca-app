<template>
   <q-dialog ref="dialog" full-width>
    <q-card :class="darkMode ? 'pt-dark' : 'text-black'" class="br-15">
      <div class="row no-wrap items-center justify-center q-pl-md">
        <div class="text-subtitle1 q-space q-mt-sm">{{ title }}</div>
        <q-btn
          flat
          padding="sm"
          icon="close"
          v-close-popup
        />
      </div>
      <q-card-section>
        <div class="text-centers">
          Hello World
        </div>
      </q-card-section>
    </q-card>
   </q-dialog>
</template>
<script>

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus']
    }
  },
  props: {
    type: String,
    tokenList: Array,
    title: String
  },
  async mounted () {
    const vm = this

    console.log(vm.tokenList)
  }
}
</script>

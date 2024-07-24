<template>
  <div class="text-center" :class="darkMode ? 'text-blue-6' : 'text-blue-8'" style="font-size: 25px; margin-top: 50px;">
    P2P Exchange
  </div>
  <div>
    <q-input
      class="row justify-center q-pt-sm q-mx-lg q-px-lg"
      rounded
      standout
      dense
      hide-bottom-space
      bottom-slots
      v-model="name"
      placeholder="Enter Nickname...."
    >
    <template v-slot:append>
      <q-btn round dense flat icon="send"/>
    </template>
    </q-input>
  </div>
</template>
<script>

export default {
  data () {
    return {
      name: ''
    }
  },
  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    }
  }
}
</script>

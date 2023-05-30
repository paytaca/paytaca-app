<template>
  <FiatStore/>
  <footerMenu
    v-on:clicked="switchMenu"
  />
</template>
<script>
import footerMenu from './footerMenu.vue'
import FiatStore from './FiatStore.vue'
export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      menu: 'store'
    }
  },
  components: {
    footerMenu,
    FiatStore
  },
  methods: {
    switchMenu (item) {
      console.log(item)
    }
  },
  async mounted () {
    console.log(this.menu)
  }
}
</script>

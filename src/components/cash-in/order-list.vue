<template>
  <div class="q-mx-md">
    <div class="text-center" :class="darkMode ? 'text-blue-6' : 'text-blue-8'" style="font-size: 20px;">
      Cash In Orders
    </div>

    <div class="text-center" v-for="(order, index) in orders" :key="index">
      <!-- {{ order.id }} <span>{{ order.status }}</span> -->
    </div>
  </div>
</template>
<script>

export default {
  data () {
    return {
      orders: [
        { id: 100, status: 'PENDING' },
        { id: 102, status: 'PENDING' }
      ]
    }
  },
  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    }
  }
}
</script>

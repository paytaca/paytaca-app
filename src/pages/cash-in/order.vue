<template>
  <div class="q-mt-lg q-mx-md">
    <div class="text-center" style="font-size: 20px;">
      Order #{{ orderID }}
    </div>
  </div>
</template>
<script>

export default {
  data () {
    return {
      orderID: this.$route.params.id
    }
  },
  mounted () {
    console.log('order id: ', this.$route.params.id)
    //fetch order
  }
}
</script>

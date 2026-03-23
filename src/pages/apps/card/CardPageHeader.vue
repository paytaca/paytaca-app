<template>
  <div class="row items-center q-pa-md">
    <q-btn
      flat
      round
      dense
      icon="arrow_back"
      color="primary"
      @click="goBack"
    />
    <div class="col">
      <h5 class="text-primary text-weight-bold text-center q-ma-none">{{ title }}</h5>
    </div>
    <div class="q-pa-xs" style="width: 32px"></div>
  </div>
</template>

<script>
export default {
  name: 'CardPageHeader',
  props: {
    title: {
      type: String,
      default: 'Card Management'
    }
  },
  methods: {
    goBack() {
      const currentRoute = this.$route?.name
      
      // If on stacked cards page, go to apps dashboard
      if (currentRoute === 'stacked-cards' || this.$route?.path?.includes('/my-cards')) {
        this.$router.push({ name: 'apps-dashboard' })
      }
      // For all other card pages, go back to the previous page (browser-like back)
      else {
        this.$router.back()
      }
    }
  }
}
</script>

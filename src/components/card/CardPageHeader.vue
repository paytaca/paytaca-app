<template>
  <div class="row items-center" :style="headerStyle">
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
  computed: {
    headerStyle () {
      const safeTop = 'max(env(safe-area-inset-top, 0px), var(--q-safe-area-top, 0px), var(--safe-area-inset-top, 0px), var(--pt-android-statusbar, 0px))'
      return {
        background: 'transparent',
        paddingTop: `calc(${safeTop} + 12px)`,
        paddingBottom: '12px',
        paddingLeft: '16px',
        paddingRight: '16px'
      }
    }
  },
  methods: {
    goBack() {
      const currentRoute = this.$route?.name

      // If on cards list page, go to card home page
      if (currentRoute === 'card-list') {
        this.$router.push({ name: 'app-card' })
      }
      // If on card home page, go to apps dashboard
      else if (currentRoute === 'app-card' || this.$route?.path?.includes('/my-cards') || this.$route?.path === '/apps/card') {
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

<template>
  <div
    class="row justify-center fixed-footer rounded-0"
    :class="{'pt-dark-card': darkMode}"
    :style="{'padding-bottom': $q.platform.is.ios ? '80px' : '0'}">
    <div class="col row justify-center footer-container">
        <q-spinner-dots class="q-my-xs" size="md" :color="darkMode? 'white': 'blue'"/>
    </div>
  </div>
</template>

<script>
export default {
  name: 'footer-loading',
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus']
    }
  }
}
</script>

<style lang="scss" scoped>
  .fixed-footer {
    position: fixed;
    height: 70px;
    padding-top: 5px;
    width: 91%;
    bottom: 40px;
    background-color: #fff;
    border-radius: 0 !important;
    box-shadow: 1px -0.5px 2px 1px rgba(99, 103, 103, .1);
    z-index: 5;

    .footer-container {
      margin-top: 1px !important;
    }
  }
</style>

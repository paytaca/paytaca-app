<template>
  <div
    class="row justify-center fixed-footer"
    :class="{'pt-dark-card': darkMode}"
    :style="{width: $q.platform.is.bex ? '375px' : '100%', margin: '0 auto', 'padding-bottom': $q.platform.is.ios ? '80px' : '0'}"
  >
    <div class="col row justify-evenly footer-btn-container q-ml-sm q-mr-sm q-gutter-xs">
      <button class="footer-icon-btn q-mr-xs btn-ellipse" :class="{'text-white': darkMode}" @click="$emit('clicked', 'orders')">
          <q-icon class="default-text-color mb-2" size="30px" name="sym_o_receipt_long"/> <!-- fa-solid fa-vault -->
        <span>Orders</span>
      </button>
      <button class="footer-icon-btn q-mr-xs btn-ellipse" :class="{'text-white': darkMode}" @click="$emit('clicked', 'store')">
          <q-icon class="default-text-color mb-2" size="30px" name="sym_o_storefront"/> <!-- fa-solid fa-vault -->
        <span>Store</span>
      </button>
      <button class="footer-icon-btn q-mr-xs btn-ellipse" :class="{'text-white': darkMode}" @click="$emit('clicked', 'ads')">
          <q-icon class="default-text-color mb-2" size="30px" name="sym_o_sell"/> <!-- fa-solid fa-vault -->
        <span>Ads</span>
      </button>
      <button v-if="$q.platform.is.bex" class="footer-icon-btn q-mr-xs btn-ellipse" @click="expandBex">
        <i class="footer-icon mdi mdi-launch default-text-color"></i>
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'footer-menu',
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus']
    }
  },
  emits: ['clicked'],
  methods: {
    expandBex () {
      this.$q.bex.send('ui.expand')
    }
  }
}
</script>

<style lang="scss" scoped>
  .mb-2 {
    margin-bottom: 2px;
  }
  .fixed-footer {
    position: fixed;
    height: 67px;
    padding-top: 5px;
    width: 100%;
    bottom: 0;
    background-color: #fff;
    border-top-right-radius: 20px;
    border-top-left-radius: 20px;
    box-shadow: 1px -0.5px 2px 1px rgba(99, 103, 103, .1);
    z-index: 6;

    .footer-icon {
      font-size: 30px !important;
      color: rgb(60, 100, 246) !important;
    }
    .footer-icon-btn {
      border-radius: 20px;
      border: none;
      width: 60px;
      height: 50px;
      outline: none;
      background-color: transparent;
      font-size: 12px;
      color: black;
      line-height: 20px;
    }
    .footer-btn-container {
      margin-top: 1px !important;
    }
    .active-switch {
      color: #69CB51;
    }
    .pt-dark-label {
      color: #fff !important;
    }
    .default-text-color {
      color: rgb(60, 100, 246) !important;
    }
  }
</style>

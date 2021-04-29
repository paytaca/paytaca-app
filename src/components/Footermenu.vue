<template>
  <div class="row justify-center fixed-footer">
    <div class="col row justify-evenly footer-btn-container q-ml-sm q-mr-sm q-gutter-xs">
      <button class="footer-icon-btn">
        <router-link :to="{ path: '/' }">
          <i class="footer-icon mdi mdi-home"></i>
        </router-link>
      </button>
      <button class="footer-icon-btn">
        <router-link :to="{ name: 'transaction-send-select-asset' }">
          <i class="footer-icon mdi mdi-send"></i>
        </router-link>
      </button>
      <button class="footer-icon-btn">
        <router-link :to="{ name: 'transaction-receive-select-asset' }">
          <i class="footer-icon mdi mdi-inbox"></i>
        </router-link>
      </button>
      <button class="footer-icon-btn q-mr-xs btn-ellipse">
        <i class="footer-icon mdi mdi-apps"></i>
        <div class="account-options">
          <a
            :class="[
              !isPrivateMode ? 'active-account' : '',
            ]"
            ref="escrow"
            @click="switchAccount('escrow')"
          >
            ESCROW
          </a>
          <a
            :class="[
              isPrivateMode ? 'active-account' : '',
            ]"
            ref="private"
            @click="switchAccount('private')"
          >
            PRIVATE
          </a>
        </div>
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'footer-menu',
  data () {
    return {}
  },

  computed: {
    isPrivateMode: {
      set (val) {
        this.$store.dispatch('global/setPrivateMode', { privateMode: val })
      },
      get () {
        return this.$store.getters['global/isPrivateMode']
      }
    }
  },

  methods: {
    switchAccount (account) {
      const toPrivate = account === 'private'
      toPrivate ? this.$q.dark.set(true) : this.$q.dark.set(false)
      this.isPrivateMode = toPrivate
    }
  }
}
</script>

<style lang="scss">
  .active-account {
    background-color: #EDF1F3;
  }
  .fixed-footer {
    position: fixed;
    height: 60px;
    width: 100%;
    background-color: #fff;
    border-top-right-radius: 20px;
    border-top-left-radius: 20px;
    box-shadow: 1px -0.5px 2px 1px rgba(99, 103, 103, .1);
    bottom: 0pt;
    z-index: 6;
    .footer-icon {
      font-size: 30px !important;
      color: rgb(60, 100, 246) !important;
    }
    .footer-icon-btn {
      border-radius: 20px;
      border: none;
      width: 50px;
      height: 50px;
      outline: none;
      background-color: transparent;
    }
    .footer-btn-container {
      margin-top: 1px !important;
    }
    .active-switch {
      color: #69CB51;
    }
    .account-options {
      position: absolute;
      display: none !important;
      line-height: 40px;
      top: -100px;
      right: 30px;
      width: 80px;
      text-align: center;
      background-color: #fff;
      border-radius: 10px;
      box-shadow: 1px 1px 2px 1px rgba(99, 103, 103, .2);
      border-radius: 10px;
      vertical-align: middle;
      padding: 8px 0px 8px 0px;
      transition: .3s;
      a {
        display: block;
        text-decoration: none;
        width: 100%;
        padding: 4px 0px 4px 0px;
        color: #000;
      }
    }
    .btn-ellipse:focus .account-options {
      display: block !important;
    }
  }
</style>

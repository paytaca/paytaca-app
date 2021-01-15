<template>
    <div>
        <div class="sidebar" :class="{ 'sidebar-mode-slide-right': sidebar_toggler }">
            <div class="sidebar-mode-toggler" @click="toggleSidebar">
                <i class="eva icon-sidebar-toggler" :class="{ 'eva-arrow-ios-forward-outline': !sidebar_toggler, 'eva-arrow-ios-back-outline': sidebar_toggler }"></i>
            </div>
            <div class="row">
                <div class="col q-mt-md">
                    <p class="text-center switch-account">SWITCH ACCOUNT:</p>
                </div>
            </div>
            <div class="row">
                <div class="col q-pl-lg q-pb-sm q-pr-lg">
                    <b><label class="float-left account-label" :class="{ 'active-account': !active_account }">ESCROW</label>
                    <label class="float-right account-label" :class="{ 'active-account': active_account }">PRIVATE</label></b>
                </div>
            </div>
            <label class="switch">
              <input type="checkbox" :checked="active_account" @change="switchAccount">
              <span class="slider round"></span>
            </label>
        </div>
	    <div class="overlay" ref="overlay" @click="toggleSidebar"></div>
    </div>
</template>

<script>

export default {
  name: 'sidebar-mode',
  data () {
    return {
    	sidebar_toggler: false,
        active_account: false,
    }
  },
  methods: {
    toggleSidebar () {
    	this.sidebar_toggler = !this.sidebar_toggler
    	this.sidebar_toggler ? this.$refs['overlay'].style.display = 'block' : this.$refs['overlay'].style.display = 'none'
    	// or
    	// this.sidebar_toggler ? document.querySelector('.overlay').style.display = 'block' : document.querySelector('.overlay').style.display = 'none'
    },
    switchAccount () {
    	this.active_account = !this.active_account
    	this.active_account ? this.$q.dark.set(true) : this.$q.dark.set(false)
        this.active_account ? this.$q.localStorage.set('active-account', true) : this.$q.localStorage.set('active-account', false)
        this.$store.dispatch('global/setPrivateMode', { privateMode: this.active_account })
    },
    created () {
    	this.active_account = this.$q.localStorage.getItem('active-account');
    }
  }
}
</script>

<style lang="scss">
    .switch-account {
    	color: #000;
    }
    .account-label {
        color: #BAC2C2;
    }
    .active-account {
        color: #4C4F4F;
        transition: .3s;
    }
    .sidebar-mode-toggler {
        position: absolute;
        line-height: 46px;
        width: 24px;
        background-color: #fff;
        top: 98px;
        right: -24px;
        border-top-right-radius: 14px;
        border-bottom-right-radius: 14px;
        box-shadow: 2px 1px 2px .5px rgba(99, 103, 103, .1);
        z-index: 3;
    }
    .sidebar {
        position: fixed;
        width: 60%;
        height: 100%;
        background-color: #fff;
        top: 0pt;
        bottom: 0pt;
        left: -60%;
        box-shadow: 2px 1px 2px .5px rgba(99, 103, 103, .1);
        z-index: 2;
        text-align: center;
    	transition: .3s;
    }
    .sidebar-mode-slide-right {
        left: 0% !important;
    }
    .icon-sidebar-toggler {
        font-size: 20px;
        vertical-align: middle;
        line-height: inherit;
        color: #444646;
    }
    .switch {
        position: relative;
        display: inline-block;
        width: 60px;
        height: 34px;
    }
    .switch input {
        opacity: 0;
        width: 0;
        height: 0;
    }
    .slider {
        position: absolute;
        cursor: pointer;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: #3992EA;
        -webkit-transition: .4s;
        transition: .4s;
    }
    .slider:before {
        position: absolute;
        content: "";
        height: 26px;
        width: 26px;
        left: 4px;
        bottom: 4px;
        background-color: white;
        -webkit-transition: .4s;
        transition: .4s;
    }
    input:checked + .slider {
        background-color: #3992EA;
    }
    input:focus + .slider {
        box-shadow: 0 0 1px #2196F3;
    }
    input:checked + .slider:before {
        -webkit-transform: translateX(26px);
        -ms-transform: translateX(26px);
        transform: translateX(26px);
    }
    .slider.round {
        border-radius: 34px;
    }
    .slider.round:before {
        border-radius: 50%;
    }
</style>

<template>
  <div>
    <sidebar-mode-toggler />
    <div class="row">
        <div class="col q-mt-md">
             <p class="text-center receive"><b>RECEIVE</b></p>
        </div>
    </div>
    <div class="row">
        <div class="col qr-code-container">
            <div class="col col-qr-code q-pl-sm q-pr-sm q-pt-md">
              <div class="row text-center">
                <div class="col row justify-center q-pt-md">
                  <qr-code :text="address" color="#253933" :size="220" error-level="H" class="q-mb-sm"></qr-code>
                  <span class="qr-code-text"><b>{{ address }}</b></span>
                </div>
              </div>
              <div class="row">
                <div class="col q-ma-sm q-mb-md">
                  <i class="eva eva-copy-outline icon-copy float-right q-mr-md" @click="copyAddress"></i>
                </div>
              </div>
            </div>
        </div>
    </div>
    <div class="row">
        <div class="currencies">
            <div class="col q-gutter-xs q-ml-lg q-mr-lg q-pa-none q-pl-none text-center btn-transaction">
                <button class="btn-custom q-mt-none active-btn btn-bch" @click="swtichActiveBtn('btn-bch')" id="btn-bch"><b>BCH</b></button>
                <a to="/send"><button class="btn-custom q-mt-none btn-spice" @click="swtichActiveBtn('btn-spice')" id="btn-spice"><b>SPICE</b></button></a>
                <a to="/receive"><button class="btn-custom q-mt-none btn-spice" @click="swtichActiveBtn('btn-peso')" id="btn-peso"><b>PESO</b></button></a>
            </div>
        </div>
    </div>
  </div>
</template>

<script>

export default {
  name: 'Receive-page',
  data () {
    return {
      activeBtn: 'btn-bch',
      address: ''
    }
  },
  methods: {
    swtichActiveBtn (btn) {
      var element = document.getElementById(btn)
      var name = 'active-btn'
      var arr = element.className.split(' ')
      if (arr.indexOf(name) === -1) {
        element.className += ' ' + name
      }
      var customBtn = document.getElementById(this.activeBtn)
      customBtn.classList.remove('active-btn')
      this.activeBtn = btn
    },
    copyAddress () {
      this.$q.notify({
        message: 'Copied address',
        timeout: 800
      })
    },
    // generateQRcode method is for testing only
    generateQRcode (length, chars) {
      var result = '';
      for (var i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
      this.address = result
    }
  },
  created () {
    this.generateQRcode(40, '0123456789abcdefghijklmnopqrstuvwxyz')
    this.$q.localStorage.getItem('active-account') ? this.$q.dark.set(false) : this.$q.dark.set(false)
  }
}
</script>

<style lang="scss">
  .receive {
    color: #636767;
  }
  .qr-code-container {
    margin-top: 66px;
    padding-left: 28px;
    padding-right: 28px;
  }
  /* iPhone 5/SE */
  @media (min-width: 280px) and (max-width: 320px) {
    .qr-code-container {
      margin-top: 30px;
    }
  }
  /* Galaxy Fold */
  @media (min-width: 200px) and (max-width: 280px) {
    .qr-code-container {
      margin-top: 66px;
    }
  }
  .col-qr-code {
    width: 100%;
    background-color: #fff;
    border-radius: 16px;
    box-shadow: 1px 2px 2px 1px rgba(99, 103, 103, .1);
  }
  .receive-add-amount {
    color: #3992EA;
  }
  .qr-code {
    height: 205px;
    width: 205px;
    background-color: #464747;
    margin: auto;
  }
  .qr-code-text {
    font-size: 12px;
    color: #000;
  }
  .currencies {
    position: fixed;
    height: 100px;
    width: 100%;
    bottom: 0pt;
    border-top-left-radius: 22px;
    border-top-right-radius: 22px;
    background-color: #fff;
    padding-top: 28px;
  }
  .btn-bch {
    margin-left: 0px;
  }
  .btn-custom {
    height: 40px;
    width: 32%;
    border-radius: 20px;
    border: none;
    color: #444646;
    background-color: transparent;
    outline:0;
    cursor: pointer;
    transition: .2s;
  }
  .btn-custom:hover {
    background-color: #fff;
  }
  .btn-custom.active-btn {
    background-color: #fff !important;
    color: #3992EA;
  }
  .btn-transaction {
    background-color: rgba(43, 126, 209, .04);
    border-radius: 24px;
    padding: 4px;
    padding-left: 2px;
    padding-right: 2px;
  }
  .receive__to {
    color: #636767;
  }
  .receive-wallet {
    color: #373939;
  }
  .icon-copy {
    color: #3992EA;
    font-size: 26px;
  }
</style>

<template>
  <div>
    <sidebar-mode-toggler />
    <div class="row">
      <div class="col q-mt-md">
        <p class="text-center send"><b>SEND</b></p>
      </div>
    </div>
    <qrcode-stream class="qrcode-scanner" :class="[address != '' ? 'display-none' : '']" @decode="onDecode" @init="onInit" ></qrcode-stream>
    <div class="row justify-center receipient-address" :class="[address == '' ? 'display-none' : '']">
      <div class="row justify-center">
        <div class="col ">
          <h5 class="q-mb-xs text-center recep-address"><b>Address</b></h5>
          <p class="text-center q-ma-none q-pa-none q-mb-lg recep-address"><b>{{ address }}</b></p>
          <q-input input-class="text-right"
            input-style="padding-right: 10px;"
            type="number"
            fill-mask="0"
            reverse-fill-mask
            rounded
            outlined>
          </q-input>
        </div>
      </div>
    </div>
    <div class="row" :class="[address != '' ? 'display-none' : '']">
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
      address: '',
      result: '',
      error: ''
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
    onDecode (result) {
      this.address = result
    },
    async onInit (promise) {
      try {
        await promise
      } catch (error) {
        if (error.name === 'NotAllowedError') {
          this.error = "ERROR: you need to grant camera access permisson"
        } else if (error.name === 'NotFoundError') {
          this.error = "ERROR: no camera on this device"
        } else if (error.name === 'NotSupportedError') {
          this.error = "ERROR: secure context required (HTTPS, localhost)"
        } else if (error.name === 'NotReadableError') {
          this.error = "ERROR: is the camera already in use?"
        } else if (error.name === 'OverconstrainedError') {
          this.error = "ERROR: installed cameras are not suitable"
        } else if (error.name === 'StreamApiNotSupportedError') {
          this.error = "ERROR: Stream API is not supported in this browser"
        }
      }
    }
  },
  created () {
    this.$q.localStorage.getItem('active-account') ? this.$q.dark.set(false) : this.$q.dark.set(false)
  }
}
</script>

<style lang="scss">
  .display-none {
    display: none;
  }
  .send {
    color: #636767;
  }
  .receipient-address {
    margin-top: 80px;
    padding-bottom: 50px;
    background-color: #fff;
  }
  .recep-address {
    color: #000;
  }
  .qr-code-container {
    margin-top: 40px;
    padding-left: 28px;
    padding-right: 28px;
    height: 300px;
  }
  .qrcode-scanner {
    margin-top: 70px;
    height: 220px !important;
    width: 100% !important;
  }
  /* iPhone 5/SE */
  @media (min-width: 280px) and (max-width: 320px) {
    .qr-code-container {
      margin-top: 30px
    }
  }
  /* Galaxy Fold */
  @media (min-width: 200px) and (max-width: 280px) {
    .qr-code-container {
      margin-top: 40px
    }
  }
  .col-qr-code-recevie {
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

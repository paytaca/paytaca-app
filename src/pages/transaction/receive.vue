<template>
  <div>
    <div class="row">
        <div class="col q-mt-md">
             <p class="text-center receive"><b>RECEIVE</b></p>
        </div>
    </div>
    <div class="row">
        <div class="col col-qr-code-container">
            <div class="col col-qr-code q-pl-md q-pr-md q-pt-md text-center">
                <p class="text-center receive-add-amount"><b>Add amount</b></p>
                <div class="col qr-code"></div>
                <span class="qr-code-text">e342qeewrt456323erweb57wv78894r</span>
            </div>
            <div class="row"></div>
        </div>
    </div>
    <div class="row">
        <div class="currencies">
            <div class="col q-gutter-xs q-ml-lg q-mr-lg q-pa-none q-pl-none text-center btn-transaction">
                <button class="btn-custom q-mt-none active-btn btn-all"><b>BCH</b></button>
                <a to="/send"><button class="btn-custom q-mt-none"><b>SPICE</b></button></a>
                <a to="/receive"><button class="btn-custom q-mt-none"><b>PESO</b></button></a>
            </div>
            <div class="row">
                <div class="col q-ml-lg q-mt-md">
                    <p class="receive__to q-mb-sm"><b>Receive to</b></p>
                    <p class="q-mt-none receive-wallet">MY BCH wallet</p>
                </div>
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
    }
  }
}
</script>

<style lang="scss">
  body {
    background-color: #012121;
  }
  .receive {
    color: #E8EFEF;
  }
  .col-qr-code-container {
    margin-top: 70px;
    padding-left: 28px;
    padding-right: 28px;
  }
  .col-qr-code {
    width: 100%;
    height: 300px;
    background-color: #fff;
    border-radius: 16px;
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
  }
  .currencies {
    position: fixed;
    height: 160px;
    width: 100%;
    bottom: 0pt;
    border-top-left-radius: 22px;
    border-top-right-radius: 22px;
    background-color: #fff;
    padding-top: 28px;
  }
  .btn-all {
    margin-left: 0px;
  }
  .btn-custom {
    height: 40px;
    width: 32%;
    border-radius: 20px;
    border: none;
    color: #636767;
    background-color: transparent;
    /*background-color: rgba(43, 126, 209, .04);*/
    outline:0;
    cursor: pointer;
    transition: .2s;
  }
  .btn-custom:hover {
    background-color: #fff;
  }
  .btn-custom.active-btn {
    /*background-color: rgba(206, 38, 38, .8);*/
    background-color: #EEF5FB;
    /*color: #fff;*/;
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
</style>

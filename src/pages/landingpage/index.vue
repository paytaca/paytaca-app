<template>
  <div>

    <div class="row">
      <div class="col q-pt-lg">
        <p class="q-ml-lg text-light p-label">Your balance</p>
      </div>
      <div class="col q-pt-lg">
        <p class="text-right q-mr-lg text-light p-label">08 January 2021</p>
      </div>
    </div>
    <div class="row" style="padding-top: 0px !important;">
      <div class="col q-pa-none">
        <p class="text-number-balance q-ml-lg default-text-color">30.67</p>
      </div>
      <div class="col q-pa-none">
        <!-- <button class="absolute btn-add-cash">+</button> -->
        <div class="col">
        <p class="text-right q-mr-lg currency">₱</p> <!-- add-cash -->
        </div>
      </div>
    </div>
    <div class="row">
        <div class="col">
            <p class="q-ml-lg payment-methods default-text-color">Assets</p>
        </div>
    </div>
    <div class="row no-wrap q-gutter-md q-pl-lg q-pb-sm" style="overflow: scroll;">
        <!-- <button class="btn-add-payment-method q-ml-lg">+</button> -->
        <div class="method-cards q-pa-md">
            <img src="bitcoin-cash-bch-logo.png" width="40">
            <p class="pay-text q-mb-none float-right ib-text">BCH</p>
            <div class="row">
                <p class="col text-num-md"></p>
                <p class="float-right q-mt-sm text-num-lg">000</p>
            </div>
        </div>
        <div class="method-cards q-pa-md">
            <img src="bitcoin-cash-bch-logo.png" width="40">
            <p class="pay-text q-mb-none float-right ib-tex">Spice</p>
            <div class="row">
                <p class="col text-num-md text-right"></p>
                <p class="float-right q-mt-sm text-num-lg">000</p>
            </div>
        </div>
        <div class="method-cards q-pa-md">
            <img src="bitcoin-cash-bch-logo.png" width="40">
            <p class="pay-text q-mb-none float-right ib-tex">Peso</p>
            <div class="row">
                <p class="col text-num-md"></p>
                <p class="float-right q-mt-sm text-num-lg">000</p>
            </div>
        </div>
    </div>
    <div class="row">
        <div class="col transaction-container q-pb-lg">
            <p class="q-ma-lg transaction-text"><b>TRANSACTIONS</b></p>
            <div class="col q-gutter-xs q-ml-lg q-mr-lg q-pa-none q-pl-none text-center btn-transaction">
                <button class="btn-custom q-mt-none active-btn btn-all">All</button>
                <button class="btn-custom q-mt-none">Sent</button>
                <button class="btn-custom q-mt-none">Received</button>
            </div>
            <div class="row">
                <div class="col q-mt-lg q-mr-lg q-ml-lg q-pt-sm q-pb-sm" style="border-bottom: 1px solid #DAE0E7">
                    <p class="q-mb-none transactions-text ib-text"><b>Transaction here</b></p>
                    <p class="q-mb-none transactions-text float-right ib-text">₱ 27</p>
                    <div class="col">
                        <span class="float-left subtext"><b>Subtext here</b></span>
                        <span class="float-right subtext"><b>12 January 2021</b></span>
                    </div>
                </div>
            </div>
            <div class="row">
                <div class="col q-mt-lg q-mr-lg q-ml-lg q-pt-sm q-pb-sm" style="border-bottom: 1px solid #DAE0E7">
                    <p class="q-mb-none transactions-text ib-text"><b>Transaction here</b></p>
                    <p class="q-mb-none transactions-text float-right ib-text">₱ 27</p>
                    <div class="col">
                        <span class="subtext"><b>Subtext here</b></span>
                        <span class="float-right subtext"><b>12 January 2021</b></span>
                    </div>
                </div>
            </div>
            <div class="row">
                <div class="col q-mt-lg q-mr-lg q-ml-lg q-pt-sm q-pb-sm" style="border-bottom: 1px solid #DAE0E7">
                    <p class="q-mb-none transactions-text ib-text"><b>Transaction here</b></p>
                    <p class="q-mb-none transactions-text float-right ib-text">₱ 27</p>
                    <div class="col">
                        <span class="subtext"><b>Subtext here</b></span>
                        <span class="float-right subtext"><b>12 January 2021</b></span>
                    </div>
                </div>
            </div>
        </div>
    </div>
  </div>
</template>

<script>

export default {
  name: 'Landing-page-index',
  data () {
    return {
    }
  }
}
</script>

<style lang="scss">
  body {
    background-color: #ECF3F3;
  }
  .currency {
    font-size: 50px;
    color: rgba(206, 38, 38, .8);
  }
  .p-label {
    margin-bottom: 0px !important;
  }
  .default-text-color {
    color: #3992EA;
  }
  .text-light {
    color: #BAC2C2;
  }
  .text-number-balance {
    font-size: 52px;
  }
  .btn-add-cash {
    border: none;
    background-color: rgba(206, 38, 38, .5);
    color: #fff;
    padding: 10px 14px 10px 14px;
    margin-right: 26px;
    border-radius: 10px;
    margin-top: 14px;
    right: 2px;
  }
  /*.add-cash {
    margin-top: 60px;
    margin-right: 16px;
    color: #6E94F1;
  }*/
  .payment-methods {
    font-size: 20px;
  }
  .btn-add-payment-method {
    border: 1px solid #2B7ED1;
    background-color: transparent;
    color: #2B7ED1;
    padding: 34px 20px 34px 20px;
    border-radius: 16px;
    font-size: 20px;
    height: 110px;
  }
  .method-cards {
    height: 110px;
    min-width: 180px;
    background-color: teal;
    border-radius: 16px;
    background-color: #3992EA;
  }
  .ib-text {
    display: inline-block;
  }
  .pay-text {
    font-size: 24px;
    color: #DBE7E7;
  }
  .text-num-lg {
    font-size: 18px;
    color: #DBE7E7;
  }
  .text-num-md {
    margin-top: 13px;
    font-size: 12px;
    color: #DBE7E7;
  }
  .transaction-container {
    min-height: 350px;
    border-radius: 36px;
    background-color: #fff;
    margin-top: 24px;
  }
  .transaction-text {
    font-size: 20px;
    color: #545858;
  }
  .transactions-text {
    color: #545858;
  }
  .subtext {
    font-size: 11px;
    color: #545858;
    opacity: .5;
  }
  .btn-all {
    margin-left: 0px;
  }
  .btn-custom {
    height: 40px;
    width: 32%;
    border-radius: 20px;
    border: none;
    color: #2B7ED1;
    background-color: transparent;
    /*background-color: rgba(43, 126, 209, .04);*/
    outline:none;
  }
  .btn-custom.active-btn {
    background-color: rgba(206, 38, 38, .8);
    color: #fff;
  }
  .btn-transaction {
    background-color: rgba(43, 126, 209, .04);
    border-radius: 20px;
    padding-left: 0px;
  }
</style>

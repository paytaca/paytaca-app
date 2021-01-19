<template>
  <div v-show="val" class="row justify-center fixed-online-message">

    <div class="row col">
      <span @click="val=false" class="q-mt-sm q-ml-md" style="font-size: 34px; color: rgb(60, 100, 246);"><i class="mdi mdi-close-circle"></i></span>
    </div>

    <div class="row">
      <div class="col row q-mt-md justify-center">
        <h5 class="q-ma-sm"><b>Sent successfully</b></h5>
      </div>
    </div>

    <div class="row">
      <div class="col text-center q-pl-lg q-pr-lg row justify-center">
        <p>This is to confirm that transaction has been successfully made.</p>
      </div>
    </div>

    <div class="row">
      <div class="col q-mt-lg" style="text-align: center; padding: 20px 0px 0px 0px;">
        <img src="~/assets/paytaca_logo.png" height="100">
        <p style="color: #000; font-size: 28px;">Paytaca</p>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'online-popup-message',
  props: {
    value: {
      type: Boolean,
      required: true,
    }
  },
  data () {
    return {
      val: this.value
    }
  },
  watch: {
    value () {
      this.val = this.value
    },
    val () {
      this.$emit('input', this.val)
    }
  }
}
</script>

<style lang="scss">
  .fixed-online-message {
    position: fixed;
    top: 0pt;
    bottom: 0pt;
    width: 100%;
    background-color: #fff;
    display: block;
    z-index: 1000;
  }
</style>

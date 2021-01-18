<template>
  <div class="row justify-center fixed-offline-message" ref="offline-message">

    <div class="row col">
      <router-link :to="{ path: '/'}" class="q-mt-sm q-ml-md" style="font-size: 34px; color: rgb(60, 100, 246);"><i class="mdi mdi-close-circle"></i></router-link>
    </div>

    <div class="row">
      <div class="col q-mb-md">
        <div class="col q-pl-sm q-pr-sm q-pt-md">
          <h5 class="text-center q-ma-sm"><b>Transaction Receipt</b></h5>
          <div class="row">
            <div class="col row justify-center q-pt-md">
              <qr-code text="ahdahdadasdasdasdasdasdasd" color="#253933" :size="200" error-level="H" class="q-mb-sm"></qr-code>
            </div>
          </div>
        </div>
      </div>  
    </div>
    <div class="row">
      <div class="col row justify-center">
        <p><b>QR on receipt</b></p>
      </div>
    </div>
    <div class="row">
      <div class="col row justify-center">
        <p>Your transasction has been saved.</p>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'footer',
  data () {
    return {}
  },
  methods: {
    switchAccount () {
    },
  }
}
</script>

<style lang="scss">
  .fixed-offline-message {
    position: fixed;
    top: 0pt;
    bottom: 0pt;
    width: 100%;
    background-color: #fff;
    display: block;
    z-index: 1000;
  }
</style>

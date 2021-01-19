<template>
  <div class="row justify-center fixed-offline-message" ref="offline-message">

    <div class="row col">
      <router-link :to="{ path: '/'}" class="q-mt-sm q-ml-md" style="font-size: 34px; color: rgb(60, 100, 246);"><i class="mdi mdi-close-circle"></i></router-link>
    </div>

    <div class="row">
      <div class="col q-mb-md">
        <div class="col q-pl-sm q-pr-sm q-pt-md">
          <h5 class="text-center q-ma-sm"><b>Proof of Payment</b></h5>
          <div class="row">
            <div class="col row justify-center q-pt-md">
              <qr-code text="H4sIAKCSBWAC/2OyelrjoHSivUN3MmNVagrH1oTbtxYH+4vOt72v3fLW98v8G9fWL29KSWyc++DollMmnyfe6PO9tZDNMW2+QMH0915OTc4zTHad8srZZ5G15uKlxoMf5qUvKZx8ePLy5gMZ8vlXQm9XSE9SKuecX2Zv7vXQT7nFle3Mgp//t7+V0Zh2bHZ4cPhK2Q7BaD7z8JKy217Ls6p+cOs9+C7SYP4v5ag3/7HLvMcvMQ12BwIAeLR1qEIBAAA=" color="#253933" :size="300" error-level="H" class="q-mb-sm"></qr-code>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="row">
      <div class="col row justify-center">
        <p>Your recipient must scan this proof.</p>
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

<template>
  <div class="row justify-center q-pb-xs text-capitalize text-weight-bold">{{ `${mode} Mode` }}</div>
  <body :class="`theme-${theme}`">
    <div id="app-container" :class="`${mode}`">
      <div :class="`q-mt-md pt-card ${mode}`">
        <p :class="`pt-label ${mode}`">test yy</p>
      </div>
    </div>
  </body>
</template>

<script>
export default {
  name: 'PreviewTemplate',
  props: {
    theme: { type: String },
    mode: { type: String }
  }
}
</script>

<style lang="scss" scoped>
  #app-container {
    height: 150px !important;
    min-height: 150px !important;
    max-height: 150px !important;
    width: 100px;
    border-radius: 15px;
  }
</style>

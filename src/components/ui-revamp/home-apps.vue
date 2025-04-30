<template>
  <div class="apps-container">
    <div class="row justify-between">
      <div class="title-medium">Paytaca Apps</div>
      <div class="text-capitalize body-small text-link">View more</div>
    </div>

    <div></div>
  </div>
</template>
<script>

export default {
  data () {
    return {
      apps: [
        { name: 'hello'}
      ]
    }
  }
}
</script>
<style lang="scss" scoped>
.apps-container {
  margin: 24px 16px 0px;
  .apps-options {
    margin-top: 10px;
  }
}
</style>

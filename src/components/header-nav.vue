<template>
  <div class="header-nav">
    <div class="nav-content row text-light title-large">
      <div class="col-2">
        <q-btn icon="arrow_back_ios" style="padding-left: 5px;" size="sm" class="button-border" @click="$router.go(-1)"/>
      </div>
      <div class="col-8 text-center">
        App Title
      </div>
      <div class="col-2 text-right">
        <q-btn icon="settings" size="sm" class="button-border" @click="$router.push('/apps/settings')"/>
      </div>
    </div>
  </div>
</template>
<script>
export default {
  props: {
    title: {
      type: String,
      default: ''
    },
    backnavpath: {
      type: String,
      default: ''
    }
  }
}
</script>
<style lang="scss" scoped>
.nav-content {
  margin: 24px 16px 0px
}
.back-button {
  border: 1px solid #fff;
  border-radius: 20%;
  align-items: center;
}
.button-border {
  border: 1px solid #fff;
  border-radius: 20%;
  padding: 0;
  width: 30px;
  height: 30px;
}
</style>

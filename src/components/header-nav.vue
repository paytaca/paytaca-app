<template>
  <div>
    <div class="row">
      <div id="header" class="col q-mt-md q-pl-md text-center q-pr-md">
        <router-link :to="{ path: backnavpath }">
          <i class="material-icons q-mt-sm icon-arrow-left" style="font-size: 35px; float: left; color: #3b7bf6;">arrow_back</i>
        </router-link>
        <div style="width: 300px; margin: auto;">
          <p class="text-center select q-mt-sm section-title" style="font-size: 22px; color: #3B7BF6; text-align: center;">
            {{ title }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'header-nav',
  props: ['title', 'backnavpath']
}
</script>

<style scoped>
#header {
  width: 375px !important;
  margin-top: 0;
  margin-left: auto;
  margin-right: auto;
  padding-top: 10px;
  position: fixed;
  top: 0;
  background: #ECF3F3;
  width: 100%;
  z-index: 100;
}
</style>

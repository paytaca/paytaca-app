<template>
  <div>
    <div class="row">
      <div class="col 12">
        <div class="pt-header" :style="{ 'padding-top': $q.platform.is.ios ? '60px' : '18px', 'height': $q.platform.is.ios ? '95px' : '70px',}" :class="{'pt-dark': $store.getters['darkmode/getStatus']}">
          <router-link :to="backnavpath ? { path: backnavpath } : $route" class="pt-arrow-left-link" :class="{'text-grad': $store.getters['darkmode/getStatus']}" :style="{width: $q.platform.is.bex ? '375px' : '95%'}">
            <span class="material-icons" @click="!backnavpath ? $router.go(-1) : null">
                arrow_back
            </span>
          </router-link>
          <p class="text-h5 text-uppercase text-center q-my-none" :class="{'text-grad': $store.getters['darkmode/getStatus']}">
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
  props: {
    title: {
      type: String,
      default: '',
    },
    backnavpath: {
      type: String,
      default: '',
    }
  },
}
</script>

<style>
.pt-header {
  color: #3B7BF6;
  margin-top: 0;
  margin-left: auto;
  margin-right: auto;
  padding-top: 20px;
  /* position: fixed; */
  position: relative;
  background: #ECF3F3;
  /* width: 100%; */
  z-index: 1000;
}
.pt-arrow-left-link {
  position: absolute;
  font-size: 30px;
  left: 20px;
  color: #3B7BF6;
  text-decoration: none;
  display: flex;
  justify-items: center;
  align-items: center;
}
.pt-settings-icon {
  position: absolute;
  font-size: 28px;
  right: 20px;
  color: #3B7BF6;
  display: flex;
  justify-items: center;
  align-items: center;
}
</style>

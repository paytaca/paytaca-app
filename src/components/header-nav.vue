<template>
  <div>
    <div class="row">
      <div class="col 12">
        <div class="pt-header" :class="{'pt-dark': $q.dark.mode}">
          <router-link :to="{ path: backnavpath }" class="pt-arrow-left-link" :class="{'pt-dark-label': $q.dark.mode}" :style="{width: $q.platform.is.bex ? '375px' : '100%'}">
            <span class="material-icons">
                arrow_back
            </span>
          </router-link>
          <p class="text-h5 text-center q-my-none" :class="{'pt-dark-label': $q.dark.mode}">
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

<style>
.pt-header {
  color: #3B7BF6;
  height: 70px;
  margin-top: 0;
  margin-left: auto;
  margin-right: auto;
  padding-top: 20px;
  position: fixed;
  top: 0;
  background: #ECF3F3;
  width: 100%;
  z-index: 100;
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

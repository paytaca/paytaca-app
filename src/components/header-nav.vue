<template>
  <div>
    <div class="row">
      <div class="col 12">
        <div
          class="pt-header"
          :style="{'padding-top': $q.platform.is.ios ? '60px' : '18px', 'height': $q.platform.is.ios ? '100px' : '70px'}"
          :class="{'pt-card-3': darkMode}"
        >
          <router-link
            :to="{ path: backnavpath }"
            class="pt-arrow-left-link"
            :class="{'text-grad': isNotDefaultTheme || darkMode}"
            :style="{width: $q.platform.is.bex ? '375px' : '94%', 'margin-top': $q.platform.is.ios ? '-5px' : '0'}"
          >
            <span class="material-icons" @click="backnavpath ?  $router.push({ path: backnavpath }): $router.go(-1)">
                arrow_back
            </span>
          </router-link>
          <p
            class="text-h5 text-uppercase text-center q-my-none"
            :class="{'text-grad': isNotDefaultTheme || darkMode}"
            :style="{'margin-top': $q.platform.is.ios ? '-5px' : '0'}"
          >
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
      default: ''
    },
    backnavpath: {
      type: String,
      default: '',
    }
  },
  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    isNotDefaultTheme () {
      return this.$store.getters['global/theme'] !== 'default'
    }
  }
}
</script>

<style lang="scss">
.pt-header {
  color: #3B7BF6;
  margin-top: 0;
  margin-left: auto;
  margin-right: auto;
  padding-top: 20px;
  z-index: 100;
  background: #ecf3f3;
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

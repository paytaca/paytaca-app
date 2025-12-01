<template>
  <div>
    <router-view v-slot="{ Component }">
      <keep-alive :include="['cauldron-pool']">
        <component :is="Component"/>
      </keep-alive>
    </router-view>
  </div>
</template>

<script>

export default {
  name: 'apps-layout',
  data () {
    return {
    }
  }
}
</script>

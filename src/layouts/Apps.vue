<template>
  <div @touchmove.prevent>
    <router-view />
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

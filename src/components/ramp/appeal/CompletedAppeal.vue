<template>
  <q-card class="br-15 q-pt-sm q-mx-md q-mx-none q-my-lg" bordered flat
    :class="[ darkMode ? 'text-white pt-dark-card-2' : 'text-black',]">
    <!-- Status Here -->
    <div>
      Released
    </div>
  </q-card>
</template>
<script>

export default {
  darkMode: this.$store.getters['darkmode/getStatus']
}
</script>
